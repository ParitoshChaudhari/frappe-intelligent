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
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  ThemeIcon: class {
    constructor(id) {
      this.id = id;
    }
  },
  EventEmitter: class {
    constructor() {
      this.event = () => {};
    }
    fire() {}
  },
  workspace: {
    getConfiguration: () => ({
      get: () => true,
      update: () => Promise.resolve(),
    }),
    workspaceFolders: [],
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
    showInputBox: () => Promise.resolve(''),
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
  },
  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerHoverProvider: () => ({ dispose: () => {} }),
    registerSignatureHelpProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    createDiagnosticCollection: () => ({
      delete: () => {},
      set: () => {},
    }),
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
  },
  CompletionItem: class {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
    }
  },
  MarkdownString: class {
    constructor(val = '') {
      this.value = val;
    }
    appendMarkdown(str) {
      this.value += str;
    }
    appendCodeblock(str, lang) {
      this.value += `\n\`\`\`${lang}\n${str}\n\`\`\`\n`;
    }
  },
  SnippetString: class {
    constructor(val = '') {
      this.value = val;
    }
  },
  Diagnostic: class {
    constructor(range, message, severity) {
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
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  Range: class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  Location: class {
    constructor(uri, position) {
      this.uri = uri;
      this.position = position;
    }
  },
  Uri: {
    file: (f) => ({ fsPath: f }),
  },
  ConfigurationTarget: {
    Workspace: 2,
  },
  StatusBarAlignment: {
    Right: 2,
  },
};

Module.prototype.require = function (id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};
