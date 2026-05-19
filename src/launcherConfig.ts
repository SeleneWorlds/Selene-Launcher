import type { DedicatedServer, DedicatedUpdateCard } from "./types";

export type LauncherMode = "generic" | "dedicated";

export type LauncherConfig = {
  mode: LauncherMode;
  appName: string;
  windowTitle: string;
  dedicatedLogoUrl: string | null;
  homeLabel: string;
  communityLabel: string;
  communityUrl: string;
  authBrokerUrl: string;
  discovery: {
    featuredUrl: string;
    serversUrl: string;
  };
  dedicatedServer: DedicatedServer | null;
  dedicatedTagline: string | null;
  dedicatedUpdates: DedicatedUpdateCard[];
};

function readString(name: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[name]?.trim();
  if (value) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required launcher config: ${name}`);
}

function readMode(): LauncherMode {
  const mode = readString("VITE_LAUNCHER_MODE", "generic");
  if (mode !== "generic" && mode !== "dedicated") {
    throw new Error(`Invalid VITE_LAUNCHER_MODE: ${mode}`);
  }
  return mode;
}

function readNumber(name: keyof ImportMetaEnv, fallback?: number): number {
  const raw = import.meta.env[name]?.trim();
  if (!raw) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required launcher config: ${name}`);
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric launcher config: ${name}`);
  }
  return parsed;
}

function readDedicatedServer(mode: LauncherMode): DedicatedServer | null {
  if (mode !== "dedicated") {
    return null;
  }

  return {
    name: readString("VITE_DEDICATED_SERVER_NAME"),
    address: readString("VITE_DEDICATED_SERVER_ADDRESS"),
    port: readNumber("VITE_DEDICATED_SERVER_PORT"),
    apiUrl: readString("VITE_DEDICATED_SERVER_API_URL"),
    description: readString("VITE_DEDICATED_SERVER_DESCRIPTION", ""),
  };
}

function readDedicatedTagline(mode: LauncherMode): string | null {
  if (mode !== "dedicated") {
    return null;
  }

  const tagline = readString("VITE_DEDICATED_TAGLINE", "").trim();
  return tagline || null;
}

function readDedicatedLogoUrl(mode: LauncherMode): string | null {
  if (mode !== "dedicated") {
    return null;
  }

  return readString("VITE_DEDICATED_TAURI_ICON_DIR", "").trim()
    ? "/.launcher-assets/dedicated-logo.png"
    : null;
}

function defaultDedicatedUpdates(): DedicatedUpdateCard[] {
  return [
    {
      title: "Summer Solstice",
      body: `A twilight gathering to honor the sun’s peak power. Join us for a flower crown workshop, meditation, and communal potluck.`,
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

function readDedicatedUpdates(mode: LauncherMode, dedicatedServer: DedicatedServer | null): DedicatedUpdateCard[] {
  if (mode !== "dedicated" || !dedicatedServer) {
    return [];
  }

  const raw = readString("VITE_DEDICATED_UPDATES_JSON", "").trim();
  if (!raw) {
    return defaultDedicatedUpdates();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid VITE_DEDICATED_UPDATES_JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid VITE_DEDICATED_UPDATES_JSON: expected a JSON array");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid VITE_DEDICATED_UPDATES_JSON entry at index ${index}`);
    }

    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const body = typeof record.body === "string" ? record.body.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";

    if (!title || !body) {
      throw new Error(`Invalid VITE_DEDICATED_UPDATES_JSON entry at index ${index}: title and body are required`);
    }

    return {
      title,
      body,
      label: label || undefined,
    };
  });
}

const mode = readMode();
const appName = readString("VITE_LAUNCHER_NAME", "Selene");
const dedicatedServer = readDedicatedServer(mode);

export const launcherConfig: LauncherConfig = Object.freeze({
  mode,
  appName,
  windowTitle: readString("VITE_WINDOW_TITLE", appName),
  dedicatedLogoUrl: readDedicatedLogoUrl(mode),
  homeLabel: readString("VITE_HOME_LABEL", appName),
  communityLabel: readString("VITE_COMMUNITY_LABEL", "Discord"),
  communityUrl: readString("VITE_COMMUNITY_URL", "https://discord.gg/S7maQVRRa9"),
  authBrokerUrl: readString("VITE_AUTH_BROKER_URL", "https://auth-broker.seleneworlds.com"),
  discovery: {
    featuredUrl: readString("VITE_DISCOVERY_FEATURED_URL", "https://telescope.seleneworlds.com/featured"),
    serversUrl: readString("VITE_DISCOVERY_SERVERS_URL", "https://telescope.seleneworlds.com/servers"),
  },
  dedicatedServer,
  dedicatedTagline: readDedicatedTagline(mode),
  dedicatedUpdates: readDedicatedUpdates(mode, dedicatedServer),
});

export const isDedicatedLauncher = launcherConfig.mode === "dedicated";
export const isGenericLauncher = launcherConfig.mode === "generic";
