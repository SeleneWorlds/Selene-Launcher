/// <reference types="vite/client" />

declare const __LAUNCHER_BRAND__: {
  mode: "generic" | "dedicated";
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
    server: {
      name: string;
      description: string;
      address: string;
      port: number;
      apiUrl: string;
    };
    tagline: string | null;
    updates: Array<{
      title: string;
      body: string;
      label?: string;
    }>;
    tauriIconDir: string | null;
  } | null;
};

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
