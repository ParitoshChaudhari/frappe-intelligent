import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Manages Frappe Bench sites and tracks the currently active selected site.
 */
export class SiteManager {
  private static instance: SiteManager;
  private activeSite: string | null = null;
  private discoveredSites: string[] = [];

  public static getInstance(): SiteManager {
    if (!SiteManager.instance) {
      SiteManager.instance = new SiteManager();
    }
    return SiteManager.instance;
  }

  public findSitesDirectory(startDir: string): string | null {
    let currentDir = startDir;
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(currentDir, 'sites');
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          return candidate;
        }
      } catch {
        // ignore
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    return null;
  }

  public discoverSites(startDir: string): string[] {
    this.discoveredSites = [];
    const sitesDir = this.findSitesDirectory(startDir);

    if (sitesDir && fs.existsSync(sitesDir)) {
      try {
        const entries = fs.readdirSync(sitesDir);
        for (const name of entries) {
          if (name === 'assets' || name.startsWith('.') || name === '__pycache__' || name === 'apps.txt' || name === 'common_site_config.json' || name === 'currentsite.txt') {
            continue;
          }

          const fullPath = path.join(sitesDir, name);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const siteConfig = path.join(fullPath, 'site_config.json');
              const hasSiteConfig = fs.existsSync(siteConfig);
              const hasPublicOrPrivate = fs.existsSync(path.join(fullPath, 'public')) || fs.existsSync(path.join(fullPath, 'private'));
              const isDomainLike = name.includes('.');

              if (hasSiteConfig || (hasPublicOrPrivate && isDomainLike)) {
                if (!this.discoveredSites.includes(name)) {
                  this.discoveredSites.push(name);
                }
              }
            }
          } catch {
            // ignore
          }
        }

        // Check currentsite.txt for active site configuration
        const currentSiteTxt = path.join(sitesDir, 'currentsite.txt');
        if (fs.existsSync(currentSiteTxt)) {
          try {
            const site = fs.readFileSync(currentSiteTxt, 'utf8').trim();
            if (site) {
              const sitePath = path.join(sitesDir, site);
              if (fs.existsSync(sitePath) && !this.discoveredSites.includes(site)) {
                this.discoveredSites.push(site);
              }
              if (this.discoveredSites.includes(site)) {
                if (!this.activeSite || !this.discoveredSites.includes(this.activeSite)) {
                  this.activeSite = site;
                }
              }
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.discoveredSites.length > 0 && (!this.activeSite || !this.discoveredSites.includes(this.activeSite))) {
      this.activeSite = this.discoveredSites[0];
    }

    return this.discoveredSites;
  }

  public getDiscoveredSites(): string[] {
    return this.discoveredSites;
  }

  public getActiveSite(): string | null {
    return this.activeSite;
  }

  public setActiveSite(site: string): void {
    this.activeSite = site;
  }

  public async promptSelectSite(): Promise<string | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (this.discoveredSites.length === 0 && workspaceFolders && workspaceFolders.length > 0) {
      this.discoverSites(workspaceFolders[0].uri.fsPath);
    }

    const items: Array<{ label: string; description?: string; isCustom?: boolean }> = this.discoveredSites.map((s) => ({
      label: s,
      description: s === this.activeSite ? '(Active)' : '',
    }));

    items.push({
      label: '$(plus) Enter Custom Site Name...',
      description: 'Manually specify active site',
      isCustom: true,
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select active Frappe site for Bench commands',
    });

    if (!selected) {
      return null;
    }

    if (selected.isCustom) {
      const customSite = await vscode.window.showInputBox({
        prompt: 'Enter Frappe Site Name',
        placeHolder: 'e.g. sitename.localhost or mysite.com',
      });
      if (customSite && customSite.trim()) {
        const trimmed = customSite.trim();
        if (!this.discoveredSites.includes(trimmed)) {
          this.discoveredSites.push(trimmed);
        }
        this.setActiveSite(trimmed);
        return trimmed;
      }
      return null;
    }

    this.setActiveSite(selected.label);
    return selected.label;
  }
}
