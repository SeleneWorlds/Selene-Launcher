import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { launcherBrandSchema } from "./launcherBrandSchema.mjs";

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

export function parseBrandCliArgs(argv) {
  const forwardedArgs = [];
  let brandPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--brand") {
      const nextArg = argv[index + 1];
      if (!nextArg) {
        throw new Error("Missing value for --brand");
      }
      brandPath = nextArg;
      index += 1;
      continue;
    }
    if (arg.startsWith("--brand=")) {
      brandPath = arg.slice("--brand=".length);
      continue;
    }
    forwardedArgs.push(arg);
  }

  return { brandPath, forwardedArgs };
}

export function loadLauncherBrand(rootDir, argv = process.argv.slice(2)) {
  const { brandPath, forwardedArgs } = parseBrandCliArgs(argv);
  if (!brandPath) {
    return {
      brandPath: null,
      brandPathArg: null,
      forwardedArgs,
      brand: launcherBrandSchema.parse({}),
    };
  }

  const absoluteBrandPath = resolve(rootDir, brandPath);
  if (!existsSync(absoluteBrandPath)) {
    throw new Error(`Brand config file not found: ${brandPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absoluteBrandPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse brand config ${brandPath}: ${(error).message}`);
  }

  return {
    brandPath: absoluteBrandPath,
    brandPathArg: relative(rootDir, absoluteBrandPath).replace(/\\/g, "/"),
    forwardedArgs,
    brand: launcherBrandSchema.parse(parsed),
  };
}

export function resolveBundleIcons(rootDir, iconDir) {
  return defaultBundleIcons.map((iconPath) => {
    const fileName = iconPath.slice(iconPath.lastIndexOf("/") + 1);
    const dedicatedIconPath = `${iconDir}/${fileName}`;
    const absoluteDedicatedIconPath = resolve(rootDir, "src-tauri", dedicatedIconPath);
    return existsSync(absoluteDedicatedIconPath) ? dedicatedIconPath : iconPath;
  });
}

export function validateBundleIcons(rootDir, iconPaths) {
  for (const iconPath of iconPaths) {
    const absoluteIconPath = resolve(rootDir, "src-tauri", iconPath);
    if (!existsSync(absoluteIconPath)) {
      throw new Error(`Missing Tauri icon asset: src-tauri/${iconPath}`);
    }
  }
}
