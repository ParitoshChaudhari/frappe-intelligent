import * as vscode from 'vscode';
import { IndexManager } from './indexer/indexManager';
import { PyStubGenerator } from './stubs/pyStubGenerator';
import { JsStubGenerator } from './stubs/jsStubGenerator';
import { FrappeCompletionProvider } from './providers/completionProvider';
import { FrappeHoverProvider } from './providers/hoverProvider';
import { FrappeSignatureHelpProvider } from './providers/signatureHelpProvider';
import { FrappeDefinitionProvider } from './providers/definitionProvider';
import { FrappeDiagnosticsProvider } from './providers/diagnosticsProvider';
import { FrappeCodeLensProvider } from './providers/codeLensProvider';
import { FrappeCodeActionProvider } from './providers/codeActionProvider';
import { FrappeJinjaCompletionProvider } from './providers/jinjaCompletionProvider';
import { FrappeTreeProvider } from './views/frappeTreeProvider';
import { DocTypePreviewPanel } from './views/docTypePreviewPanel';
import { BenchCommands } from './commands/benchCommands';
import { ScaffoldCommands } from './commands/scaffoldCommands';
import { PythonEnvManager } from './core/pythonEnvManager';
import { SiteManager } from './core/siteManager';
import { FrappeVersion } from './core/types';

let statusBarItem: vscode.StatusBarItem;
let siteStatusBarItem: vscode.StatusBarItem;
let treeProvider: FrappeTreeProvider;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration('frappeIntelligent');
  const defaultVersion = (config.get('defaultFrappeVersion') as FrappeVersion) || 'v15';

  // 1. Initialize Index Manager & Site Manager
  const index = IndexManager.getInstance();
  const benchContext = index.initialize(workspaceRoot, defaultVersion);
  const siteMgr = SiteManager.getInstance();
  siteMgr.discoverSites(benchContext?.benchPath || workspaceRoot);

  // 2. Status Bar Items
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'frappeIntelligent.showVersionInfo';
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  siteStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  siteStatusBarItem.command = 'frappeIntelligent.selectActiveSite';
  updateSiteStatusBar();
  siteStatusBarItem.show();
  context.subscriptions.push(siteStatusBarItem);

  // 3. Register Frappe Explorer TreeView
  treeProvider = new FrappeTreeProvider();
  vscode.window.registerTreeDataProvider('frappeIntelligentView', treeProvider);

  // 4. Auto-Configure Python Environment (Guarded by Workspace Trust)
  if (vscode.workspace.isTrusted && config.get<boolean>('autoConfigurePythonEnv', true)) {
    PythonEnvManager.configureWorkspacePython(benchContext);
  }

  // 5. Register Bench & Scaffold Commands Suite
  BenchCommands.registerCommands(context, () => index.getBenchContext());
  ScaffoldCommands.registerCommands(context, () => index.getBenchContext());

  // 6. Register Language Providers
  const pyJsSelectors: vscode.DocumentSelector = [
    { language: 'python', scheme: 'file' },
    { language: 'javascript', scheme: 'file' },
  ];

  const htmlJinjaSelectors: vscode.DocumentSelector = [
    { language: 'html', scheme: 'file' },
    { language: 'jinja', scheme: 'file' },
  ];

  const completionProvider = new FrappeCompletionProvider();
  const jinjaCompletionProvider = new FrappeJinjaCompletionProvider();
  const hoverProvider = new FrappeHoverProvider();
  const signatureHelpProvider = new FrappeSignatureHelpProvider();
  const definitionProvider = new FrappeDefinitionProvider();
  const diagnosticsProvider = new FrappeDiagnosticsProvider();
  const codeLensProvider = new FrappeCodeLensProvider();
  const codeActionProvider = new FrappeCodeActionProvider();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      pyJsSelectors,
      completionProvider,
      '.',
      '(',
      '"',
      "'",
      '{',
      ','
    ),
    vscode.languages.registerCompletionItemProvider(
      htmlJinjaSelectors,
      jinjaCompletionProvider,
      '.',
      '(',
      '{'
    ),
    vscode.languages.registerHoverProvider(pyJsSelectors, hoverProvider),
    vscode.languages.registerSignatureHelpProvider(
      pyJsSelectors,
      signatureHelpProvider,
      '(',
      ','
    ),
    vscode.languages.registerDefinitionProvider(pyJsSelectors, definitionProvider),
    vscode.languages.registerCodeLensProvider(pyJsSelectors, codeLensProvider),
    vscode.languages.registerCodeActionsProvider(
      pyJsSelectors,
      codeActionProvider,
      { providedCodeActionKinds: FrappeCodeActionProvider.providedCodeActionKinds }
    )
  );

  diagnosticsProvider.register(context);

  // 7. Debounced File Watcher with Path Filtering for Incremental Indexing
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{py,js,json}');
  let watcherDebounceTimer: NodeJS.Timeout | null = null;

  const isIgnoredPath = (fsPath: string) => {
    const normalized = fsPath.replace(/\\/g, '/');
    return (
      normalized.includes('/node_modules/') ||
      normalized.includes('/.git/') ||
      normalized.includes('/__pycache__/') ||
      normalized.includes('/.frappe/typings/') ||
      normalized.includes('/sites/assets/') ||
      normalized.includes('/public/dist/') ||
      normalized.includes('/dist/') ||
      normalized.includes('/build/') ||
      normalized.includes('/logs/') ||
      normalized.includes('/locks/') ||
      normalized.includes('/env/') ||
      normalized.includes('/.venv/')
    );
  };

  const scheduleRefresh = () => {
    if (watcherDebounceTimer) {
      clearTimeout(watcherDebounceTimer);
    }
    watcherDebounceTimer = setTimeout(() => {
      updateStatusBar();
      treeProvider.refresh();
      watcherDebounceTimer = null;
    }, 300);
  };

  fileWatcher.onDidChange((uri) => {
    if (isIgnoredPath(uri.fsPath)) return;
    index.updateFile(uri.fsPath);
    scheduleRefresh();
  });

  fileWatcher.onDidCreate((uri) => {
    if (isIgnoredPath(uri.fsPath)) return;
    index.updateFile(uri.fsPath);
    scheduleRefresh();
  });

  fileWatcher.onDidDelete((uri) => {
    if (isIgnoredPath(uri.fsPath)) return;
    index.removeFile(uri.fsPath);
    scheduleRefresh();
  });

  context.subscriptions.push(fileWatcher);

  // 8. Automatic Stub Generation (if workspace is trusted and configured)
  if (vscode.workspace.isTrusted) {
    generateStubs(workspaceRoot);
  }

  // 9. Register Extension Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('frappeIntelligent.previewDocTypeForm', (uri?: vscode.Uri) => {
      const targetPath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
      if (targetPath && targetPath.endsWith('.json')) {
        DocTypePreviewPanel.createOrShow(context.extensionUri, targetPath);
      } else {
        vscode.window.showWarningMessage('Please open or select a Frappe DocType schema .json file to preview layout.');
      }
    }),

    vscode.commands.registerCommand('frappeIntelligent.updateStatusBarSite', () => {
      updateSiteStatusBar();
    }),

    vscode.commands.registerCommand('frappeIntelligent.refreshTreeView', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('frappeIntelligent.rebuildIndex', () => {
      index.rebuildIndex();
      const bench = index.getBenchContext();
      siteMgr.discoverSites(bench?.benchPath || workspaceRoot);
      generateStubs(workspaceRoot);
      updateStatusBar();
      updateSiteStatusBar();
      treeProvider.refresh();
      vscode.window.showInformationMessage('Frappe workspace index rebuilt successfully.');
    }),

    vscode.commands.registerCommand('frappeIntelligent.generateTypeStubs', () => {
      const paths = generateStubs(workspaceRoot);
      vscode.window.showInformationMessage(`Generated Frappe type stubs in ${paths.pyStubDir}`);
    }),

    vscode.commands.registerCommand('frappeIntelligent.showVersionInfo', () => {
      const bench = index.getBenchContext();
      const doctypes = index.getAllDocTypes();
      const whitelisted = index.getAllWhitelistedMethods();
      const activeSite = siteMgr.getActiveSite() || 'None';

      const appList = bench ? Array.from(bench.apps.keys()).join(', ') : 'None';
      const version = bench?.frappeVersion || defaultVersion;

      vscode.window.showInformationMessage(
        `Frappe Intelligent: Version ${version.toUpperCase()} | Active Site: ${activeSite} | Apps: [${appList}] | DocTypes: ${doctypes.length} | Whitelisted APIs: ${whitelisted.length}`
      );
    })
  );
}

