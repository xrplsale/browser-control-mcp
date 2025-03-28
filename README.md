# Browser Control MCP

An MCP server paired with a browser extension that enables LLM clients, such as Claude Desktop, to control the user's local browser.

## Features

The MCP server supports the following tools:
- Open or close tabs
- Read tab list
- Read history
- Read webpage text content and links

## Example use-cases:

- *"Close all non-work related tabs in my browser."*
- *"Help me find an article in my browser history about the Milford track in NZ."*
- *"Open hackernews in my browser, then open the top story, read it, also read the comments. Do the comments agree with the story?"*
- *"In my browser, use Google Scholar to search for papers about L-theanine in the last 3 years. Open the 3 most cited works."*

## Installation

Clone this repository, then run the following commands to build both the MCP server and the browser extension.
```
npm install
npm install --prefix mcp-server
npm install --prefix firefox-extension
npm run build
```

### Usage with Claude Desktop:

Add the following configuration to `claude_desktop_config.json` (use the Edit Config button in Claude Desktop Developer settings):
```
{
    "mcpServers": {
        "browser-control": {
            "command": "node",
            "args": [
                "<path to repo>/mcp-server/dist/server.js"
            ]
        }
    }
}
```
Replace `<path to repo>` with the correct path.

Make sure to restart Claude Desktop. 


### Usage with Firefox

The browser-control-mcp extension was developed for Firefox.

To install the extension, simply go to `about:debugging` in Firefox, click on "This Firefox", click on "Load Temporary Add-on...", and select the `manifest.json` file under the `firefox-extension` folder in this project.

If you are already using Firefox, then *it is recommended you download a separate instance of Firefox* (e.g. Firefox Developer's edition - https://www.mozilla.org/en-US/firefox/developer/) and install the browser-control extension on it, not on your personal browser.

While you can install the extension on your personal browser, this will expose your browsing history to the MCP client (e.g. Claude), as well as allow the client to access pages or to invoke requests with your existing browser sessions. 

