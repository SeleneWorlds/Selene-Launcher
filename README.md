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
VITE_DEDICATED_SERVER_NAME=Example Server
VITE_DEDICATED_SERVER_ADDRESS=play.example.com
VITE_DEDICATED_SERVER_PORT=8147
VITE_DEDICATED_SERVER_API_URL=https://play.example.com/api
VITE_DEDICATED_SERVER_DESCRIPTION=Jump straight into the main world.
```

The `pnpm tauri ...` wrapper generates a temporary Tauri config so product and window titles follow the same launcher settings.

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
