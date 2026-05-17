import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const baseConfigPath = resolve(rootDir, "src-tauri/tauri.conf.json");
const generatedConfigDir = resolve(rootDir, ".tauri");
const generatedConfigPath = resolve(generatedConfigDir, "tauri.generated.conf.json");

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

  if (mode === "dedicated") {
    requireString("VITE_DEDICATED_SERVER_NAME", process.env.VITE_DEDICATED_SERVER_NAME);
    requireString("VITE_DEDICATED_SERVER_ADDRESS", process.env.VITE_DEDICATED_SERVER_ADDRESS);
    requireString("VITE_DEDICATED_SERVER_PORT", process.env.VITE_DEDICATED_SERVER_PORT);
    requireString("VITE_DEDICATED_SERVER_API_URL", process.env.VITE_DEDICATED_SERVER_API_URL);
  }

  return { productName, windowTitle };
}

function generateTauriConfig() {
  const baseConfig = JSON.parse(readFileSync(baseConfigPath, "utf8"));
  const launcherConfig = parseLauncherConfig();

  baseConfig.productName = launcherConfig.productName;
  if (baseConfig.app?.windows?.[0]) {
    baseConfig.app.windows[0].title = launcherConfig.windowTitle;
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
