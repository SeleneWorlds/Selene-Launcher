# Selene Launcher

Launcher and server browser for Selene worlds, using Tauri.

This project is part of the [Selene](https://github.com/SeleneWorlds) project.

## Launcher Modes

The launcher supports two build-time modes:

- `generic`: the default Selene launcher with home plus server browser
- `dedicated`: a branded single-server launcher with a focused main screen

Generic builds use the built-in defaults:

```bash
pnpm tauri dev
```

Dedicated builds are configured through a brand JSON file passed at build time:

```bash
pnpm tauri dev -- --brand ./brands/example-worlds.json
```

The same flag works for plain Vite builds:

```bash
pnpm build -- --brand ./brands/example-worlds.json
```

The `pnpm tauri ...` wrapper generates a temporary Tauri config so product name, window title, dedicated-mode bundle icons, and the nested `pnpm dev`/`pnpm build` calls all use the same brand file.

Brand file shape:

```json
{
  "mode": "dedicated",
  "appName": "Example Worlds",
  "windowTitle": "Example Worlds Launcher",
  "productName": "Example Worlds Launcher",
  "communityLabel": "Discord",
  "communityUrl": "https://discord.gg/S7maQVRRa9",
  "authBrokerUrl": "https://auth-broker.seleneworlds.com",
  "discovery": {
    "featuredUrl": "https://telescope.seleneworlds.com/featured",
    "serversUrl": "https://telescope.seleneworlds.com/servers"
  },
  "dedicated": {
    "tauriIconDir": "icons/example-worlds",
    "tagline": "Your gateway into the live world.",
    "server": {
      "name": "Example Server",
      "address": "play.example.com",
      "port": 8147,
      "apiUrl": "https://play.example.com/api",
      "description": "Jump straight into the main world."
    },
    "updates": [
      {
        "label": "Hello World",
        "title": "Launch this week",
        "body": "Preview the new region and create your character."
      }
    ]
  }
}
```

If `mode` is omitted it defaults to `generic`. For dedicated builds, `dedicated.server` is required. If `dedicated.updates` is omitted, the launcher falls back to the built-in sample cards.

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

For dedicated launches, you can generate a separate icon set into a subdirectory under `src-tauri` and point `dedicated.tauriIconDir` at it. Any files present in that directory override the default Selene assets; missing files fall back to `src-tauri/icons`. A complete dedicated set can include:

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
