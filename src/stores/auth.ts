import { defineStore } from "pinia";
import { reactive, computed } from "vue";
import * as arctic from "arctic";
import { load } from "@tauri-apps/plugin-store";
import { UnauthorizedError } from "../errors";

export const useAuthStore = defineStore("auth", () => {
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

  const realmUrl = "https://id.twelveiterations.com/realms/Selene";
  const clientId = "selene-launcher";
  const redirectUri = "selene://auth";
  const keycloak = new arctic.KeyCloak(realmUrl, clientId, null, redirectUri);

  async function loadState() {
    const persistentStore = await load("auth.json", { autoSave: false });
    session.accessToken = await persistentStore.get<string>(
      "accessToken"
    );
    session.refreshToken = await persistentStore.get<string>(
      "refreshToken"
    );
    session.accessTokenExpiresAt = await persistentStore.get<number>(
      "accessTokenExpiresAt"
    );
    session.refreshTokenExpiresAt = await persistentStore.get<number>("refreshTokenExpiresAt");
  }

  async function saveDeviceAuthTokens(data: any) {
    session.accessToken = data.access_token;
    session.accessTokenExpiresAt = Date.now() + (data.expires_in * 1000);
    session.refreshToken = data.refresh_token;
    session.refreshTokenExpiresAt = Date.now() + (data.refresh_expires_in * 1000);
    await saveState();
  }

  async function saveState() {
    const persistentStore = await load("auth.json", { autoSave: false });
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

  async function validateAuthorizationCode(code: string, state: string) {
    if (state !== session.state) {
      console.error("State mismatch");
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
        session.refreshTokenExpiresAt = tokens.data.refresh_expires_in;
      }

      await saveState();
    } catch (e) {
      if (e instanceof arctic.OAuth2RequestError) {
        // Invalid authorization code, credentials, or redirect URI
        const code = e.code;
        console.log(code);
      } else if (e instanceof arctic.ArcticFetchError) {
        console.log(e);
      } else {
        console.error(e);
      }
    }
  }

  async function accessToken() {
    if (session.accessToken === "") {
      throw new UnauthorizedError();
    }

    const now = new Date();
    if (session.accessTokenExpiresAt && new Date(session.accessTokenExpiresAt) < now) {
      try {
        if (session.refreshToken) {
          const tokens = await keycloak.refreshAccessToken(session.refreshToken);
          session.accessToken = tokens.accessToken();
          session.accessTokenExpiresAt = tokens.accessTokenExpiresAt().getTime();
          session.refreshToken = tokens.refreshToken();
          if (
            "refresh_expires_in" in tokens.data &&
            typeof tokens.data.refresh_expires_in === "number"
          ) {
            session.refreshTokenExpiresAt = tokens.data.refresh_expires_in;
          }
        }
      } catch (e) {
        if (e instanceof arctic.OAuth2RequestError) {
          // Invalid authorization code, credentials, or redirect URI
          console.error(e);
        } else if (e instanceof arctic.ArcticFetchError) {
          console.error(e);
        } else {
          console.error(e);
        }
      }
      
      await saveState();
    }

    return session.accessToken;
  }

  function signOut() {
    session.accessToken = "";
    session.refreshToken = "";
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
    createAuthorizationURL,
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
