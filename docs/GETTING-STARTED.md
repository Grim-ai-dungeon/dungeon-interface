# Getting Started with the Dungeon Interface

Welcome, Overlord! 🐉

This guide will help you get your new Dungeon Interface up and running on your Windows PC. It's designed to be simple and straightforward.

## Option A: Download the pre-built app (Recommended)

This is the fastest way to get started. No complex setup required!

1. Go to the project's **GitHub Releases** page or the **Actions** tab in GitHub.
2. Download the latest `.exe` installer.
3. Run the `.exe` file. 
   * *Note: Windows might show a blue "Windows protected your PC" SmartScreen warning. This is perfectly normal for new apps. Just click **"More info"** and then **"Run anyway"**.*
4. The app will open and automatically connect to your local OpenClaw system at `localhost:18789`.

## Option B: Run from source (Developer mode)

If you want to poke around under the hood or run the app directly from the code, follow these steps. 

**Prerequisites:** You will need [Node.js](https://nodejs.org/) (version 18 or higher) and [Git](https://git-scm.com/) installed on your PC.

1. Open a terminal or command prompt.
2. Clone the repository to your computer.
3. Type `npm install` and press Enter to install the required dependencies.
4. Type `npm run dev` and press Enter. This will start the app and open it in your web browser for testing.
   * *Note: The desktop-specific features (like taking screenshots) won't work while running in the browser mode.*

## Configuration

Customizing your Dungeon Interface:

* **Changing the OpenClaw API endpoint:** If your OpenClaw system is running on a different port or machine, you can update the connection address in the app's settings menu.
* **Changing themes:** Head to the settings menu to switch up the look and feel of the dungeon.
* **Settings location:** Your preferences are saved securely on your local PC so they persist between sessions.

## Troubleshooting

Running into issues? Here are a few common fixes:

* **"Can't connect to OpenClaw"** — Double-check that your OpenClaw gateway is actively running in the background and that it's using the correct port (`18789`).
* **"White screen" when opening the app** — Your Windows PC might need an update for WebView2. You can download it directly from Microsoft.
* **"SmartScreen warning"** — As mentioned above, this is completely normal for apps that aren't digitally signed by a large corporation. Click "More info" and "Run anyway".

Enjoy commanding your minions!