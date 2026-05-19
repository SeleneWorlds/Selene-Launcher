import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadLauncherBrand, resolveBundleIcons, validateBundleIcons } from "./launcherBrand.mjs";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const baseConfigPath = resolve(rootDir, "src-tauri/tauri.conf.json");
const generatedConfigDir = resolve(rootDir, ".tauri");
const generatedConfigPath = resolve(generatedConfigDir, "tauri.generated.conf.json");
const generatedAssetDir = resolve(rootDir, "public/.launcher-assets");
const dedicatedLogoOutputPath = resolve(generatedAssetDir, "dedicated-logo.png");

function syncDedicatedLogo(iconDir) {
  rmSync(dedicatedLogoOutputPath, { force: true });

  if (!iconDir) {
    return;
  }

  const sourcePath = resolve(rootDir, "src-tauri", iconDir, "icon.png");
  mkdirSync(generatedAssetDir, { recursive: true });
  copyFileSync(sourcePath, dedicatedLogoOutputPath);
}

function withBrandArg(baseCommand, brandPathArg) {
  return brandPathArg ? `${baseCommand} -- --brand ${JSON.stringify(brandPathArg)}` : baseCommand;
}

function generateTauriConfig(brandConfig) {
  const baseConfig = JSON.parse(readFileSync(baseConfigPath, "utf8"));
  const { brand, brandPathArg } = brandConfig;
  const iconDir = brand.dedicated?.tauriIconDir ?? null;
  const bundleIcons = iconDir ? resolveBundleIcons(rootDir, iconDir) : baseConfig.bundle?.icon ?? [];

  syncDedicatedLogo(iconDir);
  validateBundleIcons(rootDir, bundleIcons);

  baseConfig.productName = brand.productName;
  if (baseConfig.app?.windows?.[0]) {
    baseConfig.app.windows[0].title = brand.windowTitle;
  }
  if (baseConfig.bundle) {
    baseConfig.bundle.icon = bundleIcons;
  }
  if (baseConfig.build) {
    baseConfig.build.beforeDevCommand = withBrandArg("pnpm dev", brandPathArg);
    baseConfig.build.beforeBuildCommand = withBrandArg("pnpm build", brandPathArg);
  }

  mkdirSync(generatedConfigDir, { recursive: true });
  writeFileSync(generatedConfigPath, `${JSON.stringify(baseConfig, null, 2)}\n`);
}

const brandConfig = loadLauncherBrand(rootDir, process.argv.slice(2));
generateTauriConfig(brandConfig);

const tauriExecutable = resolve(
  rootDir,
  process.platform === "win32" ? "node_modules/.bin/tauri.cmd" : "node_modules/.bin/tauri"
);
const tauriArgs = [...brandConfig.forwardedArgs, "--config", generatedConfigPath];
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
