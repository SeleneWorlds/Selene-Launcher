import { existsSync, readFileSync } from "node:fs";
import { normalize, relative, resolve } from "node:path";

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

function expectObject(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid brand config: ${name} must be an object`);
  }
  return value;
}

function readOptionalString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readRequiredString(name, value) {
  const result = readOptionalString(value);
  if (!result) {
    throw new Error(`Invalid brand config: ${name} is required`);
  }
  return result;
}

function readOptionalNumber(name, value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid brand config: ${name} must be a finite number`);
  }
  return parsed;
}

function normalizeRelativeIconPath(value) {
  const normalized = normalize(value).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw new Error("Invalid brand config: dedicated.tauriIconDir must point inside src-tauri");
  }
  return normalized;
}

function defaultDedicatedUpdates() {
  return [
    {
      title: "Summer Solstice",
      body: "A twilight gathering to honor the sun’s peak power. Join us for a flower crown workshop, meditation, and communal potluck.",
      label: "Upcoming Events",
    },
    {
      title: "Apples are now BANNED!",
      body: "Following last week's vote, apples are now officially banned and will be removed from your inventory the next time you log in.",
      label: "Community Updates",
    },
    {
      title: "Patch 12.0.23",
      body: "Stopped cats from dying of alcohol poisoning after walking over damp tavern floors and cleaning themselves.",
      label: "Technical Updates",
    },
  ];
}

function normalizeDedicatedUpdates(value) {
  if (value === undefined) {
    return defaultDedicatedUpdates();
  }
  if (!Array.isArray(value)) {
    throw new Error("Invalid brand config: dedicated.updates must be an array");
  }
  return value.map((entry, index) => {
    const record = expectObject(`dedicated.updates[${index}]`, entry);
    const title = readRequiredString(`dedicated.updates[${index}].title`, record.title);
    const body = readRequiredString(`dedicated.updates[${index}].body`, record.body);
    const label = readOptionalString(record.label);
    return { title, body, label: label || undefined };
  });
}

function normalizeDedicatedConfig(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const dedicated = expectObject("dedicated", value);
  const server = expectObject("dedicated.server", dedicated.server);
  const port = readOptionalNumber("dedicated.server.port", server.port);
  if (port === null) {
    throw new Error("Invalid brand config: dedicated.server.port is required");
  }

  const tauriIconDir = readOptionalString(dedicated.tauriIconDir);

  return {
    server: {
      name: readRequiredString("dedicated.server.name", server.name),
      address: readRequiredString("dedicated.server.address", server.address),
      port,
      apiUrl: readRequiredString("dedicated.server.apiUrl", server.apiUrl),
      description: readOptionalString(server.description),
    },
    tagline: readOptionalString(dedicated.tagline) || null,
    updates: normalizeDedicatedUpdates(dedicated.updates),
    tauriIconDir: tauriIconDir ? normalizeRelativeIconPath(tauriIconDir) : null,
  };
}

function normalizeBrandConfig(raw) {
  const source = expectObject("root", raw);
  const mode = readOptionalString(source.mode, "generic");
  if (mode !== "generic" && mode !== "dedicated") {
    throw new Error(`Invalid brand config: mode must be "generic" or "dedicated", got "${mode}"`);
  }

  const appName = readOptionalString(source.appName, "Selene");
  const dedicated = normalizeDedicatedConfig(source.dedicated);

  if (mode === "dedicated" && !dedicated) {
    throw new Error("Invalid brand config: dedicated mode requires a dedicated section");
  }

  return {
    mode,
    appName,
    windowTitle: readOptionalString(source.windowTitle, appName),
    productName: readOptionalString(source.productName, appName),
    homeLabel: readOptionalString(source.homeLabel, appName),
    communityLabel: readOptionalString(source.communityLabel, "Discord"),
    communityUrl: readOptionalString(source.communityUrl, "https://discord.gg/S7maQVRRa9"),
    authBrokerUrl: readOptionalString(source.authBrokerUrl, "https://auth-broker.seleneworlds.com"),
    discovery: {
      featuredUrl: readOptionalString(source.discovery?.featuredUrl, "https://telescope.seleneworlds.com/featured"),
      serversUrl: readOptionalString(source.discovery?.serversUrl, "https://telescope.seleneworlds.com/servers"),
    },
    dedicated,
  };
}

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
      brand: normalizeBrandConfig({}),
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
    brand: normalizeBrandConfig(parsed),
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
