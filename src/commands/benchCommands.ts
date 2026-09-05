import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BenchContext } from '../core/types';
import { SiteManager } from '../core/siteManager';
import { IndexManager } from '../indexer/indexManager';

interface BenchCommandItem {
  label: string;
  command: string;
  category: 'Site Operations' | 'App & Code Operations' | 'Workers & Scheduler' | 'System & Database';
  description: string;
  detail?: string;
  requiresSite?: boolean;
  siteOptional?: boolean;
  requiresApp?: boolean;
  requiresDocType?: boolean;
  needsCustomInput?: {
    prompt: string;
    placeholder: string;
    flagPrefix?: string;
  };
}

/**
 * Handles running Frappe Bench CLI commands, interactive quick-pick runners, and shell completions.
 */
export class BenchCommands {
  private static terminal: vscode.Terminal | null = null;
  private static completionConfiguredInSession = false;

  private static readonly BENCH_COMMANDS_REGISTRY: BenchCommandItem[] = [
    // --- Site Operations ---
    {
      label: '$(trash) bench clear-cache',
      command: 'clear-cache',
      category: 'Site Operations',
      description: 'Clear Redis cache for active or selected site',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(database) bench migrate',
      command: 'migrate',
      category: 'Site Operations',
      description: 'Run database schema migrations and execute pending patches',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(database) bench migrate --skip-failing',
      command: 'migrate --skip-failing',
      category: 'Site Operations',
      description: 'Run database migrations, skipping failing patches',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(terminal) bench console',
      command: 'console',
      category: 'Site Operations',
      description: 'Open interactive IPython shell in site context',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(cloud-download) bench backup',
      command: 'backup --with-files',
      category: 'Site Operations',
      description: 'Backup database and site public/private files',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(cloud-upload) bench restore',
      command: 'restore',
      category: 'Site Operations',
      description: 'Restore site database from an SQL dump file',
      requiresSite: true,
      needsCustomInput: {
        prompt: 'Enter absolute path to .sql or .sql.gz database backup file',
        placeholder: '/path/to/backup.sql.gz',
      },
    },
    {
      label: '$(plus) bench new-site',
      command: 'new-site',
      category: 'Site Operations',
      description: 'Create a new Frappe site with database and Administrator password',
      needsCustomInput: {
        prompt: 'Enter new Frappe Site Name',
        placeholder: 'e.g. mysite.localhost or dev.local',
      },
    },
    {
      label: '$(trash) bench drop-site',
      command: 'drop-site',
      category: 'Site Operations',
      description: 'Permanently delete site database and site folder',
      requiresSite: true,
    },
    {
      label: '$(refresh) bench reinstall',
      command: 'reinstall --yes',
      category: 'Site Operations',
      description: 'Wipe and reinstall site database from scratch',
      requiresSite: true,
    },
    {
      label: '$(key) bench reset-perms',
      command: 'reset-perms',
      category: 'Site Operations',
      description: 'Reset DocType role permissions to standard default definitions',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(lock) bench set-maintenance-mode on',
      command: 'set-maintenance-mode on',
      category: 'Site Operations',
      description: 'Turn on 503 Maintenance Mode for site',
      requiresSite: true,
    },
    {
      label: '$(unlock) bench set-maintenance-mode off',
      command: 'set-maintenance-mode off',
      category: 'Site Operations',
      description: 'Turn off Maintenance Mode for site',
      requiresSite: true,
    },
    {
      label: '$(gear) bench set-config',
      command: 'set-config',
      category: 'Site Operations',
      description: 'Set a key-value in site_config.json',
      requiresSite: true,
      needsCustomInput: {
        prompt: 'Enter configuration key and value (e.g. developer_mode 1)',
        placeholder: 'developer_mode 1',
      },
    },

    // --- App & Code Operations ---
    {
      label: '$(tools) bench build',
      command: 'build',
      category: 'App & Code Operations',
      description: 'Compile and bundle JavaScript and CSS frontend assets with esbuild',
    },
    {
      label: '$(tools) bench build --app',
      command: 'build --app',
      category: 'App & Code Operations',
      description: 'Compile frontend assets for a specific app',
      requiresApp: true,
    },
    {
      label: '$(eye) bench watch',
      command: 'watch',
      category: 'App & Code Operations',
      description: 'Start live frontend asset compiler and file watcher',
    },
    {
      label: '$(refresh) bench restart',
      command: 'restart',
      category: 'App & Code Operations',
      description: 'Restart background worker processes and web servers',
    },
    {
      label: '$(beaker) bench run-tests',
      command: 'run-tests',
      category: 'App & Code Operations',
      description: 'Run unit test suite on active or selected site',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(beaker) bench run-tests --app',
      command: 'run-tests --app',
      category: 'App & Code Operations',
      description: 'Run unit tests for a specific installed app',
      requiresSite: true,
      requiresApp: true,
      siteOptional: true,
    },
    {
      label: '$(beaker) bench run-tests --doctype',
      command: 'run-tests --doctype',
      category: 'App & Code Operations',
      description: 'Run unit tests for a specific DocType',
      requiresSite: true,
      requiresDocType: true,
      siteOptional: true,
    },
    {
      label: '$(code) bench execute',
      command: 'execute',
      category: 'App & Code Operations',
      description: 'Execute a dotted Python function path on site',
      requiresSite: true,
      siteOptional: true,
      needsCustomInput: {
        prompt: 'Enter dotted Python method path to execute',
        placeholder: 'e.g. frappe.utils.doctor.diagnose or my_app.tasks.sync',
      },
    },
    {
      label: '$(plus) bench new-app',
      command: 'new-app',
      category: 'App & Code Operations',
      description: 'Scaffold and create a new Frappe app structure in apps/',
      needsCustomInput: {
        prompt: 'Enter new Frappe App name',
        placeholder: 'e.g. custom_payroll',
      },
    },
    {
      label: '$(cloud-download) bench get-app',
      command: 'get-app',
      category: 'App & Code Operations',
      description: 'Clone and install a Frappe app into apps/ directory',
      needsCustomInput: {
        prompt: 'Enter Git repository URL or Frappe App name',
        placeholder: 'https://github.com/frappe/hrms or hrms',
      },
    },
    {
      label: '$(package) bench install-app',
      command: 'install-app',
      category: 'App & Code Operations',
      description: 'Install an app on target site and run its migrations',
      requiresSite: true,
      requiresApp: true,
    },
    {
      label: '$(package) bench uninstall-app',
      command: 'uninstall-app',
      category: 'App & Code Operations',
      description: 'Uninstall an app from target site and drop its DocType tables',
      requiresSite: true,
      requiresApp: true,
    },
    {
      label: '$(package) bench list-apps',
      command: 'list-apps',
      category: 'App & Code Operations',
      description: 'List installed Frappe apps and versions',
      requiresSite: true,
      siteOptional: true,
    },

    // --- Workers & Scheduler ---
    {
      label: '$(flame) bench start',
      command: 'start',
      category: 'Workers & Scheduler',
      description: 'Start full Frappe development Procfile (web, workers, redis, schedule)',
    },
    {
      label: '$(server-process) bench worker',
      command: 'worker',
      category: 'Workers & Scheduler',
      description: 'Start background RQ job worker',
    },
    {
      label: '$(clock) bench schedule',
      command: 'schedule',
      category: 'Workers & Scheduler',
      description: 'Start background scheduler process for cron hooks',
    },
    {
      label: '$(pulse) bench doctor',
      command: 'doctor',
      category: 'Workers & Scheduler',
      description: 'Run health diagnostics on worker queues and scheduler',
    },
    {
      label: '$(list-unordered) bench show-pending-jobs',
      command: 'show-pending-jobs',
      category: 'Workers & Scheduler',
      description: 'View active and queued background jobs',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(clear-all) bench purge-jobs',
      command: 'purge-jobs',
      category: 'Workers & Scheduler',
      description: 'Purge failed or pending background RQ queue jobs',
      requiresSite: true,
      siteOptional: true,
    },

    // --- System & Database ---
    {
      label: '$(server) bench mariadb',
      command: 'mariadb',
      category: 'System & Database',
      description: 'Open interactive MariaDB / MySQL shell for site database',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(server) bench postgres',
      command: 'postgres',
      category: 'System & Database',
      description: 'Open interactive PostgreSQL psql shell for site database',
      requiresSite: true,
      siteOptional: true,
    },
    {
      label: '$(globe) bench add-to-hosts',
      command: 'add-to-hosts',
      category: 'System & Database',
      description: 'Add site domain name mapping to /etc/hosts',
      requiresSite: true,
    },
  ];

