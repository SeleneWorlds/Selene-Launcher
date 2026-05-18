/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LAUNCHER_MODE?: "generic" | "dedicated";
  readonly VITE_LAUNCHER_NAME?: string;
  readonly VITE_WINDOW_TITLE?: string;
  readonly VITE_HOME_LABEL?: string;
  readonly VITE_COMMUNITY_LABEL?: string;
  readonly VITE_COMMUNITY_URL?: string;
  readonly VITE_AUTH_BROKER_URL?: string;
  readonly VITE_DISCOVERY_FEATURED_URL?: string;
  readonly VITE_DISCOVERY_SERVERS_URL?: string;
  readonly VITE_TAURI_PRODUCT_NAME?: string;
  readonly VITE_DEDICATED_SERVER_ID?: string;
  readonly VITE_DEDICATED_SERVER_NAME?: string;
  readonly VITE_DEDICATED_SERVER_ADDRESS?: string;
  readonly VITE_DEDICATED_SERVER_PORT?: string;
  readonly VITE_DEDICATED_SERVER_API_URL?: string;
  readonly VITE_DEDICATED_SERVER_DESCRIPTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
