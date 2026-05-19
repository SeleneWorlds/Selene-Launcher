import type { DedicatedServer, DedicatedUpdateCard } from "./types";

export type LauncherMode = "generic" | "dedicated";

type LauncherBrand = {
  mode: LauncherMode;
  appName: string;
  windowTitle: string;
  productName: string;
  homeLabel: string;
  communityLabel: string;
  communityUrl: string;
  authBrokerUrl: string;
  discovery: {
    featuredUrl: string;
    serversUrl: string;
  };
  dedicated: {
    server: DedicatedServer;
    tagline: string | null;
    updates: DedicatedUpdateCard[];
    tauriIconDir: string | null;
  } | null;
};

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

const brand = __LAUNCHER_BRAND__ as LauncherBrand;

export const launcherConfig: LauncherConfig = Object.freeze({
  mode: brand.mode,
  appName: brand.appName,
  windowTitle: brand.windowTitle,
  dedicatedLogoUrl: brand.dedicated?.tauriIconDir ? "/.launcher-assets/dedicated-logo.png" : null,
  homeLabel: brand.homeLabel,
  communityLabel: brand.communityLabel,
  communityUrl: brand.communityUrl,
  authBrokerUrl: brand.authBrokerUrl,
  discovery: {
    featuredUrl: brand.discovery.featuredUrl,
    serversUrl: brand.discovery.serversUrl,
  },
  dedicatedServer: brand.dedicated?.server ?? null,
  dedicatedTagline: brand.dedicated?.tagline ?? null,
  dedicatedUpdates: brand.dedicated?.updates ?? [],
});

export const isDedicatedLauncher = launcherConfig.mode === "dedicated";
export const isGenericLauncher = launcherConfig.mode === "generic";
