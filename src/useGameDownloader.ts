import { ref } from "vue";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { writeFile, mkdir, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { join, appDataDir } from "@tauri-apps/api/path";
import { useVersionStore } from "./stores/version";

export interface DownloadStatus {
  file: string;
  index: number;
  total: number;
  progress: number;
  status: "downloading" | "done" | "error";
  error?: string | null;
}

/**
 * Composable to handle game download logic.
 * Usage: const { startDownload, progress, isDownloading, error, reset } = useGameDownloader();
 */
export function useGameDownloader() {
  const isDownloading = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);
  const isComplete = ref(false);
  const versionStore = useVersionStore();

  async function isDownloaded(version: string) {
    const versionInfo = await versionStore.readVersionMetadata(version);
    const files: { url: string; name: string }[] = [
      {
        url: versionInfo.url,
        name: versionInfo.url.split("/").pop() || "game-client.jar",
      },
      ...(versionInfo.libraries && typeof versionInfo.libraries === "object"
        ? (Object.values(versionInfo.libraries) as string[]).map((libUrl) => ({
            url: libUrl,
            name: libUrl.split("/").pop() || "library.jar",
          }))
        : []),
    ];
    const baseDir = await appDataDir();
    const gameDir = await join(baseDir, "game_client");
    for (const file of files) {
      const destPath = await join(gameDir, file.name);
      if (!(await exists(destPath, { baseDir: BaseDirectory.AppData }))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Download all game files sequentially.
   * @param version Version to download
   * @param onStatus Callback for status/progress updates
   */
  async function startDownload(
    version: string,
    onStatus?: (status: DownloadStatus) => void
  ): Promise<any | undefined> {
    isDownloading.value = true;
    progress.value = 0;
    error.value = null;
    isComplete.value = false;

    try {
      const versionInfo = await versionStore.readVersionMetadata(version);
      const files: { url: string; name: string }[] = [
        {
          url: versionInfo.url,
          name: versionInfo.url.split("/").pop() || "game-client.jar",
        },
        ...(versionInfo.libraries && typeof versionInfo.libraries === "object"
          ? (Object.values(versionInfo.libraries) as string[]).map(
              (libUrl) => ({
                url: libUrl,
                name: libUrl.split("/").pop() || "library.jar",
              })
            )
          : []),
      ];
      const total = files.length;
      const baseDir = await appDataDir();
      const gameDir = await join(baseDir, "game_client");
      if (!(await exists(gameDir, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(gameDir, { baseDir: BaseDirectory.AppData });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileProgress = 0;
        const destPath = await join(gameDir, file.name);
        try {
          const fileExists = await (async () => {
            try {
              return await exists(destPath, { baseDir: BaseDirectory.AppData });
            } catch (e) {
              return false;
            }
          })();
          if (fileExists) {
            if (onStatus)
              onStatus({
                file: file.name,
                index: i + 1,
                total,
                progress: 100,
                status: "done",
              });
            progress.value = Math.round(((i + 1) / total) * 100);
            continue;
          }
          if (onStatus)
            onStatus({
              file: file.name,
              index: i + 1,
              total,
              progress: 0,
              status: "downloading",
            });
          const response = await tauriFetch(file.url, { method: "GET" });
          if (!response.ok) {
            if (response.status === 404) {
              console.error(`404 Not Found: ${file.url}`);
            }
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }
          const data = new Uint8Array(await response.arrayBuffer());
          await writeFile(destPath, data, { baseDir: BaseDirectory.AppData });
          fileProgress = 100;
          if (onStatus)
            onStatus({
              file: file.name,
              index: i + 1,
              total,
              progress: 100,
              status: "done",
            });
        } catch (e: any) {
          error.value = e.message || "Download failed";
          if (onStatus)
            onStatus({
              file: file.name,
              index: i + 1,
              total,
              progress: fileProgress,
              status: "error",
              error: error.value,
            });
          throw e;
        }
        progress.value = Math.round(((i + 1) / total) * 100);
      }
      isComplete.value = true;
      return versionInfo;
    } catch (err: any) {
      error.value = err.message || "Download failed";
      console.error(err);
      return undefined;
    } finally {
      isDownloading.value = false;
    }
  }

  function reset() {
    isDownloading.value = false;
    progress.value = 0;
    error.value = null;
    isComplete.value = false;
  }

  return {
    startDownload,
    progress,
    isDownloading,
    isDownloaded,
    error,
    isComplete,
    reset,
  };
}
