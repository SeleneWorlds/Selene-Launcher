import { normalize } from "node:path";
import { z } from "zod";

const defaultDedicatedUpdates = [
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

const nonEmptyString = z.string().trim().min(1);
const optionalTrimmedString = z.string().trim().optional().catch(undefined);

function normalizeRelativeIconPath(value) {
  const normalized = normalize(value).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw new Error("Invalid brand config: dedicated.tauriIconDir must point inside src-tauri");
  }
  return normalized;
}

const dedicatedUpdateSchema = z.object({
  title: nonEmptyString,
  body: nonEmptyString,
  label: optionalTrimmedString,
});

const dedicatedConfigSchema = z.object({
  server: z.object({
    name: nonEmptyString,
    address: nonEmptyString,
    port: z.coerce.number().finite(),
    apiUrl: nonEmptyString,
    description: z.string().trim().default(""),
  }),
  tagline: z.string().trim().nullable().optional().transform((value) => value ?? null),
  updates: z.array(dedicatedUpdateSchema).default(defaultDedicatedUpdates),
  tauriIconDir: z.string().trim().optional().transform((value) => (
    value ? normalizeRelativeIconPath(value) : null
  )),
});

const discoverySchema = z.object({
  featuredUrl: z.string().trim().optional(),
  serversUrl: z.string().trim().optional(),
}).nullish().transform((value) => ({
  featuredUrl: value?.featuredUrl?.trim() || "https://telescope.seleneworlds.com/featured",
  serversUrl: value?.serversUrl?.trim() || "https://telescope.seleneworlds.com/servers",
}));

export const launcherBrandSchema = z.object({
  mode: z.enum(["generic", "dedicated"]).default("generic"),
  appName: z.string().trim().default("Selene"),
  windowTitle: z.string().trim().optional(),
  productName: z.string().trim().optional(),
  homeLabel: z.string().trim().optional(),
  communityLabel: z.string().trim().default("Discord"),
  communityUrl: z.string().trim().default("https://discord.gg/S7maQVRRa9"),
  authBrokerUrl: z.string().trim().default("https://auth-broker.seleneworlds.com"),
  discovery: discoverySchema,
  dedicated: dedicatedConfigSchema.nullish().transform((value) => value ?? null),
}).transform((source) => {
  const appName = source.appName || "Selene";
  return {
    mode: source.mode,
    appName,
    windowTitle: source.windowTitle?.trim() || appName,
    productName: source.productName?.trim() || appName,
    homeLabel: source.homeLabel?.trim() || appName,
    communityLabel: source.communityLabel,
    communityUrl: source.communityUrl,
    authBrokerUrl: source.authBrokerUrl,
    discovery: source.discovery,
    dedicated: source.dedicated,
  };
}).superRefine((brand, ctx) => {
  if (brand.mode === "dedicated" && !brand.dedicated) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dedicated"],
      message: "Dedicated mode requires a dedicated section",
    });
  }
});
