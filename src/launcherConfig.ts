import type { Server } from "./types";

export type LauncherMode = "generic" | "dedicated";

export type LauncherConfig = {
  mode: LauncherMode;
  appName: string;
  windowTitle: string;
  homeLabel: string;
  communityLabel: string;
  communityUrl: string;
  discovery: {
    featuredUrl: string;
    serversUrl: string;
  };
  dedicatedServer: Server | null;
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

function readDedicatedServer(mode: LauncherMode): Server | null {
  if (mode !== "dedicated") {
    return null;
  }

  return {
    name: readString("VITE_DEDICATED_SERVER_NAME"),
    address: readString("VITE_DEDICATED_SERVER_ADDRESS"),
    port: readNumber("VITE_DEDICATED_SERVER_PORT"),
    apiUrl: readString("VITE_DEDICATED_SERVER_API_URL"),
    description: readString("VITE_DEDICATED_SERVER_DESCRIPTION", ""),
    currentPlayers: readNumber("VITE_DEDICATED_SERVER_CURRENT_PLAYERS", 0),
    maxPlayers: readNumber("VITE_DEDICATED_SERVER_MAX_PLAYERS", 0),
  };
}

const mode = readMode();
const appName = readString("VITE_LAUNCHER_NAME", "Selene");

export const launcherConfig: LauncherConfig = Object.freeze({
  mode,
  appName,
  windowTitle: readString("VITE_WINDOW_TITLE", appName),
  homeLabel: readString("VITE_HOME_LABEL", appName),
  communityLabel: readString("VITE_COMMUNITY_LABEL", "Discord"),
  communityUrl: readString("VITE_COMMUNITY_URL", "https://discord.gg/S7maQVRRa9"),
  discovery: {
    featuredUrl: readString("VITE_DISCOVERY_FEATURED_URL", "https://telescope.seleneworlds.com/featured"),
    serversUrl: readString("VITE_DISCOVERY_SERVERS_URL", "https://telescope.seleneworlds.com/servers"),
  },
  dedicatedServer: readDedicatedServer(mode),
});

export const isDedicatedLauncher = launcherConfig.mode === "dedicated";
export const isGenericLauncher = launcherConfig.mode === "generic";
