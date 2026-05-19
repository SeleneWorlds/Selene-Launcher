import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { normalize, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const baseConfigPath = resolve(rootDir, "src-tauri/tauri.conf.json");
const generatedConfigDir = resolve(rootDir, ".tauri");
const generatedConfigPath = resolve(generatedConfigDir, "tauri.generated.conf.json");
const generatedAssetDir = resolve(rootDir, "public/.launcher-assets");
const dedicatedLogoOutputPath = resolve(generatedAssetDir, "dedicated-logo.png");
const defaultBundleIcons = [
  "icons/32x32.png",
  "icons/64x64.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.png",
  "icons/icon.icns",
  "icons/icon.ico",
  "icons/StoreLogo.png",
  "icons/Square30x30Logo.png",
  "icons/Square44x44Logo.png",
  "icons/Square71x71Logo.png",
  "icons/Square89x89Logo.png",
  "icons/Square107x107Logo.png",
  "icons/Square142x142Logo.png",
  "icons/Square150x150Logo.png",
  "icons/Square284x284Logo.png",
  "icons/Square310x310Logo.png",
];

function readEnvFile(fileName) {
  const envPath = resolve(rootDir, fileName);
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function requireString(name, value) {
  if (!value || !value.trim()) {
    throw new Error(`Missing required launcher config: ${name}`);
  }
  return value.trim();
}

function normalizeRelativeIconPath(value) {
  const normalized = normalize(value).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw new Error(
      "Invalid VITE_DEDICATED_TAURI_ICON_DIR: expected a path inside src-tauri",
    );
  }
  return normalized;
}

function resolveBundleIcons(iconDir) {
  return defaultBundleIcons.map((iconPath) => {
    const fileName = iconPath.slice(iconPath.lastIndexOf("/") + 1);
    const dedicatedIconPath = `${iconDir}/${fileName}`;
    const absoluteDedicatedIconPath = resolve(rootDir, "src-tauri", dedicatedIconPath);
    return existsSync(absoluteDedicatedIconPath) ? dedicatedIconPath : iconPath;
  });
}

function validateBundleIcons(iconPaths) {
  for (const iconPath of iconPaths) {
    const absoluteIconPath = resolve(rootDir, "src-tauri", iconPath);
    if (!existsSync(absoluteIconPath)) {
      throw new Error(`Missing Tauri icon asset: src-tauri/${iconPath}`);
    }
  }
}

function syncDedicatedLogo(iconDir) {
  rmSync(dedicatedLogoOutputPath, { force: true });

  if (!iconDir) {
    return;
  }

  const sourcePath = resolve(rootDir, "src-tauri", iconDir, "icon.png");
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing dedicated launcher logo asset: src-tauri/${iconDir}/icon.png`);
  }

  mkdirSync(generatedAssetDir, { recursive: true });
  copyFileSync(sourcePath, dedicatedLogoOutputPath);
}

function parseLauncherConfig() {
  readEnvFile(".env");
  readEnvFile(".env.local");

  const mode = (process.env.VITE_LAUNCHER_MODE ?? "generic").trim();
  if (mode !== "generic" && mode !== "dedicated") {
    throw new Error(`Invalid VITE_LAUNCHER_MODE: ${mode}`);
  }

  const appName = (process.env.VITE_LAUNCHER_NAME ?? "Selene").trim() || "Selene";
  const windowTitle = (process.env.VITE_WINDOW_TITLE ?? appName).trim() || appName;
  const productName = (process.env.VITE_TAURI_PRODUCT_NAME ?? appName).trim() || appName;
  let bundleIcons = [...defaultBundleIcons];

  if (mode === "dedicated") {
    requireString("VITE_DEDICATED_SERVER_NAME", process.env.VITE_DEDICATED_SERVER_NAME);
    requireString("VITE_DEDICATED_SERVER_ADDRESS", process.env.VITE_DEDICATED_SERVER_ADDRESS);
    requireString("VITE_DEDICATED_SERVER_PORT", process.env.VITE_DEDICATED_SERVER_PORT);
    requireString("VITE_DEDICATED_SERVER_API_URL", process.env.VITE_DEDICATED_SERVER_API_URL);

    const dedicatedIconDir = process.env.VITE_DEDICATED_TAURI_ICON_DIR?.trim();
    if (dedicatedIconDir) {
      const normalizedDedicatedIconDir = normalizeRelativeIconPath(dedicatedIconDir);
      bundleIcons = resolveBundleIcons(normalizedDedicatedIconDir);
      syncDedicatedLogo(normalizedDedicatedIconDir);
    } else {
      syncDedicatedLogo(null);
    }
  } else {
    syncDedicatedLogo(null);
  }

  validateBundleIcons(bundleIcons);

  return { bundleIcons, productName, windowTitle };
}

function generateTauriConfig() {
  const baseConfig = JSON.parse(readFileSync(baseConfigPath, "utf8"));
  const launcherConfig = parseLauncherConfig();

  baseConfig.productName = launcherConfig.productName;
  if (baseConfig.app?.windows?.[0]) {
    baseConfig.app.windows[0].title = launcherConfig.windowTitle;
  }
  if (baseConfig.bundle) {
    baseConfig.bundle.icon = launcherConfig.bundleIcons;
  }

  mkdirSync(generatedConfigDir, { recursive: true });
  writeFileSync(generatedConfigPath, `${JSON.stringify(baseConfig, null, 2)}\n`);
}

generateTauriConfig();

const tauriExecutable = resolve(
  rootDir,
  process.platform === "win32" ? "node_modules/.bin/tauri.cmd" : "node_modules/.bin/tauri"
);
const tauriArgs = [...process.argv.slice(2), "--config", generatedConfigPath];
const child = spawn(tauriExecutable, tauriArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
