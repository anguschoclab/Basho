// electronArchive.ts
// =======================================================
// Electron file storage implementation of ArchiveService
//
// This replaces OPFS for Electron builds, using the native
// file system via IPC for storing bout logs, gazettes, awards, etc.
// =======================================================

import type { ArchiveService } from "../archival";
import { destr } from "destr";

/**
 * ElectronArchiveService — file system-based archive service for Electron.
 * Falls back to OPFS for web builds.
 */
export class ElectronArchiveService implements ArchiveService {
  private isElectron: boolean;
  private baseDir: string = "";

  constructor() {
    this.isElectron = typeof window !== "undefined" && (window as any).__ELECTRON__;

    if (this.isElectron && (window as any).electronCustom?.appPath) {
      // Get app data path for storage
      this.initBaseDir();
    }
  }

  private async initBaseDir(): Promise<void> {
    if (!this.isElectron) return;

    try {
      const appDataPath = await (window as any).electronCustom.appPath.getPath("userData");
      this.baseDir = `${appDataPath}/archives`;

      // Create base directory
      await (window as any).electronCustom.fs.mkdir(this.baseDir, true);
    } catch (error) {
      console.error("Failed to initialize archive directory:", error);
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (!this.isElectron) return;

    const fullPath = `${this.baseDir}/${dirPath}`;
    await (window as any).electronCustom.fs.mkdir(fullPath, true);
  }

  public async archiveBoutLog(season: number, boutId: string, logData: unknown): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/bouts`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${boutId}.json`;
      const content = JSON.stringify(logData, null, 2);
      await (window as any).electronCustom.fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive bout log for season ${season}, bout ${boutId}:`, error);
    }
  }

  public async retrieveBoutLog(season: number, boutId: string): Promise<unknown | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/bouts/${boutId}.json`;
      const content = await (window as any).electronCustom.fs.readFile(filePath);

      if (content) {
        return destr(content);
      }
      return null;
    } catch (error) {
      console.error(`Failed to retrieve bout log for season ${season}, bout ${boutId}:`, error);
      return null;
    }
  }

  public async archiveGazette(
    season: number,
    bashoName: string,
    gazetteData: string
  ): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/gazettes`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${bashoName}.md`;
      await (window as any).electronCustom.fs.writeFile(filePath, gazetteData);
    } catch (error) {
      console.error(`Failed to archive gazette for season ${season}, basho ${bashoName}:`, error);
    }
  }

  public async retrieveGazette(season: number, bashoName: string): Promise<string | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/gazettes/${bashoName}.md`;
      const content = await (window as any).electronCustom.fs.readFile(filePath);
      return content;
    } catch (error) {
      console.error(`Failed to retrieve gazette for season ${season}, basho ${bashoName}:`, error);
      return null;
    }
  }

  public async archiveAward(season: number, awardId: string, awardData: unknown): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/awards`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${awardId}.json`;
      const content = JSON.stringify(awardData, null, 2);
      await (window as any).electronCustom.fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive award for season ${season}, award ${awardId}:`, error);
    }
  }

  public async retrieveAward(season: number, awardId: string): Promise<unknown | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/awards/${awardId}.json`;
      const content = await (window as any).electronCustom.fs.readFile(filePath);

      if (content) {
        return destr(content);
      }
      return null;
    } catch (error) {
      console.error(`Failed to retrieve award for season ${season}, award ${awardId}:`, error);
      return null;
    }
  }

  public async archiveBanzuke(
    season: number,
    bashoName: string,
    banzukeData: unknown
  ): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/banzuke`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${bashoName}.json`;
      const content = JSON.stringify(banzukeData, null, 2);
      await (window as any).electronCustom.fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive banzuke for season ${season}, basho ${bashoName}:`, error);
    }
  }

  public async retrieveBanzuke(season: number, bashoName: string): Promise<unknown | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/banzuke/${bashoName}.json`;
      const content = await (window as any).electronCustom.fs.readFile(filePath);

      if (content) {
        return destr(content);
      }
      return null;
    } catch (error) {
      console.error(`Failed to retrieve banzuke for season ${season}, basho ${bashoName}:`, error);
      return null;
    }
  }

  public async listArchives(
    season: number,
    type: "bouts" | "gazettes" | "awards" | "banzuke"
  ): Promise<string[]> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return [];
    }

    try {
      const dirPath = `${this.baseDir}/season_${season}/${type}`;
      const files = await (window as any).electronCustom.fs.readDir(dirPath);

      // Remove file extensions
      return files.map((file: string) => file.replace(/\.(json|md)$/, ""));
    } catch (error) {
      console.error(`Failed to list archives for season ${season}, type ${type}:`, error);
      return [];
    }
  }

  public async deleteArchive(
    season: number,
    type: "bouts" | "gazettes" | "awards" | "banzuke",
    name: string
  ): Promise<boolean> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return false;
    }

    try {
      const extension = type === "gazettes" ? ".md" : ".json";
      const filePath = `${this.baseDir}/season_${season}/${type}/${name}${extension}`;
      await (window as any).electronCustom.fs.deleteFile(filePath);
      return true;
    } catch (error) {
      console.error(
        `Failed to delete archive for season ${season}, type ${type}, name ${name}:`,
        error
      );
      return false;
    }
  }
}