  public static sanitizeSiteName(site: string): string | null {
    const trimmed = site.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(trimmed) || trimmed.length > 255) {
      return null;
    }
    return trimmed;
  }

  public static registerCommands(context: vscode.ExtensionContext, getBench: () => BenchContext | null): void {
    const siteMgr = SiteManager.getInstance();

    context.subscriptions.push(
      // 1. Interactive Bench Command Palette Runner
      vscode.commands.registerCommand('frappeIntelligent.runBenchCommand', async () => {
        const bench = getBench();
        if (!bench) {
          vscode.window.showErrorMessage('No Frappe bench or app workspace detected.');
          return;
        }

        await this.promptRunBenchCommand(bench);
      }),

      // 2. Setup Terminal Shell Autocompletion
      vscode.commands.registerCommand('frappeIntelligent.setupTerminalCompletions', async () => {
        await this.setupTerminalShellCompletion();
      }),

      // 3. Site Selector
      vscode.commands.registerCommand('frappeIntelligent.selectActiveSite', async () => {
        const selected = await siteMgr.promptSelectSite();
        if (selected) {
          vscode.window.showInformationMessage(`Active Frappe Site set to: ${selected}`);
          vscode.commands.executeCommand('frappeIntelligent.updateStatusBarSite');
        }
      }),

      // Direct Bench Commands
      vscode.commands.registerCommand('frappeIntelligent.benchClearCache', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
        const cmd = site ? `bench --site ${site} clear-cache` : 'bench clear-cache';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchMigrate', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
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
        const site = await this.resolveTargetSite(bench, siteMgr);
        const cmd = site ? `bench --site ${site} console` : 'bench console';
        this.runInTerminal(bench.benchPath, cmd, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchBackup', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
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
        const site = await this.resolveTargetSite(bench, siteMgr);
        if (!site) return;
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to completely DROP site ${site}? This will delete the database.`,
          { modal: true },
          'Yes, Drop Site'
        );
        if (confirm === 'Yes, Drop Site') {
          this.runInTerminal(bench.benchPath, `bench drop-site ${site} --force`, true);
        }
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchReinstall', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
        if (!site) return;
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to REINSTALL site ${site}? All existing data will be wiped.`,
          { modal: true },
          'Yes, Reinstall'
        );
        if (confirm === 'Yes, Reinstall') {
          this.runInTerminal(bench.benchPath, `bench --site ${site} reinstall --yes`, true);
        }
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchRestore', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
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
        const site = await this.resolveTargetSite(bench, siteMgr);
        if (!site) return;
        const appName = await this.promptAppName(bench);
        if (!appName) return;
        this.runInTerminal(bench.benchPath, `bench --site ${site} install-app ${appName}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchUninstallApp', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
        if (!site) return;
        const appName = await this.promptAppName(bench);
        if (!appName) return;
        this.runInTerminal(bench.benchPath, `bench --site ${site} uninstall-app ${appName}`, true);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchListApps', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
        const cmd = site ? `bench --site ${site} list-apps` : 'bench list-apps';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchExecute', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
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
        const site = await this.resolveTargetSite(bench, siteMgr);
        const cmd = site ? `bench --site ${site} reset-perms` : 'bench reset-perms';
        this.runInTerminal(bench.benchPath, cmd);
      }),

      vscode.commands.registerCommand('frappeIntelligent.benchRunTests', async () => {
        const bench = getBench();
        if (!bench) return;
        const site = await this.resolveTargetSite(bench, siteMgr);
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

  /**
   * Interactive QuickPick runner for all Frappe Bench commands with auto-suggestions.
   */
  public static async promptRunBenchCommand(bench: BenchContext): Promise<void> {
    const siteMgr = SiteManager.getInstance();
    const activeSite = siteMgr.getActiveSite();

    const items: Array<vscode.QuickPickItem & { cmdItem?: BenchCommandItem; isCustom?: boolean }> = [];

    // Group commands by category
    const categories: Array<BenchCommandItem['category']> = [
      'Site Operations',
      'App & Code Operations',
      'Workers & Scheduler',
      'System & Database',
    ];

    for (const cat of categories) {
      const catCmds = this.BENCH_COMMANDS_REGISTRY.filter((c) => c.category === cat);
      for (const cmd of catCmds) {
        let siteBadge = '';
        if (cmd.requiresSite) {
          siteBadge = activeSite ? ` [--site ${activeSite}]` : ' [--site <required>]';
        } else if (cmd.siteOptional) {
          siteBadge = activeSite ? ` [--site ${activeSite}]` : '';
        }

        items.push({
          label: cmd.label,
          description: cmd.description,
          detail: `Category: ${cmd.category}${siteBadge}`,
          cmdItem: cmd,
        });
      }
    }

    items.push({
      label: '$(terminal) Enter Custom Bench Command...',
      description: 'Run custom bench command with flags in terminal',
      isCustom: true,
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Search & execute Frappe Bench command (e.g. migrate, clear-cache, run-tests, console)...',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) return;

    if (selected.isCustom) {
      const customCmd = await vscode.window.showInputBox({
        prompt: 'Enter bench command to run in terminal',
        value: activeSite ? `bench --site ${activeSite} ` : 'bench ',
        placeHolder: 'e.g. bench --site devsite migrate --skip-failing',
      });
      if (customCmd && customCmd.trim()) {
        this.runInTerminal(bench.benchPath, customCmd.trim(), true);
      }
      return;
    }

    const cmdItem = selected.cmdItem;
    if (!cmdItem) return;

    let finalCmd = `bench ${cmdItem.command}`;
    let targetSite: string | null = null;

    if (cmdItem.requiresSite || (cmdItem.siteOptional && activeSite)) {
      targetSite = await this.resolveTargetSite(bench, siteMgr, !cmdItem.requiresSite);
      if (cmdItem.requiresSite && !targetSite) {
        vscode.window.showErrorMessage('A valid site is required for this command.');
        return;
      }
    }

    // Handle App parameter
    if (cmdItem.requiresApp) {
      const appName = await this.promptAppName(bench);
      if (!appName) return;
      if (cmdItem.command.includes('--app')) {
        finalCmd = `bench ${cmdItem.command} ${appName}`;
      } else {
        finalCmd = `bench ${cmdItem.command} ${appName}`;
      }
    }

    // Handle DocType parameter
    if (cmdItem.requiresDocType) {
      const dtName = await this.promptDocTypeName();
      if (!dtName) return;
      finalCmd = `bench ${cmdItem.command} "${dtName}"`;
    }

    // Handle custom input
    if (cmdItem.needsCustomInput) {
      const input = await vscode.window.showInputBox({
        prompt: cmdItem.needsCustomInput.prompt,
        placeHolder: cmdItem.needsCustomInput.placeholder,
      });
      if (!input) return;
      finalCmd = `bench ${cmdItem.command} ${input.trim()}`;
    }

    if (targetSite) {
      if (finalCmd.startsWith('bench ')) {
        const subcommand = finalCmd.substring(6);
        finalCmd = `bench --site ${targetSite} ${subcommand}`;
      }
    }

    this.runInTerminal(bench.benchPath, finalCmd, true);
  }

  private static async resolveTargetSite(
    bench: BenchContext,
    siteMgr: SiteManager,
    isOptional = false
  ): Promise<string | null> {
    const discovered = siteMgr.discoverSites(bench.benchPath);
    const activeSite = siteMgr.getActiveSite();

    if (activeSite && !isOptional) {
      return this.sanitizeSiteName(activeSite);
    }

    if (discovered.length === 1) {
      return this.sanitizeSiteName(discovered[0]);
    }

    if (discovered.length > 1) {
      const pickItems = discovered.map((s) => ({
        label: s,
        description: s === activeSite ? '(Active Site)' : '',
      }));

      if (isOptional) {
        pickItems.unshift({
          label: '$(dash) Run without --site flag (Global/Bench default)',
          description: '',
        });
      }

      const picked = await vscode.window.showQuickPick(pickItems, {
        placeHolder: 'Select Frappe site for command execution',
      });

      if (!picked) return null;
      if (picked.label.startsWith('$(dash)')) return null;
      return this.sanitizeSiteName(picked.label);
    }

    const manualSite = await vscode.window.showInputBox({
      prompt: 'Enter Frappe Site name (leave blank for default)',
      placeHolder: 'e.g. sitename.localhost',
    });

    return manualSite ? this.sanitizeSiteName(manualSite) : null;
  }

  private static async promptAppName(bench: BenchContext): Promise<string | null> {
    const appsDir = path.join(bench.benchPath, 'apps');
    let installedApps: string[] = [];

    if (fs.existsSync(appsDir)) {
      try {
        installedApps = fs.readdirSync(appsDir).filter((name) => {
          return !name.startsWith('.') && fs.statSync(path.join(appsDir, name)).isDirectory();
        });
      } catch {
        // ignore
      }
    }

    if (installedApps.length > 0) {
      const items = installedApps.map((a) => ({ label: a, description: 'Installed Frappe App' }));
      items.push({ label: '$(edit) Enter custom app name...', description: '' });

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select Frappe App',
      });

      if (!picked) return null;
      if (picked.label.startsWith('$(edit)')) {
        const custom = await vscode.window.showInputBox({
          prompt: 'Enter app name',
          placeHolder: 'e.g. hrms',
        });
        return custom?.trim() || null;
      }
      return picked.label;
    }

    const input = await vscode.window.showInputBox({
      prompt: 'Enter app name',
      placeHolder: 'e.g. hrms',
    });
    return input?.trim() || null;
  }

  private static async promptDocTypeName(): Promise<string | null> {
    const index = IndexManager.getInstance();
    const docTypes = index.getAllDocTypes();

    if (docTypes.length > 0) {
      const items = docTypes.map((dt) => ({
        label: dt.name,
        description: `Module: ${dt.module || 'Core'}`,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select DocType for unit test / command',
      });
      return picked ? picked.label : null;
    }

    const input = await vscode.window.showInputBox({
      prompt: 'Enter DocType name',
      placeHolder: 'e.g. Employee or Sales Invoice',
    });
    return input?.trim() || null;
  }

  /**
   * Configures shell auto-completion for bench in ~/.zshrc or ~/.bashrc.
   */
  public static async setupTerminalShellCompletion(): Promise<void> {
    const homeDir = os.homedir();
    const userShell = process.env.SHELL || '';
    const isZsh = userShell.includes('zsh');
    const isBash = userShell.includes('bash');
    const isFish = userShell.includes('fish');

    let rcFile = path.join(homeDir, '.zshrc');
    let completionHook = 'eval "$(_BENCH_COMPLETE=zsh_source bench)"';

    if (isFish) {
      rcFile = path.join(homeDir, '.config', 'fish', 'config.fish');
      completionHook = 'eval (env _BENCH_COMPLETE=fish_source bench)';
    } else if (isBash) {
      const bashrc = path.join(homeDir, '.bashrc');
      const bashProfile = path.join(homeDir, '.bash_profile');
      rcFile = fs.existsSync(bashrc) ? bashrc : fs.existsSync(bashProfile) ? bashProfile : bashrc;
      completionHook = 'eval "$(_BENCH_COMPLETE=bash_source bench)"';
    }

    if (fs.existsSync(rcFile)) {
      try {
        const content = fs.readFileSync(rcFile, 'utf8');
        if (content.includes('_BENCH_COMPLETE=')) {
          vscode.window.showInformationMessage(
            `Bench CLI shell autocompletion is already configured in ${path.basename(rcFile)}.`
          );
          return;
        }
      } catch {
        // ignore
      }
    }

    const confirm = await vscode.window.showInformationMessage(
      `Enable Bench <Tab> CLI auto-completion in terminal shell? This will add '${completionHook}' to ${path.basename(rcFile)}.`,
      'Enable Auto-completion',
      'Cancel'
    );

    if (confirm === 'Enable Auto-completion') {
      try {
        const block = `\n# Frappe Bench CLI Auto-completion (Frappe Intelligent)\nif command -v bench >/dev/null 2>&1; then\n  ${completionHook}\nfi\n`;
        fs.appendFileSync(rcFile, block, 'utf8');
        vscode.window.showInformationMessage(
          `Bench auto-completion added to ${path.basename(rcFile)}! Restart your terminal or run source ~/${path.basename(rcFile)} to activate.`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to write to ${rcFile}: ${err?.message || err}`);
      }
    }
  }

  public static runInTerminal(cwd: string, command: string, focus = false): void {
    if (!this.terminal || this.terminal.exitStatus !== undefined) {
      this.terminal = vscode.window.createTerminal({
        name: 'Frappe Bench',
        cwd,
      });

      // Inject interactive shell completion for active session
      if (!this.completionConfiguredInSession) {
        const shell = process.env.SHELL || '';
        const sourceCmd = shell.includes('zsh')
          ? 'eval "$(_BENCH_COMPLETE=zsh_source bench 2>/dev/null)"'
          : 'eval "$(_BENCH_COMPLETE=bash_source bench 2>/dev/null)"';
        this.terminal.sendText(`if command -v bench >/dev/null 2>&1; then ${sourceCmd}; fi`, true);
        this.completionConfiguredInSession = true;
      }
    }

    this.terminal.show(!focus);
    this.terminal.sendText(command);
  }
}
