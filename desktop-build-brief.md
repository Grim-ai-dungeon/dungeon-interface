# Desktop Build Brief

Goal: get a working Windows desktop build onto the Overlord's PC as fast as possible, with the least wasted effort.

## Fastest path
- Use GitHub Actions on a Windows runner and ship the built artifact.
- Do not cross-compile Tauri from Ubuntu; it is a dependency trap.
- Keep the first goal to "launchable .exe or installer" only.

## What to do next
1. Confirm the app builds cleanly locally with `npm run build`.
2. Add or verify a GitHub Actions workflow that runs `tauri-apps/tauri-action` on `windows-latest`.
3. Push to `main` and download the artifact from the Actions tab.
4. Hand the Overlord the `.exe` or installer, whichever the workflow produces first.

## What not to spend time on yet
- Auto-updater wiring.
- Code signing and release infrastructure.
- Fancy installer UX or custom bootstrapper.
- Cross-compilation from Linux.
- UI polish beyond "does the app open and show the core dashboard".

## Practical recommendation
- If the repo already has Tauri scaffolded, prioritize a minimal workflow and a clean build over feature work.
- If Windows packaging breaks, fix packaging first before adding any more UI.
- Treat the first artifact as a proof of life, not the final product.
