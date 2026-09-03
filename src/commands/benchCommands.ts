import * as vscode from 'vscode';
import * as fs from 'fs';
import { BenchContext } from '../core/types';
import { SiteManager } from '../core/siteManager';

/**
 * Handles running Frappe Bench CLI commands and opening interactive terminals with strict input validation.
 */
export class BenchCommands {
  private static terminal: vscode.Terminal | null = null;

  public static sanitizeSiteName(site: string): string | null {
    const trimmed = site.trim();
    // Only allow alphanumeric prefix followed by alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(trimmed) || trimmed.length > 255) {
      return null;
    }
    return trimmed;
  }

  public static registerCommands(context: vscode.ExtensionContext, getBench: () => BenchContext | null): void {
    const siteMgr = SiteManager.getInstance();

    context.subscriptions.push(
      vscode.commands.registerCommand('frappeIntelligent.selectActiveSite', async () => {
        const selected = await siteMgr.promptSelectSite();
        if (selected) {
          vscode.window.showInformationMessage(`Active Frappe Site set to: ${selected}`);
          vscode.commands.executeCommand('frappeIntelligent.updateStatusBarSite');
        }
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchClearCache', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (rawSite && !site) {
          vscode.window.showErrorMessage('Invalid site name. Site names must only contain alphanumeric characters, hyphens, dots, and underscores.');
          return;
        }
        const cmd = site ? `bench --site ${site} clear-cache` : 'bench clear-cache';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchMigrate', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (rawSite && !site) {
          vscode.window.showErrorMessage('Invalid site name.');
          return;
        }
        const cmd = site ? `bench --site ${site} migrate` : 'bench migrate';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchRestart', () => {
        const bench = getBench();
        if (!bench) return;
        this.runInTerminal(bench.benchPath, 'bench restart');
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchBuild', () => {
        const bench = getBench();
        if (!bench) return;
        this.runInTerminal(bench.benchPath, 'bench build');
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchConsole', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (rawSite && !site) {
          vscode.window.showErrorMessage('Invalid site name.');
          return;
        }
        const cmd = site ? `bench --site ${site} console` : 'bench console';
        this.runInTerminal(bench.benchPath, cmd, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchBackup', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (rawSite && !site) {
          vscode.window.showErrorMessage('Invalid site name.');
          return;
        }
        const cmd = site ? `bench --site ${site} backup --with-files` : 'bench backup --with-files';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchNewSite', async () => {
        const bench = getBench();
        if (!bench) return;
        const siteName = await vscode.window.showInputBox({
          prompt: 'Enter New Site Name',
          placeHolder: 'e.g. mysite.localhost',
        });
        if (!siteName) return;
        const sanitized = this.sanitizeSiteName(siteName);
        if (!sanitized) {
          vscode.window.showErrorMessage('Invalid site name.');
          return;
        }
        this.runInTerminal(bench.benchPath, `bench new-site ${sanitized}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchDropSite', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (!site) return;
        const confirm = await vscode.window.showWarningMessage(`Are you sure you want to completely DROP site ${site}? This will delete the database.`, { modal: true }, 'Yes, Drop Site');
        if (confirm === 'Yes, Drop Site') {
          this.runInTerminal(bench.benchPath, `bench drop-site ${site} --force`, true);
        }
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchReinstall', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (!site) return;
        const confirm = await vscode.window.showWarningMessage(`Are you sure you want to REINSTALL site ${site}? All existing data will be wiped.`, { modal: true }, 'Yes, Reinstall');
        if (confirm === 'Yes, Reinstall') {
          this.runInTerminal(bench.benchPath, `bench --site ${site} reinstall --yes`, true);
        }
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchRestore', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (!site) return;
        const backupPath = await vscode.window.showInputBox({
          prompt: 'Enter path to .sql.gz or .sql database backup file',
          placeHolder: '/path/to/backup.sql.gz',
        });
        if (!backupPath) return;
        this.runInTerminal(bench.benchPath, `bench --site ${site} restore "${backupPath}" --with-public-files --with-private-files`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchNewApp', async () => {
        const bench = getBench();
        if (!bench) return;
        const appName = await vscode.window.showInputBox({
          prompt: 'Enter New Frappe App Name',
          placeHolder: 'e.g. custom_payroll',
        });
        if (!appName) return;
        this.runInTerminal(bench.benchPath, `bench new-app ${appName}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchGetApp', async () => {
        const bench = getBench();
        if (!bench) return;
        const repoUrl = await vscode.window.showInputBox({
          prompt: 'Enter Git Repository URL or Frappe App name',
          placeHolder: 'https://github.com/frappe/hrms or hrms',
        });
        if (!repoUrl) return;
        this.runInTerminal(bench.benchPath, `bench get-app "${repoUrl}"`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchInstallApp', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (!site) return;
        const appName = await vscode.window.showInputBox({
          prompt: 'Enter Frappe App name to install on site',
          placeHolder: 'e.g. hrms',
        });
        if (!appName) return;
        this.runInTerminal(bench.benchPath, `bench --site ${site} install-app ${appName}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchUninstallApp', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        if (!site) return;
        const appName = await vscode.window.showInputBox({
          prompt: 'Enter Frappe App name to uninstall from site',
          placeHolder: 'e.g. custom_app',
        });
        if (!appName) return;
        this.runInTerminal(bench.benchPath, `bench --site ${site} uninstall-app ${appName}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchListApps', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        const cmd = site ? `bench --site ${site} list-apps` : 'bench list-apps';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchExecute', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        const method = await vscode.window.showInputBox({
          prompt: 'Enter Dotted Python Method Path to execute',
          placeHolder: 'e.g. frappe.utils.doctor.diagnose or my_app.tasks.sync',
        });
        if (!method) return;
        const cmd = site ? `bench --site ${site} execute ${method}` : `bench execute ${method}`;
        this.runInTerminal(bench.benchPath, cmd, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchDoctor', () => {
        const bench = getBench();
        if (!bench) return;
        this.runInTerminal(bench.benchPath, 'bench doctor');
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchResetPerms', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        const cmd = site ? `bench --site ${site} reset-perms` : 'bench reset-perms';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchRunTests', async () => {
        const bench = getBench();
        if (!bench) return;
        const rawSite = siteMgr.getActiveSite() || (await this.promptSiteName(bench));
        const site = rawSite ? this.sanitizeSiteName(rawSite) : null;
        const appOrDocType = await vscode.window.showInputBox({
          prompt: 'Enter App name or DocType to run tests for (leave blank for all)',
          placeHolder: 'e.g. --app hrms or --doctype Employee',
        });
        const filterFlag = appOrDocType ? ` ${appOrDocType}` : '';
        const cmd = site ? `bench --site ${site} run-tests${filterFlag}` : `bench run-tests${filterFlag}`;
        this.runInTerminal(bench.benchPath, cmd, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.openDocTypeFile', (filePath: string) => {
        if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
          vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      })
    );
  }


  private static async promptSiteName(bench: BenchContext): Promise<string | undefined> {
    const siteInput = await vscode.window.showInputBox({
      prompt: 'Enter Frappe site name (leave blank for default)',
      placeHolder: 'e.g. sitename.localhost or all',
    });
    return siteInput?.trim() ? siteInput.trim() : undefined;
  }

  public static runInTerminal(cwd: string, command: string, focus = false): void {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({
        name: 'Frappe Bench',
        cwd,
      });
    }

    this.terminal.show(!focus);
    this.terminal.sendText(command);
  }
}
