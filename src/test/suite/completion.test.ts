import * as assert from 'assert';
import * as vscode from 'vscode';
import { FrappeCompletionProvider } from '../../providers/completionProvider';
import { IndexManager } from '../../indexer/indexManager';
import { DocTypeSchema } from '../../core/types';

describe('FrappeCompletionProvider Expanded APIs Test Suite', () => {
  const provider = new FrappeCompletionProvider();

  before(() => {
    const index = IndexManager.getInstance();
    const dummySchema: DocTypeSchema = {
      name: 'Employee',
      fields: [
        { fieldname: 'first_name', label: 'First Name', fieldtype: 'Data', reqd: 1 },
        { fieldname: 'department', label: 'Department', fieldtype: 'Link' },
        { fieldname: 'salary', label: 'Salary', fieldtype: 'Currency' },
      ],
    };
    (index as any).allDocTypes.set('Employee', dummySchema);
    (index as any).allDocTypes.set('employee', dummySchema);
  });

  it('should provide frappe.utils completions for Python', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/utils.py',
      getText: () => 'frappe.utils.',
      lineAt: () => ({ text: 'frappe.utils.' }),
    };

    const position = new vscode.Position(0, 'frappe.utils.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('today'));
    assert.ok(labels.includes('now_datetime'));
    assert.ok(labels.includes('add_days'));
    assert.ok(labels.includes('flt'));
    assert.ok(labels.includes('cint'));
    assert.ok(labels.includes('money_in_words'));
  });

  it('should provide frappe.datetime completions for JavaScript', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/desk.js',
      getText: () => 'frappe.datetime.',
      lineAt: () => ({ text: 'frappe.datetime.' }),
    };

    const position = new vscode.Position(0, 'frappe.datetime.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('nowdate'));
    assert.ok(labels.includes('add_days'));
    assert.ok(labels.includes('prettyDate'));
  });

  it('should provide frappe.ui.Dialog completions for dialog object', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/dialog_test.js',
      getText: () => 'dialog.',
      lineAt: () => ({ text: 'dialog.' }),
    };

    const position = new vscode.Position(0, 'dialog.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('show'));
    assert.ok(labels.includes('hide'));
    assert.ok(labels.includes('get_values'));
    assert.ok(labels.includes('set_value'));
  });

  it('should provide grid completions for child table grid', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/grid_test.js',
      getText: () => 'frm.fields_dict.items.grid.',
      lineAt: () => ({ text: 'frm.fields_dict.items.grid.' }),
    };

    const position = new vscode.Position(0, 'frm.fields_dict.items.grid.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('add_new_row'));
    assert.ok(labels.includes('refresh'));
    assert.ok(labels.includes('get_selected'));
  });

  it('should provide DocField completions inside frm.set_value argument', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/doctype/employee/employee.js',
      getText: () => 'frm.set_value("',
      lineAt: () => ({ text: 'frm.set_value("' }),
    };

    const position = new vscode.Position(0, 'frm.set_value("'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('first_name'));
    assert.ok(labels.includes('department'));
    assert.ok(labels.includes('salary'));
  });

  it('should provide DocField property completions inside frm.set_df_property 2nd argument', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/doctype/employee/employee.js',
      getText: () => 'frm.set_df_property("department", "',
      lineAt: () => ({ text: 'frm.set_df_property("department", "' }),
    };

    const position = new vscode.Position(0, 'frm.set_df_property("department", "'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('reqd'));
    assert.ok(labels.includes('read_only'));
    assert.ok(labels.includes('hidden'));
    assert.ok(labels.includes('options'));
  });

  it('should clean up tracked symbols when removeFile is called', () => {
    const index = IndexManager.getInstance();
    const fakeFilePath = '/apps/frappe/frappe/doctype/test_doc/test_doc.json';
    const fakeSchema: DocTypeSchema = {
      name: 'TestDocCleanup',
      fields: [],
      filePath: fakeFilePath,
    };
    (index as any).allDocTypes.set('TestDocCleanup', fakeSchema);
    (index as any).trackFileSymbol((index as any).fileToDocTypes, fakeFilePath, 'TestDocCleanup');
    (index as any).knownFilePaths.add(fakeFilePath);

    assert.ok(index.getDocType('TestDocCleanup'));
    assert.ok(index.hasFile(fakeFilePath));

    index.removeFile(fakeFilePath);

    assert.strictEqual(index.getDocType('TestDocCleanup'), undefined);
    assert.strictEqual(index.hasFile(fakeFilePath), false);
  });
});
