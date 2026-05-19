import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const finiteNumber = z.number().finite();
const positiveIntFromUnknown = z.coerce.number().int().positive();

export const releaseChannelSchema = z.enum(["stable", "experimental"]);

export const joinableServerSchema = z.object({
  apiUrl: nonEmptyString,
  name: z.string().optional(),
}).passthrough();

export const listedServerSchema = joinableServerSchema.extend({
  name: nonEmptyString,
  description: nonEmptyString,
  currentPlayers: finiteNumber,
  maxPlayers: finiteNumber,
  address: z.string().optional(),
  port: finiteNumber.optional(),
});

export const featuredServerSchema = listedServerSchema;

export const serverStatusSchema = joinableServerSchema.extend({
  id: nonEmptyString,
  name: nonEmptyString,
  host: z.string().optional(),
  port: finiteNumber.optional(),
  status: z.literal("running"),
  uptime: finiteNumber,
  bundles: z.object({
    total_count: finiteNumber,
    client_count: finiteNumber,
  }),
  queueSize: finiteNumber,
  maxQueueSize: finiteNumber,
  currentPlayers: finiteNumber,
  maxPlayers: finiteNumber,
});

export const serversResponseSchema = z.object({
  servers: z.array(listedServerSchema),
});

export const versionMetadataSchema = z.object({
  version: nonEmptyString,
  url: nonEmptyString,
  fileName: nonEmptyString,
  libraries: z.record(z.string(), z.string()),
});

export const queueStatusSchema = z.object({
  status: nonEmptyString,
  message: nonEmptyString,
  token: z.string().optional(),
});

export const bundleEntrySchema = z.object({
  name: nonEmptyString,
  hash: nonEmptyString,
  variants: z.array(nonEmptyString),
  allow_shared_cache: z.boolean().optional(),
});

export const bundlesResponseSchema = z.record(z.string(), bundleEntrySchema);

export const brokerTokenResponseSchema = z.object({
  token: nonEmptyString,
  expires_at: nonEmptyString.refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid datetime",
  }),
  token_type: nonEmptyString,
});

export const deviceAuthStartResponseSchema = z.object({
  user_code: nonEmptyString,
  verification_uri_complete: nonEmptyString,
  device_code: nonEmptyString,
  interval: positiveIntFromUnknown.optional(),
});

export const deviceAuthTokensSchema = z.object({
  access_token: nonEmptyString,
  expires_in: positiveIntFromUnknown,
  refresh_token: nonEmptyString,
  refresh_expires_in: positiveIntFromUnknown,
  token_type: z.string().optional(),
});

export const deviceAuthPollPendingSchema = z.object({
  error: z.literal("authorization_pending"),
  error_description: z.string().optional(),
});

export const deviceAuthPollErrorSchema = z.object({
  error: nonEmptyString,
  error_description: z.string().optional(),
});

export const authSessionStateSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: finiteNumber.nonnegative(),
  refreshTokenExpiresAt: finiteNumber.nonnegative(),
});

export const deepLinkAuthQuerySchema = z.object({
  code: nonEmptyString,
  state: nonEmptyString,
});

export const dedicatedServerSchema = joinableServerSchema.extend({
  name: nonEmptyString,
  description: nonEmptyString,
  address: nonEmptyString,
  port: finiteNumber,
});

export const dedicatedUpdateCardSchema = z.object({
  title: nonEmptyString,
  body: nonEmptyString,
  label: z.string().optional(),
});

const launcherModeSchema = z.enum(["generic", "dedicated"]);

const launcherBrandBaseSchema = z.object({
  mode: launcherModeSchema,
  appName: nonEmptyString,
  windowTitle: nonEmptyString,
  productName: nonEmptyString,
  homeLabel: nonEmptyString,
  communityLabel: nonEmptyString,
  communityUrl: nonEmptyString,
  authBrokerUrl: nonEmptyString,
  discovery: z.object({
    featuredUrl: nonEmptyString,
    serversUrl: nonEmptyString,
  }),
  dedicated: z.object({
    server: dedicatedServerSchema,
    tagline: z.string().nullable(),
    updates: z.array(dedicatedUpdateCardSchema),
    tauriIconDir: z.string().nullable(),
  }).nullable(),
});

export const launcherBrandSchema = launcherBrandBaseSchema.superRefine((brand, ctx) => {
  if (brand.mode === "dedicated" && !brand.dedicated) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dedicated"],
      message: "Dedicated mode requires a dedicated config",
    });
  }
});

export type ReleaseChannel = z.infer<typeof releaseChannelSchema>;
export type JoinableServerSchema = z.infer<typeof joinableServerSchema>;
export type ListedServerSchema = z.infer<typeof listedServerSchema>;
export type FeaturedServerSchema = z.infer<typeof featuredServerSchema>;
export type ServerStatusSchema = z.infer<typeof serverStatusSchema>;
export type VersionMetadataSchema = z.infer<typeof versionMetadataSchema>;
export type QueueStatusSchema = z.infer<typeof queueStatusSchema>;
export type BundleEntrySchema = z.infer<typeof bundleEntrySchema>;
export type DeviceAuthTokens = z.infer<typeof deviceAuthTokensSchema>;
export type LauncherBrandSchema = z.infer<typeof launcherBrandSchema>;
