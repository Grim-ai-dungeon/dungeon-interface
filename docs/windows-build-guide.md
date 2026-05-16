# Dungeon Interface - Windows Build Guide

This guide details how to build and distribute the Dungeon Interface (a Tauri application) as a Windows `.exe` for the Overlord.

## 1. Cross-compiling from Linux to Windows

**Can we cross-compile from Ubuntu to Windows?**
While you can cross-compile plain Rust applications from Linux to Windows using tools like `cargo-xwin` or `cross-rs`, **Tauri apps are exceptionally difficult to cross-compile**. This is because Tauri relies on OS-specific webview libraries (WebView2 on Windows) and native C++ SDKs. Attempting to cross-compile the Windows UI bindings from Linux usually results in a broken build and endless dependency headaches.

**The Solution:** Do not cross-compile locally. Instead, use a CI/CD pipeline like **GitHub Actions** with a native Windows runner (`windows-latest`) to build the `.exe`. 

## 2. Easiest Path (No Local Setup Required)

The fastest and least painful way to get a working `.exe` into the Overlord's hands *right now* is to use **GitHub Actions**.

By pushing the code to a GitHub repository and using the official `tauri-apps/tauri-action`, GitHub's servers will build the app on a Windows environment and give you a downloadable `.exe` file automatically.

### GitHub Actions Workflow Example

Create a file at `.github/workflows/build.yml` in your repository:

```yaml
name: Build Windows App
on: [push]

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc
          
      - name: Install frontend dependencies
        run: npm install # or yarn/pnpm
        
      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v1
        with:
          # This builds the app and uploads the bundles as GitHub Actions workflow artifacts
          uploadWorkflowArtifacts: true
          workflowArtifactNamePattern: 'Dungeon-Interface-[platform]-[arch]'
```

Once pushed, go to the "Actions" tab in GitHub. When the run finishes, there will be an "Artifacts" section at the bottom where the Overlord can download the `.exe` directly.

## 3. Local Windows Build Requirements

If the Overlord prefers to build the app locally on his own Windows PC, he will need to install a heavy toolchain. 

**Prerequisites:**
1. **Microsoft Visual Studio C++ Build Tools:**
   - Download the [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
   - During installation, check the box for **"Desktop development with C++"**. Ensure the Windows 10/11 SDK is checked on the right side.
2. **WebView2 Runtime:**
   - Pre-installed on Windows 11. If on an older OS, download it from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
3. **Rust:**
   - Download `rustup-init.exe` from [rustup.rs](https://rustup.rs/) and run it. Follow the default prompts.
4. **Node.js:**
   - Install the latest LTS version of [Node.js](https://nodejs.org/).

**Build Steps:**
1. Open PowerShell or Command Prompt.
2. Clone/download the project.
3. Run `npm install` (or `yarn` / `pnpm install`).
4. Run `npm run tauri build`.
5. The final `.exe` and installer will be located in `src-tauri/target/release/bundle/` (for installers) and `src-tauri/target/release/` (for the raw executable).

## 4. Distribution Options

Once built (either via GitHub Actions or locally), Tauri provides a few ways to distribute the app:

1. **Portable `.exe` (Raw Executable)**
   - Located at `src-tauri/target/release/dungeon-interface.exe`.
   - **Pros:** No installation required. Just double-click and run.
   - **Cons:** Bypasses standard Windows install directories; doesn't create start menu shortcuts automatically.
   
2. **Built-in Installers (.msi or NSIS setup.exe)**
   - Located in `src-tauri/target/release/bundle/msi/` or `nsis/`. Tauri generates these automatically during `npm run tauri build`.
   - **Pros:** Installs cleanly, adds start menu shortcuts, and registers uninstallers. This is the recommended way to distribute.
   
3. **Auto-Updater**
   - Tauri has a built-in auto-updater plugin. You configure an endpoint (or use GitHub Releases as the endpoint). When the app launches, it checks for a new version, downloads the update signature, and installs the update in the background. This requires generating signing keys.

---
**Recommendation for the Overlord:** 
Skip the 10GB+ local C++ Build Tools installation. Set up the GitHub Actions workflow, push the code, and let GitHub build the `.exe` for you. You can download the compiled artifact in about 10 minutes.