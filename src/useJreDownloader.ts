import { ref } from "vue";
import { download } from "@tauri-apps/plugin-upload";
import { exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { platform, arch } from "@tauri-apps/plugin-os";
import { appDataDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "./stores/settings";

export function useJreDownloader() {
  const status = ref("idle" as "idle" | "downloading" | "extracting" | "done" | "error");
  const progress = ref(0);
  const total = ref(0);
  const error = ref<string | null>(null);

  const JRE_VERSION = "21.0.8+9";

  function mapOs(os: string) {
    switch (os) {
      case "windows":
        return "windows";
      case "darwin":
        return "mac";
      case "linux":
        return "linux";
      default:
        throw new Error(`Unsupported OS: ${os}`);
    }
  }

  function mapArch(arch: string) {
    switch (arch) {
      case "x86_64":
        return "x64";
      case "aarch64":
        return "aarch64";
      default:
        throw new Error(`Unsupported Arch: ${arch}`);
    }
  }

  function mapOsToExtension(os: string) {
    switch (os) {
      case "windows":
        return "zip";
      case "darwin":
        return "tar.gz";
      case "linux":
        return "tar.gz";
      default:
        throw new Error(`Unsupported OS: ${os}`);
    }
  }

  async function isLocalJrePresent() {
    return await exists("jre", { baseDir: BaseDirectory.AppData });
  }

  async function downloadJre() {
    status.value = "downloading";
    progress.value = 0;
    error.value = null;
    try {
      const targetOs = mapOs(platform());
      const targetArch = mapArch(arch());
      const targetExtension = mapOsToExtension(targetOs);
      const targetFile = `OpenJDK21U-jre_${targetArch}_${targetOs}_hotspot_${JRE_VERSION.replace(
        "+",
        "_"
      )}.${targetExtension}`;
      const jreUrl = `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-${JRE_VERSION}/${targetFile}`;
      const baseDir = await appDataDir();
      const jreDir = await join(baseDir, "jre");
      if (!(await exists(jreDir))) {
        await mkdir(jreDir);
      }
      const jreArchivePath = await join(jreDir, targetFile);
      if (!(await exists(jreArchivePath))) {
        await download(
          jreUrl,
          jreArchivePath,
          (status: { progressTotal: number; total: number }) => {
            progress.value = status.progressTotal;
            total.value = status.total;
          }
        );
      }
      status.value = "extracting";
      const extractedJreRoot = await invoke<string>("extract_file", {
        filePath: jreArchivePath,
        destDir: jreDir,
      });
      const settings = useSettingsStore();
      settings.jrePath = await join(jreDir, extractedJreRoot);
      await settings.saveSettings();
    } catch (e: any) {
      error.value = e.message || String(e);
      status.value = "error";
    } finally {
      status.value = "done";
    }
  }

  return {
    downloadJre,
    progress,
    total,
    error,
    status,
    isLocalJrePresent,
  };
}
