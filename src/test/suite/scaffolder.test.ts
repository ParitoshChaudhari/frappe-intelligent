import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScaffoldCommands } from '../../commands/scaffoldCommands';
import { FrappeJinjaCompletionProvider } from '../../providers/jinjaCompletionProvider';

describe('Scaffolding Commands Test Suite', () => {
  it('should generate valid Script Report Python boilerplate', () => {
    const py = ScaffoldCommands.generateReportPy('Monthly Sales', 'Sales Invoice');
    assert.ok(py.includes('def execute(filters=None):'));
    assert.ok(py.includes('frappe.get_all'));
    assert.ok(py.includes('"Sales Invoice"'));
  });

  it('should generate valid Script Report JS filter boilerplate', () => {
    const js = ScaffoldCommands.generateReportJs('Monthly Sales', 'Sales Invoice');
    assert.ok(js.includes('frappe.query_reports["Monthly Sales"]'));
    assert.ok(js.includes('filters: ['));
  });

  it('should escape malicious characters and quotes in generated templates', () => {
    const py = ScaffoldCommands.generateReportPy('Report" Injection\n', 'DocType" Injection\n');
    assert.ok(!py.includes('DocType" Injection\n'));
    assert.ok(py.includes('\\"'));

    const js = ScaffoldCommands.generateReportJs('Report" Injection\n', 'DocType');
    assert.ok(js.includes('\\"'));

    const html = ScaffoldCommands.generatePageHtml('Page <script>alert(1)</script>');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
  });
});

describe('FrappeJinjaCompletionProvider Test Suite', () => {
  const provider = new FrappeJinjaCompletionProvider();

  it('should provide Jinja frappe helpers', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/templates/print.html',
      getText: () => '{{ frappe.',
      lineAt: () => ({ text: '{{ frappe.' }),
    };

    const position = new vscode.Position(0, '{{ frappe.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('format'));
    assert.ok(labels.includes('db.get_value'));
    assert.ok(labels.includes('get_doc'));
  });
});
