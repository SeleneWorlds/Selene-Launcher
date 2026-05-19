import { defineStore } from "pinia";
import { reactive, computed } from "vue";
import * as arctic from "arctic";
import { load } from "@tauri-apps/plugin-store";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import { UnauthorizedError } from "../errors";
import { launcherConfig } from "../launcherConfig";
import { logError, logInfo } from "../logger";
import {
  authSessionStateSchema,
  brokerTokenResponseSchema,
  deviceAuthTokensSchema,
  type DeviceAuthTokens,
} from "../schemas";

async function readResponseDetails(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;

  const session = reactive<{
    state: string
    codeVerifier: string
    accessToken: string | undefined
    refreshToken: string | undefined
    accessTokenExpiresAt: number | undefined
    refreshTokenExpiresAt: number | undefined
    joinToken: string
  }>({
    state: "",
    codeVerifier: "",
    accessToken: "",
    accessTokenExpiresAt: 0,
    refreshToken: "",
    refreshTokenExpiresAt: 0,
    joinToken: "",
  });
  const brokerTokens = reactive<Record<string, {
    token: string;
    expiresAt: number;
  }>>({});

  const realmUrl = "https://id.twelveiterations.com/realms/Selene";
  const clientId = "selene-launcher";
  const redirectUri = "selene://auth";
  const keycloak = new arctic.KeyCloak(realmUrl, clientId, null, redirectUri);

  async function loadState() {
    const persistentStore = await load("auth.json", { autoSave: false, defaults: {} });
    const persistedState = authSessionStateSchema.safeParse({
      accessToken: await persistentStore.get("accessToken"),
      refreshToken: await persistentStore.get("refreshToken"),
      accessTokenExpiresAt: await persistentStore.get("accessTokenExpiresAt"),
      refreshTokenExpiresAt: await persistentStore.get("refreshTokenExpiresAt"),
    });
    if (!persistedState.success) {
      return;
    }
    session.accessToken = persistedState.data.accessToken;
    session.refreshToken = persistedState.data.refreshToken;
    session.accessTokenExpiresAt = persistedState.data.accessTokenExpiresAt;
    session.refreshTokenExpiresAt = persistedState.data.refreshTokenExpiresAt;
  }

  async function saveDeviceAuthTokens(rawData: DeviceAuthTokens) {
    const data = deviceAuthTokensSchema.parse(rawData);
    session.accessToken = data.access_token;
    session.accessTokenExpiresAt = Date.now() + (data.expires_in * 1000);
    session.refreshToken = data.refresh_token;
    session.refreshTokenExpiresAt = Date.now() + (data.refresh_expires_in * 1000);
    await saveState();
  }

  async function saveState() {
    const persistentStore = await load("auth.json", { autoSave: false, defaults: {} });
    await persistentStore.set("accessToken", session.accessToken);
    await persistentStore.set(
      "accessTokenExpiresAt",
      session.accessTokenExpiresAt
    );
    await persistentStore.set("refreshToken", session.refreshToken);
    await persistentStore.set(
      "refreshTokenExpiresAt",
      session.refreshTokenExpiresAt
    );
    await persistentStore.save();
  }

  function createAuthorizationURL() {
    const state = arctic.generateState();
    const codeVerifier = arctic.generateCodeVerifier();
    session.state = state;
    session.codeVerifier = codeVerifier;
    const scopes = ["openid", "offline_access"];
    return keycloak.createAuthorizationURL(state, codeVerifier, scopes);
  }

  async function startSignIn() {
    const authorizationUrl = createAuthorizationURL();
    logInfo("[AuthStore] Starting deeplink sign-in", {
      redirectUri,
      authorizationUrl: authorizationUrl.toString(),
    });
    await openUrl(authorizationUrl.toString());
  }

  async function validateAuthorizationCode(code: string, state: string) {
    if (state !== session.state) {
      logError("[AuthStore] State mismatch during authorization code validation", {
        expectedState: session.state,
        actualState: state,
      });
      throw new Error("Invalid request");
    }

    try {
      const tokens = await keycloak.validateAuthorizationCode(
        code,
        session.codeVerifier
      );
      session.accessToken = tokens.accessToken();
      session.accessTokenExpiresAt = tokens.accessTokenExpiresAt().getTime();
      session.refreshToken = tokens.refreshToken();
      if (
        "refresh_expires_in" in tokens.data &&
        typeof tokens.data.refresh_expires_in === "number"
      ) {
        session.refreshTokenExpiresAt = Date.now() + (tokens.data.refresh_expires_in * 1000);
      }

      await saveState();
    } catch (e) {
      if (e instanceof arctic.OAuth2RequestError) {
        logError("[AuthStore] Authorization code rejected", {
          oauthErrorCode: e.code,
        });
      } else if (e instanceof arctic.ArcticFetchError) {
        logError("[AuthStore] Failed to reach identity provider during authorization code validation", {
          error: e,
        });
      } else {
        logError("[AuthStore] Unexpected error during authorization code validation", {
          error: e,
        });
      }
    }
  }

  async function refreshLauncherAccessToken() {
    try {
      const tokens = await keycloak.refreshAccessToken(session.refreshToken!);
      session.accessToken = tokens.accessToken();
      session.accessTokenExpiresAt = tokens.accessTokenExpiresAt().getTime();
      session.refreshToken = tokens.refreshToken();
      if (
        "refresh_expires_in" in tokens.data &&
        typeof tokens.data.refresh_expires_in === "number"
      ) {
        session.refreshTokenExpiresAt = Date.now() + (tokens.data.refresh_expires_in * 1000);
      }
      await saveState();
    } catch (e) {
      logError("[AuthStore] Failed to refresh access token", {
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        cause: e,
      });
      signOut();
      if (e instanceof arctic.OAuth2RequestError) {
        throw new UnauthorizedError("Refresh token rejected by identity provider", {
          cause: e,
          context: {
            step: "refreshAccessToken",
            oauthErrorCode: e.code,
          },
        });
      } else if (e instanceof arctic.ArcticFetchError) {
        throw new UnauthorizedError("Unable to reach identity provider while refreshing session", {
          cause: e,
          context: {
            step: "refreshAccessToken",
          },
        });
      } else {
        throw new UnauthorizedError("Unexpected error while refreshing session", {
          cause: e,
          context: {
            step: "refreshAccessToken",
          },
        });
      }
    }
  }

  async function accessToken(forceRefresh = false) {
    if (session.accessToken === "") {
      throw new UnauthorizedError("No launcher access token available", {
        context: {
          step: "accessToken",
        },
      });
    }

    const now = Date.now();
    const accessTokenNeedsRefresh =
      !session.accessTokenExpiresAt ||
      session.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_SKEW_MS <= now;

    if (forceRefresh || accessTokenNeedsRefresh) {
      if (!session.refreshToken) {
        logError("[AuthStore] Access token expired and no refresh token is available", {
          accessTokenExpiresAt: session.accessTokenExpiresAt,
          refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        });
        signOut();
        throw new UnauthorizedError("Session expired and no refresh token is available", {
          context: {
            step: "refreshAccessToken",
            accessTokenExpiresAt: session.accessTokenExpiresAt,
            refreshTokenExpiresAt: session.refreshTokenExpiresAt,
          },
        });
      }

      if (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt < now) {
        logError("[AuthStore] Refresh token is expired", {
          accessTokenExpiresAt: session.accessTokenExpiresAt,
          refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        });
        signOut();
        throw new UnauthorizedError("Session expired and refresh token is expired", {
          context: {
            step: "refreshAccessToken",
            accessTokenExpiresAt: session.accessTokenExpiresAt,
            refreshTokenExpiresAt: session.refreshTokenExpiresAt,
          },
        });
      }

      await refreshLauncherAccessToken();
    }

    return session.accessToken;
  }

  async function brokerAccessToken(serverId: string) {
    const cachedToken = brokerTokens[serverId];
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt - 30_000 > now) {
      return cachedToken.token;
    }

    let launcherAccessToken = await accessToken();
    let response = await tauriFetch(`${launcherConfig.authBrokerUrl}/token/exchange`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${launcherAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        server_id: serverId,
      }),
    });
    if (response.status === 401) {
      const responseBody = await readResponseDetails(response);
      logInfo("[AuthStore] Broker token exchange returned 401, retrying after refresh", {
        serverId,
        authBrokerUrl: launcherConfig.authBrokerUrl,
        responseBody,
      });
      launcherAccessToken = await accessToken(true);
      response = await tauriFetch(`${launcherConfig.authBrokerUrl}/token/exchange`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${launcherAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          server_id: serverId,
        }),
      });
    }
    if (response.status === 401) {
      const responseBody = await readResponseDetails(response);
      logError("[AuthStore] Broker token exchange still returned 401 after refresh", {
        serverId,
        authBrokerUrl: launcherConfig.authBrokerUrl,
        responseBody,
      });
      throw new UnauthorizedError("Auth broker rejected launcher access token", {
        context: {
          step: "brokerAccessToken",
          serverId,
          status: response.status,
          responseBody,
        },
      });
    }
    if (!response.ok) {
      const responseBody = await readResponseDetails(response);
      logError("[AuthStore] Failed to exchange broker token", {
        serverId,
        status: response.status,
        statusText: response.statusText,
        responseBody,
      });
      throw new Error(`Failed to exchange broker token: ${response.status} ${response.statusText}`);
    }

    const data = brokerTokenResponseSchema.parse(await response.json());
    brokerTokens[serverId] = {
      token: data.token,
      expiresAt: new Date(data.expires_at).getTime(),
    };
    logInfo("[AuthStore] Broker token exchange succeeded", {
      serverId,
      expiresAt: data.expires_at,
    });
    return data.token;
  }

  function signOut() {
    session.accessToken = "";
    session.accessTokenExpiresAt = 0;
    session.refreshToken = "";
    session.refreshTokenExpiresAt = 0;
    session.joinToken = "";
    for (const key of Object.keys(brokerTokens)) {
      delete brokerTokens[key];
    }
    saveState();
  }

  const isSignedIn = computed(() => {
    return session.accessToken !== "";
  });

  const updateJoinToken = (token: string) => {
    session.joinToken = token;
  };

  const joinToken = computed(() => {
    return session.joinToken;
  });

  return {
    session,
    accessToken,
    brokerAccessToken,
    createAuthorizationURL,
    startSignIn,
    validateAuthorizationCode,
    isSignedIn,
    signOut,
    loadState,
    saveState,
    saveDeviceAuthTokens,
    updateJoinToken,
    joinToken,
  };
});
