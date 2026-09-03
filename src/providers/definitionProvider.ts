import * as vscode from 'vscode';
import * as fs from 'fs';
import { IndexManager } from '../indexer/indexManager';
import { FileClassifier } from '../context/fileClassifier';

export class FrappeDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_$.]+/);
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const lineText = document.lineAt(position.line).text;
    const fileInfo = FileClassifier.classify(document.fileName, document.getText());
    const index = IndexManager.getInstance();

    // 1. In hooks.py: Check if cursor is on a dotted Python function string (e.g. "my_app.tasks.nightly_sync")
    if (fileInfo.fileType === 'hooks_py' || lineText.includes('.')) {
      const stringLiteralMatch = lineText.match(/["']([a-zA-Z0-9_.]+)["']/);
      if (stringLiteralMatch && (stringLiteralMatch[1] === word || stringLiteralMatch[1].includes(word))) {
        const fullDotted = stringLiteralMatch[1];
        const target = this.resolveDottedPath(fullDotted, index);
        if (target) return target;
      }
    }

    // 2. Check if word is a DocType name -> Jump to DocType JSON schema
    const schema = index.getDocType(word);
    if (schema && schema.filePath) {
      const uri = vscode.Uri.file(schema.filePath);
      return new vscode.Location(uri, new vscode.Position(0, 0));
    }

    // 3. Check if word is a Whitelisted Method name in `frappe.call` -> Jump to Python definition
    const whitelisted = index.getWhitelistedMethod(word);
    if (whitelisted && whitelisted.sourceFile) {
      const uri = vscode.Uri.file(whitelisted.sourceFile);
      const line = (whitelisted.sourceLine || 1) - 1;
      return new vscode.Location(uri, new vscode.Position(line, 0));
    }

    // 4. Check if word is a Python class name
    const pyClass = index.getPyClass(word);
    if (pyClass) {
      const uri = vscode.Uri.file(pyClass.filePath);
      return new vscode.Location(uri, new vscode.Position(pyClass.line - 1, 0));
    }

    // 5. Check if word is an imported module symbol from IndexManager
    const importSymbols = index.getAllImportSymbols();
    const matchingSymbol = importSymbols.find((s) => s.symbolName === word || s.importPath === word);
    if (matchingSymbol && matchingSymbol.sourceFile && fs.existsSync(matchingSymbol.sourceFile)) {
      const uri = vscode.Uri.file(matchingSymbol.sourceFile);
      return new vscode.Location(uri, new vscode.Position(0, 0));
    }

    return null;
  }

  private resolveDottedPath(dottedPath: string, index: IndexManager): vscode.Location | null {
    // e.g. "my_app.tasks.nightly_sync" -> module: "my_app.tasks", function: "nightly_sync"
    const parts = dottedPath.split('.');
    if (parts.length < 2) return null;

    const funcName = parts[parts.length - 1];
    const modPath = parts.slice(0, parts.length - 1).join('.');

    const symbols = index.getAllImportSymbols();
    const sym = symbols.find((s) => (s.importPath === modPath || s.importPath.endsWith(modPath)) && s.symbolName === funcName);
    if (sym && sym.sourceFile && fs.existsSync(sym.sourceFile)) {
      const uri = vscode.Uri.file(sym.sourceFile);
      return new vscode.Location(uri, new vscode.Position(0, 0));
    }

    // Check whitelisted method
    const wm = index.getWhitelistedMethod(dottedPath) || index.getWhitelistedMethod(funcName);
    if (wm && wm.sourceFile && fs.existsSync(wm.sourceFile)) {
      const uri = vscode.Uri.file(wm.sourceFile);
      const line = (wm.sourceLine || 1) - 1;
      return new vscode.Location(uri, new vscode.Position(line, 0));
    }

    return null;
  }
}

