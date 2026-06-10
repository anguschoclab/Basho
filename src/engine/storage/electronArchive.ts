// electronArchive.ts
// =======================================================
// Electron file storage implementation of ArchiveService
//
// This replaces OPFS for Electron builds, using the native
// file system via IPC for storing bout logs, gazettes, awards, etc.
// =======================================================

import type { ArchiveService } from "./opfsArchive";
import { type BoutResult, type BashoResult } from "../types/basho";
import { type AlmanacSnapshot } from "../almanac";
import { destr } from "destr";

/**
 * ElectronArchiveService — file system-based archive service for Electron.
 * Falls back to OPFS for web builds.
 */
export class ElectronArchiveService implements ArchiveService {
  private isElectron: boolean;
  private baseDir: string = "";

  private getElectronAPI() {
    if (!window.electronCustom) throw new Error("Electron API not available");
    return window.electronCustom;
  }

  constructor() {
    this.isElectron = typeof window !== "undefined" && window.__ELECTRON__ === true;

    if (this.isElectron && window.electronCustom?.appPath) {
      // Get app data path for storage
      this.initBaseDir();
    }
  }

  public isSupported(): boolean {
    return this.isElectron;
  }

  private async initBaseDir(): Promise<void> {
    if (!this.isElectron) return;

    try {
      const api = this.getElectronAPI();
      const appDataPath = await api.appPath.getPath("userData");
      this.baseDir = `${appDataPath}/archives`;

      // Create base directory
      await api.fs.mkdir(this.baseDir, true);
    } catch (error) {
      console.error("Failed to initialize archive directory:", error);
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (!this.isElectron) return;

    const fullPath = `${this.baseDir}/${dirPath}`;
    await this.getElectronAPI().fs.mkdir(fullPath, true);
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
      await this.getElectronAPI().fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive bout log for season ${season}, bout ${boutId}:`, error);
    }
  }

  public async retrieveBoutLog(season: number, boutId: string): Promise<BoutResult | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/bouts/${boutId}.json`;
      const content = await this.getElectronAPI().fs.readFile(filePath);

      if (content) {
        return destr<BoutResult>(content);
      }
      return null;
    } catch (error) {
      console.error(`Failed to retrieve bout log for season ${season}, bout ${boutId}:`, error);
      return null;
    }
  }

  public async archiveGazette(season: number, week: number, markdown: string): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/gazettes`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${week}.md`;
      await this.getElectronAPI().fs.writeFile(filePath, markdown);
    } catch (error) {
      console.error(`Failed to archive gazette for season ${season}, week ${week}:`, error);
    }
  }

  public async retrieveGazette(season: number, week: number): Promise<string | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/gazettes/${week}.md`;
      const content = await this.getElectronAPI().fs.readFile(filePath);
      return content;
    } catch (error) {
      console.error(`Failed to retrieve gazette for season ${season}, week ${week}:`, error);
      return null;
    }
  }

  public async getArchivedBoutIdsForSeason(season: number): Promise<string[]> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return [];
    }

    try {
      const dirPath = `${this.baseDir}/season_${season}/bouts`;
      const files = await this.getElectronAPI().fs.readDir(dirPath);

      // Remove .json extension
      return files.map((file: string) => file.replace(".json", ""));
    } catch (error) {
      console.error(`Failed to get archived bout IDs for season ${season}:`, error);
      return [];
    }
  }

  public async archiveAwards(season: number, awards: BashoResult[]): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/awards`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/awards.json`;
      const content = JSON.stringify(awards, null, 2);
      await this.getElectronAPI().fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive awards for season ${season}:`, error);
    }
  }

  public async retrieveAwards(season: number): Promise<BashoResult[]> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return [];
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/awards/awards.json`;
      const content = await this.getElectronAPI().fs.readFile(filePath);

      if (content) {
        return destr<BashoResult[]>(content);
      }
      return [];
    } catch (error) {
      console.error(`Failed to retrieve awards for season ${season}:`, error);
      return [];
    }
  }

  public async archiveBanzuke(
    season: number,
    bashoNumber: number,
    snapshot: AlmanacSnapshot
  ): Promise<void> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return;
    }

    try {
      const dirPath = `season_${season}/banzuke`;
      await this.ensureDir(dirPath);

      const filePath = `${this.baseDir}/${dirPath}/${bashoNumber}.json`;
      const content = JSON.stringify(snapshot, null, 2);
      await this.getElectronAPI().fs.writeFile(filePath, content);
    } catch (error) {
      console.error(`Failed to archive banzuke for season ${season}, basho ${bashoNumber}:`, error);
    }
  }

  public async retrieveBanzuke(
    season: number,
    bashoNumber: number
  ): Promise<AlmanacSnapshot | null> {
    if (!this.isElectron) {
      console.warn("ElectronArchiveService not available in web build");
      return null;
    }

    try {
      const filePath = `${this.baseDir}/season_${season}/banzuke/${bashoNumber}.json`;
      const content = await this.getElectronAPI().fs.readFile(filePath);

      if (content) {
        return destr<AlmanacSnapshot>(content);
      }
      return null;
    } catch (error) {
      console.error(
        `Failed to retrieve banzuke for season ${season}, basho ${bashoNumber}:`,
        error
      );
      return null;
    }
  }
}

export const electronArchiveService = new ElectronArchiveService();
