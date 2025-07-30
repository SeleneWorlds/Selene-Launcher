import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settings";
import { useVersionStore } from "./stores/version";
import { appDataDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

export interface LaunchOptions {
  javaArgs?: string[];
  gameArgs?: string[];
}

export function useGameLauncher() {
  const settingsStore = useSettingsStore();
  const versionStore = useVersionStore();
  const { jrePath } = storeToRefs(settingsStore);

  async function launchGame(
    version: string,
    { javaArgs = [], gameArgs = [] }: LaunchOptions
  ) {
    const versionInfo = await versionStore.readVersionMetadata(version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    const gameClientDir = await join(await appDataDir(), "game_client");
    const classpath = await Promise.all(
      Object.keys(versionInfo.libraries).map((it) => join(gameClientDir, it))
    );
    classpath.push(await join(gameClientDir, versionInfo.fileName));

    await invoke("launch_game", {
      jrePath: jrePath.value,
      classpath,
      javaArgs,
      gameArgs,
    });
  }

  return {
    launchGame,
  };
}
