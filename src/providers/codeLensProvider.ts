import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileClassifier } from '../context/fileClassifier';
import { IndexManager } from '../indexer/indexManager';

export class FrappeCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    const fileInfo = FileClassifier.classify(document.fileName, document.getText());
    const index = IndexManager.getInstance();

    const dir = path.dirname(document.fileName);
    const base = path.basename(document.fileName, path.extname(document.fileName));

    // Fast non-blocking file checker using in-memory Set from IndexManager
    const checkFile = (fp: string) => index.hasFile(fp);

    // 1. Python Document Controller: Show links to JS and JSON
    if (fileInfo.isServerCode && fileInfo.fileType === 'doctype_controller_py') {
      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const classMatch = line.text.match(/^class\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:/);

        if (classMatch) {
          const range = new vscode.Range(i, 0, i, line.text.length);

          const jsFile = path.join(dir, `${base}.js`);
          if (checkFile(jsFile)) {
            lenses.push(
              new vscode.CodeLens(range, {
                title: '⚡ Open Client Script (.js)',
                command: 'frappeIntelligent.openDocTypeFile',
                arguments: [jsFile],
              })
            );
          }

          const jsonFile = path.join(dir, `${base}.json`);
          if (checkFile(jsonFile)) {
            lenses.push(
              new vscode.CodeLens(range, {
                title: '📄 Open Schema (.json)',
                command: 'frappeIntelligent.openDocTypeFile',
                arguments: [jsonFile],
              })
            );
          }
        }

        // Whitelisted backend endpoints
        if (line.text.includes('@frappe.whitelist')) {
          const nextLine = document.lineAt(Math.min(i + 1, document.lineCount - 1));
          const funcMatch = nextLine.text.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
          if (funcMatch) {
            const funcName = funcMatch[1];
            const range = new vscode.Range(i, 0, i, line.text.length);
            lenses.push(
              new vscode.CodeLens(range, {
                title: `🌐 Whitelisted API: ${funcName}`,
                command: 'frappeIntelligent.showVersionInfo',
              })
            );
          }
        }
      }
    }

    // 2. Client JavaScript: Show link to Python Controller
    if (fileInfo.isClientCode && fileInfo.fileType === 'doctype_form_js') {
      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const formOnMatch = line.text.match(/frappe\.ui\.form\.on\s*\(\s*["']([^"']+)["']/);

        if (formOnMatch) {
          const range = new vscode.Range(i, 0, i, line.text.length);
          const pyFile = path.join(dir, `${base}.py`);

          if (checkFile(pyFile)) {
            lenses.push(
              new vscode.CodeLens(range, {
                title: '🐍 Open Controller (.py)',
                command: 'frappeIntelligent.openDocTypeFile',
                arguments: [pyFile],
              })
            );
          }

          const jsonFile = path.join(dir, `${base}.json`);
          if (checkFile(jsonFile)) {
            lenses.push(
              new vscode.CodeLens(range, {
                title: '📄 Open Schema (.json)',
                command: 'frappeIntelligent.openDocTypeFile',
                arguments: [jsonFile],
              })
            );
          }
        }
      }
    }

    return lenses;
  }
}
