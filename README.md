# Selene Launcher

Launcher and server browser for Selene worlds, using Tauri.

This project is part of the [Selene](https://github.com/SeleneWorlds) project.

## Launcher Modes

The launcher supports two build-time modes:

- `generic`: the default Selene launcher with home plus server browser
- `dedicated`: a branded single-server launcher with a focused main screen

Configure the build through Vite env variables in `.env` or your shell:

```bash
VITE_LAUNCHER_MODE=generic
VITE_LAUNCHER_NAME=Selene
VITE_WINDOW_TITLE=Selene
VITE_COMMUNITY_LABEL=Discord
VITE_COMMUNITY_URL=https://discord.gg/S7maQVRRa9
```

Dedicated builds also require a fixed server:

```bash
VITE_LAUNCHER_MODE=dedicated
VITE_LAUNCHER_NAME=Example Worlds
VITE_WINDOW_TITLE=Example Worlds Launcher
VITE_TAURI_PRODUCT_NAME=Example Worlds Launcher
VITE_DEDICATED_TAURI_ICON_DIR=icons/example-worlds
VITE_DEDICATED_SERVER_NAME=Example Server
VITE_DEDICATED_SERVER_ADDRESS=play.example.com
VITE_DEDICATED_SERVER_PORT=8147
VITE_DEDICATED_SERVER_API_URL=https://play.example.com/api
VITE_DEDICATED_SERVER_DESCRIPTION=Jump straight into the main world.
VITE_DEDICATED_TAGLINE=Your gateway into the live world.
VITE_DEDICATED_UPDATES_JSON=[{"label":"Hello World","title":"Launch this week","body":"Preview the new region and create your character."}]
```

The `pnpm tauri ...` wrapper generates a temporary Tauri config so product name, window title, and dedicated-mode bundle icons follow the same launcher settings.

## Getting Started

```bash
pnpm install
pnpm tauri dev
```

## Generating Icons

Icons for Tauri can be generated from the source SVG. This step must be done when changes are made to the logo.

```bash
pnpm tauri icon ./src/assets/selene.svg
```

For dedicated launches, you can generate a separate icon set into a subdirectory under `src-tauri` and point `VITE_DEDICATED_TAURI_ICON_DIR` at it. Any files present in that directory override the default Selene assets; missing files fall back to `src-tauri/icons`. A complete dedicated set can include:

- `32x32.png`
- `64x64.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.png`
- `icon.icns`
- `icon.ico`
- `StoreLogo.png`
- `Square30x30Logo.png`
- `Square44x44Logo.png`
- `Square71x71Logo.png`
- `Square89x89Logo.png`
- `Square107x107Logo.png`
- `Square142x142Logo.png`
- `Square150x150Logo.png`
- `Square284x284Logo.png`
- `Square310x310Logo.png`