function updateStatusBar(): void {
  const index = IndexManager.getInstance();
  const bench = index.getBenchContext();
  const doctypes = index.getAllDocTypes();
  const version = bench?.frappeVersion || 'v15';
  statusBarItem.text = `$(symbol-class) Frappe ${version.toUpperCase()} (${doctypes.length} DocTypes)`;
  statusBarItem.tooltip = `Frappe Intelligent: ${bench?.apps.size || 0} apps indexed`;
}

function updateSiteStatusBar(): void {
  const siteMgr = SiteManager.getInstance();
  const activeSite = siteMgr.getActiveSite();
  if (activeSite) {
    siteStatusBarItem.text = `$(globe) Site: ${activeSite}`;
    siteStatusBarItem.tooltip = `Active Frappe Site: ${activeSite} (Click to switch)`;
  } else {
    siteStatusBarItem.text = `$(globe) Site: (None)`;
    siteStatusBarItem.tooltip = 'Click to select Frappe site';
  }
}

function generateStubs(workspaceRoot: string): { pyStubDir: string; jsStubDir: string } {
  const config = vscode.workspace.getConfiguration('frappeIntelligent');
  const index = IndexManager.getInstance();
  const doctypes = index.getAllDocTypes();

  let pyStubDir = '';
  let jsStubDir = '';

  if (config.get<boolean>('enablePythonStubs', true)) {
    pyStubDir = PyStubGenerator.writeWorkspaceStubs(workspaceRoot, doctypes);
  }

  if (config.get<boolean>('enableJsStubs', true)) {
    jsStubDir = JsStubGenerator.writeWorkspaceJsTypings(workspaceRoot, doctypes);
  }

  return { pyStubDir, jsStubDir };
}

export function deactivate() {}
