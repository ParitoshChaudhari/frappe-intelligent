import * as fs from 'fs';
import * as path from 'path';
import { BenchContext, FrappeAppInfo, FrappeVersion } from './types';
import { VersionDetector } from './versionDetector';

/**
 * Scans workspace to detect Frappe Bench structure, apps, sites, and configuration.
 */
export class BenchDetector {
  public static findBenchRoot(workspaceRoot: string): string | null {
    let currentDir = workspaceRoot;
    let fallbackAppDir: string | null = null;

    for (let i = 0; i < 6; i++) {
      const appsDir = path.join(currentDir, 'apps');
      const sitesDir = path.join(currentDir, 'sites');
      const hasApps = fs.existsSync(appsDir) && fs.statSync(appsDir).isDirectory();
      const hasSites = fs.existsSync(sitesDir) && fs.statSync(sitesDir).isDirectory();

      if (hasApps && hasSites) {
        return currentDir;
      }

      // Check if current directory itself is an app inside a bench or standalone app
      if (!fallbackAppDir) {
        const hooksPy = path.join(currentDir, 'hooks.py');
        const subHooksPy = path.join(currentDir, path.basename(currentDir), 'hooks.py');
        if (fs.existsSync(hooksPy) || fs.existsSync(subHooksPy)) {
          fallbackAppDir = currentDir;
        }
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    return fallbackAppDir || workspaceRoot;
  }

  public static getActiveAppNames(benchRoot: string): string[] {
    const appsTxtPath = path.join(benchRoot, 'sites', 'apps.txt');
    if (fs.existsSync(appsTxtPath)) {
      try {
        const content = fs.readFileSync(appsTxtPath, 'utf8');
        return content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#'));
      } catch {
        // Fallback to directory scan
      }
    }

    const appsDir = path.join(benchRoot, 'apps');
    if (fs.existsSync(appsDir)) {
      try {
        return fs
          .readdirSync(appsDir)
          .filter((f) => fs.statSync(path.join(appsDir, f)).isDirectory());
      } catch {
        return [];
      }
    }

    return [];
  }

  public static discoverBench(workspaceRoot: string, defaultVersion: FrappeVersion = 'v15'): BenchContext {
    const benchRoot = this.findBenchRoot(workspaceRoot) || workspaceRoot;
    const apps = new Map<string, FrappeAppInfo>();
    let activeAppNames = this.getActiveAppNames(benchRoot);

    const appsDir = path.join(benchRoot, 'apps');
    let frappeVersion: FrappeVersion = defaultVersion;

    if (fs.existsSync(appsDir)) {
      const appFolders = fs
        .readdirSync(appsDir)
        .filter((f) => fs.statSync(path.join(appsDir, f)).isDirectory());

      for (const appFolder of appFolders) {
        const appPath = path.join(appsDir, appFolder);
        const { version, majorVersion } = VersionDetector.detectAppVersion(appPath);
        const isFrappe = appFolder.toLowerCase() === 'frappe';
        const isErpnext = appFolder.toLowerCase() === 'erpnext';

        if (isFrappe) {
          frappeVersion = majorVersion;
        }

        apps.set(appFolder, {
          name: appFolder,
          version,
          majorVersion,
          path: appPath,
          isFrappeCore: isFrappe,
          isErpnext,
          doctypes: new Map(),
          whitelistedMethods: new Map(),
          hooks: new Map(),
        });
      }
    } else {
      // Single app workspace
      const appName = path.basename(benchRoot);
      const { version, majorVersion } = VersionDetector.detectAppVersion(benchRoot);
      const isFrappe = appName.toLowerCase() === 'frappe';
      
      if (isFrappe) {
        frappeVersion = majorVersion;
      }
      
      apps.set(appName, {
        name: appName,
        version,
        majorVersion,
        path: benchRoot,
        isFrappeCore: isFrappe,
        isErpnext: appName.toLowerCase() === 'erpnext',
        doctypes: new Map(),
        whitelistedMethods: new Map(),
        hooks: new Map(),
      });
      
      activeAppNames = [appName];
    }

    return {
      benchPath: benchRoot,
      frappeVersion,
      apps,
      activeAppNames,
    };
  }
}
