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

  it('should provide frappe.model completions with table and document methods in JavaScript', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/model_test.js',
      getText: () => 'frappe.model.',
      lineAt: () => ({ text: 'frappe.model.' }),
    };

    const position = new vscode.Position(0, 'frappe.model.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('get_doc'));
    assert.ok(labels.includes('set_value'));
    assert.ok(labels.includes('get_value'));
    assert.ok(labels.includes('add_child'));
    assert.ok(labels.includes('clear_table'));
    assert.ok(labels.includes('get_children'));
    assert.ok(labels.includes('delete_doc'));
    assert.ok(labels.includes('sync'));
    assert.ok(labels.includes('with_doctype'));
    assert.ok(labels.includes('with_doc'));
    assert.ok(labels.includes('is_submittable'));
    assert.ok(labels.includes('can_create'));
    assert.ok(labels.includes('can_read'));
    assert.ok(labels.includes('can_write'));
  });

  it('should provide expanded grid table methods for child tables', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/grid_test.js',
      getText: () => 'grid.',
      lineAt: () => ({ text: 'grid.' }),
    };

    const position = new vscode.Position(0, 'grid.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('add_new_row'));
    assert.ok(labels.includes('get_selected'));
    assert.ok(labels.includes('get_selected_children'));
    assert.ok(labels.includes('refresh_row'));
    assert.ok(labels.includes('set_column_disp'));
    assert.ok(labels.includes('toggle_reqd'));
    assert.ok(labels.includes('toggle_enable'));
    assert.ok(labels.includes('toggle_display'));
    assert.ok(labels.includes('open_form'));
    assert.ok(labels.includes('remove_all'));
  });

  it('should provide child table field completions on locals[cdt][cdn].', () => {
    const jsCode = `
frappe.ui.form.on("Employee", {
    refresh(frm) {
        const row = locals[cdt][cdn];
        locals[cdt][cdn].
    }
});`;
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/doctype/employee/employee.js',
      getText: () => jsCode,
      lineAt: () => ({ text: '        locals[cdt][cdn].' }),
    };

    const position = new vscode.Position(4, '        locals[cdt][cdn].'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('first_name'));
    assert.ok(labels.includes('department'));
    assert.ok(labels.includes('salary'));
  });

  it('should provide frappe.ui namespace completions in JavaScript', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/desk.js',
      getText: () => 'frappe.ui.',
      lineAt: () => ({ text: 'frappe.ui.' }),
    };

    const position = new vscode.Position(0, 'frappe.ui.'.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Dialog'));
    assert.ok(labels.includes('form'));
  });

  it('should provide named parameter completions for Python function calls', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/api.py',
      getText: () => 'frappe.get_all(',
      lineAt: () => ({ text: 'frappe.get_all(' }),
    };

    const position = new vscode.Position(0, 'frappe.get_all('.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('doctype='));
    assert.ok(labels.includes('filters='));
    assert.ok(labels.includes('fields='));
    assert.ok(labels.includes('order_by='));
    assert.ok(labels.includes('limit_page_length='));
    assert.ok(labels.includes('pluck='));
  });

  it('should provide named parameter completions for frappe.db.get_value in Python', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/api.py',
      getText: () => 'frappe.db.get_value(',
      lineAt: () => ({ text: 'frappe.db.get_value(' }),
    };

    const position = new vscode.Position(0, 'frappe.db.get_value('.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('doctype='));
    assert.ok(labels.includes('fieldname='));
    assert.ok(labels.includes('filters='));
    assert.ok(labels.includes('as_dict='));
  });

  it('should provide named parameter completions for frappe.db.get_list in Python', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/api.py',
      getText: () => 'frappe.db.get_list(',
      lineAt: () => ({ text: 'frappe.db.get_list(' }),
    };

    const position = new vscode.Position(0, 'frappe.db.get_list('.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('doctype='));
    assert.ok(labels.includes('filters='));
    assert.ok(labels.includes('or_filters='));
    assert.ok(labels.includes('fields='));
    assert.ok(labels.includes('order_by='));
    assert.ok(labels.includes('group_by='));
    assert.ok(labels.includes('start='));
    assert.ok(labels.includes('page_length='));
    assert.ok(labels.includes('run='));
    assert.ok(labels.includes('pluck='));
  });

  it('should provide parameter completions for frm.set_value in JavaScript', () => {
    const mockDoc: any = {
      fileName: '/apps/frappe/frappe/public/js/form.js',
      getText: () => 'frm.set_value(',
      lineAt: () => ({ text: 'frm.set_value(' }),
    };

    const position = new vscode.Position(0, 'frm.set_value('.length);
    const items = provider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

    assert.ok(items.length > 0);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('fieldname'));
    assert.ok(labels.includes('value'));
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
