import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import ui from "@nuxt/ui/vue-plugin";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

import App from "./App.vue";
import HomeView from "./views/HomeView.vue";
import { useAuthStore } from "./stores/auth";

const routes = [{ path: "/", component: HomeView }];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

const pinia = createPinia();

createApp(App).use(ui).use(router).use(pinia).mount("#app");

onOpenUrl(async ([url]) => {
  console.log(url)
  const parsedUrl = new URL(url);
  const path = parsedUrl.host;
  if (path === "auth") {
    console.log(path)
    const state = parsedUrl.searchParams.get("state");
    const code = parsedUrl.searchParams.get("code");
    if (code && state) {
      useAuthStore().validateAuthorizationCode(code, state);
    } else {
      console.error("Missing code or state")
    }
  }
});

useAuthStore().loadState()
