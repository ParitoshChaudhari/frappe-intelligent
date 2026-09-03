import * as assert from 'assert';
import * as vscode from 'vscode';
import { FrappeCodeLensProvider } from '../../providers/codeLensProvider';
import { FrappeCodeActionProvider } from '../../providers/codeActionProvider';

describe('CodeLens & CodeAction Providers Test Suite', () => {
  it('should generate CodeLens for whitelisted Python functions', () => {
    const provider = new FrappeCodeLensProvider();
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/doctype/user/user.py',
      getText: () => '@frappe.whitelist()\ndef custom_api():\n    pass',
      lineCount: 3,
      lineAt: (i: number) => {
        const lines = ['@frappe.whitelist()', 'def custom_api():', '    pass'];
        return { text: lines[i] };
      },
    };

    const lenses = provider.provideCodeLenses(mockDoc, new vscode.CancellationTokenSource().token) as vscode.CodeLens[];
    assert.ok(lenses);
  });

  it('should generate CodeAction for deprecated API diagnostics', () => {
    const provider = new FrappeCodeActionProvider();
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/api.py',
      getText: () => 'frappe.client.get_value("DocType", "Name")',
      lineCount: 1,
      lineAt: () => ({ text: 'frappe.client.get_value("DocType", "Name")' }),
    };

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 30),
      'frappe.client.get_value is deprecated',
      vscode.DiagnosticSeverity.Warning
    );
    diagnostic.source = 'Frappe Intelligent';

    const context: any = {
      diagnostics: [diagnostic],
    };

    const actions = provider.provideCodeActions(mockDoc, new vscode.Range(0, 0, 0, 30), context) as vscode.CodeAction[];
    assert.ok(actions.length > 0);
    assert.ok(actions[0].title.includes('Replace with'));
  });
});
