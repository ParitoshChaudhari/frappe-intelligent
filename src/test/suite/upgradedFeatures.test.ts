import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScopeAnalyzer } from '../../context/scopeAnalyzer';
import { FileClassifier } from '../../context/fileClassifier';
import { IndexManager } from '../../indexer/indexManager';
import { DocTypeSchema } from '../../core/types';
import { PyStubGenerator } from '../../stubs/pyStubGenerator';
import { JsStubGenerator } from '../../stubs/jsStubGenerator';
import { ScaffoldCommands } from '../../commands/scaffoldCommands';
import { FrappeDiagnosticsProvider } from '../../providers/diagnosticsProvider';
import { FrappeCompletionProvider } from '../../providers/completionProvider';

describe('Upgraded Frappe Intelligent Features Test Suite', () => {
  beforeEach(() => {
    const index = IndexManager.getInstance();
    // Register mock parent and child doctypes
    const itemChildSchema: DocTypeSchema = {
      name: 'Sales Order Item',
      module: 'Selling',
      istable: 1,
      fields: [
        { fieldname: 'item_code', label: 'Item Code', fieldtype: 'Link', reqd: 1 },
        { fieldname: 'qty', label: 'Quantity', fieldtype: 'Float', reqd: 1 },
        { fieldname: 'rate', label: 'Rate', fieldtype: 'Currency', reqd: 1 },
        { fieldname: 'amount', label: 'Amount', fieldtype: 'Currency', read_only: 1 }
      ]
    };

    const salesOrderSchema: DocTypeSchema = {
      name: 'Sales Order',
      module: 'Selling',
      fields: [
        { fieldname: 'customer', label: 'Customer', fieldtype: 'Link', options: 'Customer', reqd: 1 },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', options: 'Sales Order Item' },
        { fieldname: 'grand_total', label: 'Grand Total', fieldtype: 'Currency' }
      ],
      child_tables: new Map([['items', 'Sales Order Item']]),
      link_fields: new Map([['customer', 'Customer']])
    };

    (index as any).allDocTypes.set('Sales Order Item', itemChildSchema);
    (index as any).allDocTypes.set('sales_order_item', itemChildSchema);
    (index as any).allDocTypes.set('Sales Order', salesOrderSchema);
    (index as any).allDocTypes.set('sales_order', salesOrderSchema);
  });

  it('should reconstruct multi-line call context in ScopeAnalyzer', () => {
    const multiLineCode = `frappe.db.get_value(
    "Sales Order",
    filters,
    "`;

    const fileInfo = FileClassifier.classify('sales_order.py', multiLineCode);
    const scope = ScopeAnalyzer.analyze('    "', 5, fileInfo, multiLineCode, 3);

    assert.strictEqual(scope.callContext?.callee, 'frappe.db.get_value');
    assert.strictEqual(scope.callContext?.argIndex, 2);
    assert.strictEqual(scope.targetDocTypeInCall, 'Sales Order');
    assert.strictEqual(scope.isInsideQuotes, true);
  });

  it('should infer child table DocType from Python for-loop in ScopeAnalyzer', () => {
    const pythonCode = `class SalesOrder(Document):
    def validate(self):
        for item in self.items:
            item.`;

    const fileInfo = FileClassifier.classify('apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.py', pythonCode);
    const scope = ScopeAnalyzer.analyze('            item.', 17, fileInfo, pythonCode);

    assert.strictEqual(scope.targetObject, 'item');
    assert.strictEqual(scope.childTableRowDocType, 'Sales Order Item');
  });

  it('should infer child table DocType from JS add_child in ScopeAnalyzer', () => {
    const jsCode = `frappe.ui.form.on('Sales Order', {
    refresh(frm) {
        let row = frm.add_child('items');
        row.
    }
});`;

    const fileInfo = FileClassifier.classify('apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.js', jsCode);
    const scope = ScopeAnalyzer.analyze('        row.', 12, fileInfo, jsCode);

    assert.strictEqual(scope.targetObject, 'row');
    assert.strictEqual(scope.childTableRowDocType, 'Sales Order Item');
  });

  it('should provide completions for frm.fields_dict', () => {
    const provider = new FrappeCompletionProvider();
    const doc = {
      fileName: 'apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.js',
      languageId: 'javascript',
      lineAt: () => ({ text: 'frm.fields_dict.' }),
      getText: () => "frappe.ui.form.on('Sales Order', { refresh(frm) { frm.fields_dict. } });"
    } as any;

    const items = provider.provideCompletionItems(doc, new vscode.Position(0, 16)) as vscode.CompletionItem[];
    assert.ok(Array.isArray(items));
    assert.ok(items.some((item) => item.label === 'customer'));
    assert.ok(items.some((item) => item.label === 'items'));
  });

  it('should flag N+1 database queries in Python loop with diagnostics', () => {
    const provider = new FrappeDiagnosticsProvider();
    const badCode = `def process_orders(orders):
    for order in orders:
        data = frappe.db.get_value("Sales Order", order.name, "grand_total")
`;

    const lines = badCode.split('\n');
    const doc = {
      uri: vscode.Uri.file('/mock/apps/erpnext/erpnext/orders.py'),
      fileName: '/mock/apps/erpnext/erpnext/orders.py',
      languageId: 'python',
      lineCount: lines.length,
      lineAt: (i: number) => ({ text: lines[i], range: new vscode.Range(i, 0, i, lines[i].length) }),
      getText: () => badCode,
    } as any;

    provider.analyzeDocument(doc);
    const diagnostics = (provider as any).diagnosticCollection.get(doc.uri) as vscode.Diagnostic[];

    assert.ok(diagnostics && diagnostics.length > 0);
    assert.ok(diagnostics.some((d) => d.message.includes('N+1 Query')));
  });

  it('should flag recursive save() in validate hook with error diagnostic', () => {
    const provider = new FrappeDiagnosticsProvider();
    const badCode = `class SalesOrder(Document):
    def validate(self):
        self.save()
`;

    const lines = badCode.split('\n');
    const doc = {
      uri: vscode.Uri.file('/mock/apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.py'),
      fileName: '/mock/apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.py',
      languageId: 'python',
      lineCount: lines.length,
      lineAt: (i: number) => ({ text: lines[i], range: new vscode.Range(i, 0, i, lines[i].length) }),
      getText: () => badCode,
    } as any;

    provider.analyzeDocument(doc);
    const diagnostics = (provider as any).diagnosticCollection.get(doc.uri) as vscode.Diagnostic[];

    assert.ok(diagnostics && diagnostics.length > 0);
    assert.ok(diagnostics.some((d) => d.message.includes('Infinite Recursion Warning')));
  });

  it('should generate strongly-typed child tables in PyStubGenerator', () => {
    const index = IndexManager.getInstance();
    const schema = index.getDocType('Sales Order');
    assert.ok(schema);

    const stub = PyStubGenerator.generateDocTypeStub(schema);
    assert.ok(stub.includes("items: List['SalesOrderItem']"));
    assert.ok(stub.includes('customer: str'));
  });

  it('should generate typed DocType interfaces in JsStubGenerator', () => {
    const index = IndexManager.getInstance();
    const doctypes = index.getAllDocTypes();
    const decls = JsStubGenerator.generateAmbientDeclarations(doctypes);

    assert.ok(decls.includes('interface SalesOrderDoc {'));
    assert.ok(decls.includes('customer?: string;'));
    assert.ok(decls.includes('grand_total?: number;'));
  });

  it('should generate valid boilerplate for new scaffolders', () => {
    const clientScript = ScaffoldCommands.generateClientScriptJs('Sales Invoice');
    assert.ok(clientScript.includes("frappe.ui.form.on('Sales Invoice'"));

    const serverScript = ScaffoldCommands.generateServerScriptPy('sync_orders');
    assert.ok(serverScript.includes('@frappe.whitelist()'));
    assert.ok(serverScript.includes('execute_handler'));

    const webPagePy = ScaffoldCommands.generateWebPagePy('About Us');
    assert.ok(webPagePy.includes('def get_context(context):'));

    const printFormat = ScaffoldCommands.generatePrintFormatHtml('Tax Invoice', 'Sales Invoice');
    assert.ok(printFormat.includes('Print Format: Tax Invoice for Sales Invoice'));
  });
});
