import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settings";
import { useVersionStore } from "./stores/version";
import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
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

    const baseDir = await appDataDir();
    const gameClientDir = await join(baseDir, "game_client");
    const classpath = await Promise.all(
      Object.keys(versionInfo.libraries).map((it) => join(gameClientDir, it))
    );
    classpath.push(await join(gameClientDir, versionInfo.fileName));
    const gameRunDir = await join(baseDir, "game_run");
    if(!(await exists(gameRunDir))) {
      await mkdir(gameRunDir);
    }

    await invoke("launch_game", {
      jrePath: jrePath.value,
      classpath,
      javaArgs,
      gameArgs,
      workingDir: gameRunDir,
    });
  }

  return {
    launchGame,
  };
}
