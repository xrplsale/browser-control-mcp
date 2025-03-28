import WebSocket from "ws";
import {
  ResourceMessage,
  BrowserTab,
  BrowserHistoryItem,
  ToolMessage,
  TabContentResourceMessage,
  ToolMessageRequest,
} from "@browser-control-mcp/common";
import { isPortInUse } from "./util";
import EphemeralMap from "./ephemeral-map";

// Support up to two initializations of the MCP server by the client
// More initializations will result in EDADDRINUSE errors
const WS_PORTS = [8081, 8082];

export class BrowserAPI {
  private ws: WebSocket | null = null;
  private wsServer: WebSocket.Server | null = null;

  // Local state representing the resources provided by the browser extension
  // These will be updated by an inbound message from the extension
  private openTabs: EphemeralMap<string, BrowserTab[]> = new EphemeralMap();
  private browserHistory: EphemeralMap<string, BrowserHistoryItem[]> =
    new EphemeralMap();
  private tabContent: EphemeralMap<string, TabContentResourceMessage> =
    new EphemeralMap();
  private openedTabId: EphemeralMap<string, number> = new EphemeralMap();

  async init() {
    let selectedPort = null;

    for (const port of WS_PORTS) {
      if (!(await isPortInUse(port))) {
        selectedPort = port;
        break;
      }
    }
    if (!selectedPort) {
      throw new Error("All available ports are in use");
    }

    this.wsServer = new WebSocket.Server({ port: selectedPort });
    this.wsServer.on("connection", async (connection) => {
      this.ws = connection;

      this.ws.on("message", (message) => {
        const decoded = JSON.parse(message.toString());
        this.handleDecodedResourceMessage(decoded);
      });
    });
    this.wsServer.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
    return selectedPort;
  }

  close() {
    this.wsServer?.close();
  }

  getSelectedPort() {
    return this.wsServer?.options.port;
  }

  async openTab(url: string): Promise<number | undefined> {
    const correlationId = this.sendMessageToExtension({
      cmd: "open-tab",
      url,
    });
    await waitForResponse();
    return this.openedTabId.getAndDelete(correlationId);
  }

  async closeTabs(tabIds: number[]) {
    this.sendMessageToExtension({
      cmd: "close-tabs",
      tabIds,
    });
  }

  async getTabList(): Promise<BrowserTab[] | undefined> {
    const correlationId = this.sendMessageToExtension({
      cmd: "get-tab-list",
    });
    await waitForResponse();
    return this.openTabs.getAndDelete(correlationId);
  }

  async getBrowserRecentHistory(
    searchQuery?: string
  ): Promise<BrowserHistoryItem[] | undefined> {
    const correlationId = this.sendMessageToExtension({
      cmd: "get-browser-recent-history",
      searchQuery,
    });
    await waitForResponse();
    return this.browserHistory.getAndDelete(correlationId);
  }

  async getTabContent(
    tabId: number
  ): Promise<TabContentResourceMessage | undefined> {
    const correlationId = this.sendMessageToExtension({
      cmd: "get-tab-content",
      tabId,
    });
    await waitForResponse();
    return this.tabContent.getAndDelete(correlationId);
  }

  private sendMessageToExtension(message: ToolMessage): string {
    const correlationId = Math.random().toString(36).substring(12);
    const req: ToolMessageRequest = { ...message, correlationId };
    if (this.ws && this.ws.OPEN) {
      this.ws.send(JSON.stringify(req));
    }
    return correlationId;
  }

  private handleDecodedResourceMessage(decoded: ResourceMessage) {
    switch (decoded.resource) {
      case "tabs":
        this.openTabs.set(decoded.correlationId, decoded.tabs);
        break;
      case "history":
        this.browserHistory.set(decoded.correlationId, decoded.historyItems);
        break;
      case "opened-tab-id":
        this.openedTabId.set(decoded.correlationId, decoded.tabId);
        break;
      case "tab-content":
        this.tabContent.set(decoded.correlationId, decoded);
        break;
      default:
        const _exhaustiveCheck: never = decoded;
        console.error("Invalid resource message received:", decoded);
    }
  }
}

async function waitForResponse() {
  // Wait for the extension to respond back on the same connection
  const WAIT_TIME_MS = 200;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, WAIT_TIME_MS);
  });
}
