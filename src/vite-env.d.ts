/// <reference types="vite/client" />

declare const __LAUNCHER_BRAND__: unknown;

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
