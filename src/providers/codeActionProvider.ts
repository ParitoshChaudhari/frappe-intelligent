import * as vscode from 'vscode';
import { DeprecationMatrix } from '../indexer/deprecationMatrix';
import { IndexManager } from '../indexer/indexManager';
import { FrappeVersion } from '../core/types';

export class FrappeCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];
    const index = IndexManager.getInstance();
    const bench = index.getBenchContext();
    const version: FrappeVersion = bench?.frappeVersion || 'v15';

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'Frappe Intelligent') continue;

      const line = document.lineAt(diagnostic.range.start.line);
      const deprecations = DeprecationMatrix.getDeprecationsForVersion(version, line.text);

      for (const dep of deprecations) {
        if (dep.replacement) {
          const action = new vscode.CodeAction(
            `Fix Frappe Deprecation: Replace with ${dep.replacement}`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [diagnostic];
          action.isPreferred = true;
          actions.push(action);
        }
      }
    }

    return actions;
  }
}
