import type {
  TabContentResourceMessage,
  ToolMessageRequest,
} from "@browser-control-mcp/common";

function initWsClient(port: number) {
  let socket: WebSocket | null = null;

  function connectWebSocket() {
    console.log("Connecting to WebSocket server");
    
    socket = new WebSocket(`ws://localhost:${port}`);

    socket.addEventListener("open", () => {
      console.log("Connected to WebSocket server at port", port);
    });

    socket.addEventListener("message", (event) => {
      console.log("Message from server:", event.data);

      try {
        const decoded = JSON.parse(event.data);
        handleDecodedMessage(decoded);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      socket && socket.close();
    });
  }

  function handleDecodedMessage(decoded: ToolMessageRequest) {
    switch (decoded.cmd) {
      case "open-tab":
        openUrl(decoded.correlationId, decoded.url);
        break;
      case "close-tabs":
        closeTabs(decoded.tabIds);
        break;
      case "get-tab-list":
        sendTabs(decoded.correlationId);
        break;
      case "get-browser-recent-history":
        sendRecentHistory(decoded.correlationId, decoded.searchQuery);
        break;
      case "get-tab-content":
        sendTabsContent(decoded.correlationId, decoded.tabId);
        break;
      default:
        const _exhaustiveCheck: never = decoded;
        console.error("Invalid message received:", decoded);
    }
  }

  async function openUrl(correlationId: string, url: string) {
    if (!url.startsWith("https://")) {
      console.error("Invalid URL:", url);
    }
    if (!socket || !socket.OPEN) {
      console.error("Socket is not open");
      return;
    }
    const tab = await browser.tabs.create({
      url,
    });

    socket.send(
      JSON.stringify({
        resource: "opened-tab-id",
        correlationId,
        tabId: tab.id,
      })
    );
  }

  function closeTabs(tabIds: number[]) {
    browser.tabs
      .remove(tabIds)
      .then(() => {
        console.log(`Successfully closed ${tabIds.length} tabs`);
      })
      .catch((error) => {
        console.error(`Error closing tabs: ${error}`);
      });
  }

  function sendTabs(correlationId: string) {
    browser.tabs.query({}).then((tabs) => {
      if (!socket || !socket.OPEN) {
        console.error("Socket is not open");
        return;
      }
      socket.send(
        JSON.stringify({
          resource: "tabs",
          correlationId,
          tabs,
        })
      );
    });
  }

  function sendRecentHistory(
    correlationId: string,
    searchQuery: string | null = null
  ) {
    browser.history
      .search({
        text: searchQuery ?? "", // Search for all URLs (empty string matches everything)
        maxResults: 200, // Limit to 200 results
        startTime: 0, // Search from the beginning of time
      })
      .then((historyItems) => {
        if (!socket || !socket.OPEN) {
          console.error("Socket is not open");
          return;
        }
        const filteredHistoryItems = historyItems.filter((item) => {
          return !!item.url;
        });
        socket.send(
          JSON.stringify({
            resource: "history",
            correlationId,
            historyItems: filteredHistoryItems,
          })
        );
      })
      .catch((error) => {
        console.error(`Error fetching history: ${error}`);
      });
  }

  function sendTabsContent(correlationId: string, tabId: number) {
    browser.tabs
      .executeScript(tabId, {
        code: `
      (function () {
        function getLinks() {
          const linkElements = document.querySelectorAll('a[href]');
          return Array.from(linkElements).map(el => ({
            url: el.href,
            text: el.innerText.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || ''
          })).filter(link => link.text !== '' && link.url !== '');
        }

        return {
          links: getLinks(),
          fullText: document.body.innerText
        };
      })();
    `,
      })
      .then((results) => {
        if (!socket || !socket.OPEN) {
          console.error("Socket is not open");
          return;
        }
        const firstFrameResult = results[0];
        const obj: TabContentResourceMessage = {
          resource: "tab-content",
          tabId,
          correlationId,
          fullText: firstFrameResult.fullText,
          links: firstFrameResult.links,
        };
        socket.send(JSON.stringify(obj));
      })
      .catch((error) => {
        console.error(
          "sendTabsContent for tab ID %s - Error executing script:",
          tabId,
          error
        );
      });
  }

  // Connect to WebSocket as soon as the extension loads
  connectWebSocket();

  // Try to connect every 2 seconds if the connection is closed
  setInterval(() => {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
  }, 2000);
}

const PORTS = [8081, 8082];
for (const port of PORTS) {
  initWsClient(port);
}
