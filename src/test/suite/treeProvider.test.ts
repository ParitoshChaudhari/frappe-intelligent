import * as assert from 'assert';
import * as vscode from 'vscode';
import { FrappeTreeItem } from '../../views/frappeTreeProvider';
import { DocTypeSchema } from '../../core/types';

describe('FrappeTreeProvider Test Suite', () => {
  it('should create app tree item with package icon', () => {
    const item = new FrappeTreeItem('frappe', 'app', vscode.TreeItemCollapsibleState.Collapsed, 'frappe');
    assert.strictEqual(item.label, 'frappe');
    assert.strictEqual(item.itemType, 'app');
  });

  it('should create doctype tree item with custom schema badge', () => {
    const dummySchema: DocTypeSchema = {
      name: 'Sales Invoice',
      is_submittable: 1,
      fields: [{ fieldname: 'customer', label: 'Customer', fieldtype: 'Link', reqd: 1 }],
    };

    const item = new FrappeTreeItem(
      'Sales Invoice',
      'doctype',
      vscode.TreeItemCollapsibleState.Collapsed,
      'erpnext',
      'Accounts',
      dummySchema
    );

    assert.strictEqual(item.label, 'Sales Invoice');
    assert.strictEqual(item.itemType, 'doctype');
  });

  it('should create field tree item with mandatory indicator and type', () => {
    const item = new FrappeTreeItem(
      'Customer',
      'field',
      vscode.TreeItemCollapsibleState.None,
      'erpnext',
      'Accounts',
      undefined,
      { fieldname: 'customer', label: 'Customer', fieldtype: 'Link', reqd: 1 }
    );

    assert.strictEqual(item.description, 'Link *');
  });
});
