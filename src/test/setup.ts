// Lightweight vscode mock for standalone unit testing under mocha
const Module = require('module');
const originalRequire = Module.prototype.require;

const mockVscode = {
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  TreeItem: class {
    label: string;
    collapsibleState: number;
    description?: string;
    tooltip?: string;
    iconPath?: any;
    command?: any;
    contextValue?: string;
    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  ThemeIcon: class {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
  EventEmitter: class {
    event: () => void = () => {};
    fire(): void {}
  },
  Hover: class {
    contents: any[];
    range?: any;
    constructor(contents: any, range?: any) {
      this.contents = Array.isArray(contents) ? contents : [contents];
      this.range = range;
    }
  },
  SignatureHelp: class {
    signatures: any[] = [];
    activeSignature = 0;
    activeParameter = 0;
  },
  SignatureInformation: class {
    label: string;
    documentation?: any;
    parameters: any[] = [];
    constructor(label: string, documentation?: any) {
      this.label = label;
      this.documentation = documentation;
    }
  },
  ParameterInformation: class {
    label: string;
    documentation?: any;
    constructor(label: string, documentation?: any) {
      this.label = label;
      this.documentation = documentation;
    }
  },
  workspace: {
    getConfiguration: () => ({
      get: () => true,
      update: () => Promise.resolve(),
    }),
    workspaceFolders: [],
    asRelativePath: (p: string) => p,
    openTextDocument: (path: string) => Promise.resolve({ fileName: path }),
    createFileSystemWatcher: () => ({
      onDidChange: () => {},
      onDidCreate: () => {},
      onDidDelete: () => {},
    }),
  },
  window: {
    createStatusBarItem: () => ({
      show: () => {},
      tooltip: '',
      text: '',
    }),
    registerTreeDataProvider: () => {},
    createTerminal: () => ({
      show: () => {},
      sendText: () => {},
    }),
    showInformationMessage: () => {},
    showWarningMessage: () => {},
    showInputBox: () => Promise.resolve(''),
    showQuickPick: () => Promise.resolve(null),
    showTextDocument: () => Promise.resolve(),
    createWebviewPanel: () => ({
      webview: { html: '' },
      title: '',
      reveal: () => {},
      dispose: () => {},
      onDidDispose: () => {},
    }),
    activeTextEditor: undefined,
  },
  ViewColumn: {
    Beside: -2,
    One: 1,
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve(),
  },
  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerHoverProvider: () => ({ dispose: () => {} }),
    registerSignatureHelpProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    registerCodeLensProvider: () => ({ dispose: () => {} }),
    registerCodeActionsProvider: () => ({ dispose: () => {} }),
    createDiagnosticCollection: () => {
      const storage = new Map<string, any[]>();
      return {
        delete: (uri: any) => storage.delete(uri?.toString?.() || uri),
        set: (uri: any, diags: any[]) => storage.set(uri?.toString?.() || uri, diags),
        get: (uri: any) => storage.get(uri?.toString?.() || uri) || [],
      };
    },
  },
  CompletionItemKind: {
    Method: 0,
    Function: 1,
    Field: 2,
    Variable: 3,
    Class: 4,
    Module: 5,
    Property: 6,
    Value: 7,
    Snippet: 8,
  },
  CompletionItem: class {
    label: string;
    kind: number;
    detail?: string;
    documentation?: any;
    insertText?: any;
    constructor(label: string, kind: number) {
      this.label = label;
      this.kind = kind;
    }
  },
  MarkdownString: class {
    value: string;
    constructor(val = '') {
      this.value = val;
    }
    appendMarkdown(str: string) {
      this.value += str;
    }
    appendCodeblock(str: string, lang: string) {
      this.value += `\n\`\`\`${lang}\n${str}\n\`\`\`\n`;
    }
  },
  SnippetString: class {
    value: string;
    constructor(val = '') {
      this.value = val;
    }
  },
  Diagnostic: class {
    range: any;
    message: string;
    severity: number;
    source?: string;
    constructor(range: any, message: string, severity: number) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  CodeLens: class {
    range: any;
    command?: any;
    constructor(range: any, command?: any) {
      this.range = range;
      this.command = command;
    }
  },
  CodeAction: class {
    title: string;
    kind?: any;
    diagnostics?: any[];
    isPreferred?: boolean;
    constructor(title: string, kind?: any) {
      this.title = title;
      this.kind = kind;
    }
  },
  CodeActionKind: {
    QuickFix: 'quickfix',
  },
  CancellationTokenSource: class {
    token: any = {};
  },
  Position: class {
    line: number;
    character: number;
    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  },
  Range: class {
    start: any;
    end: any;
    constructor(start: any, end: any) {
      this.start = start;
      this.end = end;
    }
  },
  Location: class {
    uri: any;
    position: any;
    constructor(uri: any, position: any) {
      this.uri = uri;
      this.position = position;
    }
  },
  Uri: {
    file: (f: string) => ({ fsPath: f }),
  },
  ConfigurationTarget: {
    Workspace: 2,
  },
  StatusBarAlignment: {
    Right: 2,
  },
};

Module.prototype.require = function (this: any, id: string) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};
