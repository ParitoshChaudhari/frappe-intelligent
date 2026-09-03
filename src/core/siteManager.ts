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

  public discoverSites(benchRoot: string): string[] {
    this.discoveredSites = [];
    const sitesDir = path.join(benchRoot, 'sites');

    if (fs.existsSync(sitesDir)) {
      try {
        const entries = fs.readdirSync(sitesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'assets' && !entry.name.startsWith('.')) {
            const siteConfig = path.join(sitesDir, entry.name, 'site_config.json');
            if (fs.existsSync(siteConfig) || entry.name.includes('.')) {
              this.discoveredSites.push(entry.name);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.discoveredSites.length > 0 && !this.activeSite) {
      // Default to currentsite.txt if present
      const currentSiteTxt = path.join(sitesDir, 'currentsite.txt');
      if (fs.existsSync(currentSiteTxt)) {
        try {
          const site = fs.readFileSync(currentSiteTxt, 'utf8').trim();
          if (this.discoveredSites.includes(site)) {
            this.activeSite = site;
          }
        } catch {
          // ignore
        }
      }

      if (!this.activeSite) {
        this.activeSite = this.discoveredSites[0];
      }
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
    if (this.discoveredSites.length === 0) {
      vscode.window.showInformationMessage('No Frappe sites found in sites/ directory.');
      return null;
    }

    const items = this.discoveredSites.map((s) => ({
      label: s,
      description: s === this.activeSite ? '(Active)' : '',
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select active Frappe site for Bench commands',
    });

    if (selected) {
      this.setActiveSite(selected.label);
      return selected.label;
    }

    return null;
  }
}
