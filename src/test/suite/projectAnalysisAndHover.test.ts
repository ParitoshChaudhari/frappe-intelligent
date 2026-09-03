import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FrappeHoverProvider } from '../../providers/hoverProvider';
import { FrappeCompletionProvider } from '../../providers/completionProvider';
import { IndexManager } from '../../indexer/indexManager';
import { DocTypeIndexer } from '../../indexer/doctypeIndexer';
import { PyIndexer } from '../../indexer/pyIndexer';
import { DocTypeSchema } from '../../core/types';

describe('Project Analysis, Custom Fields, Hover & Import Suggestions Test Suite', () => {
  let hoverProvider: FrappeHoverProvider;
  let completionProvider: FrappeCompletionProvider;
  let index: IndexManager;

  before(() => {
    hoverProvider = new FrappeHoverProvider();
    completionProvider = new FrappeCompletionProvider();
    index = IndexManager.getInstance();

    // Register mock DocType with custom fields
    const mockEmployee: DocTypeSchema = {
      name: 'Employee',
      module: 'HR',
      app: 'hrms',
      fields: [
        { fieldname: 'name', label: 'ID', fieldtype: 'Data', reqd: 1 },
        { fieldname: 'employee_name', label: 'Employee Name', fieldtype: 'Data', reqd: 1 },
        { fieldname: 'department', label: 'Department', fieldtype: 'Link', options: 'Department' },
        { fieldname: 'custom_pan_number', label: 'PAN Number', fieldtype: 'Data', is_custom: true },
      ],
      custom_fields: [
        { fieldname: 'custom_pan_number', label: 'PAN Number', fieldtype: 'Data', is_custom: true },
      ],
      pyImportPath: 'hrms.hr.doctype.employee.employee',
      pyClassName: 'Employee',
    };

    (index as any).allDocTypes.set('Employee', mockEmployee);
    (index as any).allDocTypes.set('employee', mockEmployee);

    // Register import symbols
    (index as any).allImportSymbols.set('hrms.payroll.doctype.salary_slip.salary_slip:SalarySlip', {
      importPath: 'hrms.payroll.doctype.salary_slip.salary_slip',
      moduleName: 'salary_slip',
      appName: 'hrms',
      symbolName: 'SalarySlip',
      symbolType: 'doctype',
      sourceFile: '/apps/hrms/hrms/payroll/doctype/salary_slip/salary_slip.py',
      docstring: 'Controller for calculating monthly employee salary and deductions.',
    });
  });

  describe('Hover Documentation Details', () => {
    it('should display parameter structure {} and [] with return description on frappe.get_doc hover', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: (range?: vscode.Range) => (range ? 'frappe.get_doc' : 'doc = frappe.get_doc("Employee", "EMP-001")'),
        getWordRangeAtPosition: () => new vscode.Range(0, 6, 0, 20),
        lineAt: () => ({ text: 'doc = frappe.get_doc("Employee", "EMP-001")' }),
      };

      const hover = hoverProvider.provideHover(mockDoc, new vscode.Position(0, 15)) as vscode.Hover;
      assert.ok(hover);
      const markdown = hover.contents[0] as vscode.MarkdownString;
      const text = markdown.value;

      assert.ok(text.includes('frappe.get_doc'));
      assert.ok(text.includes('📥 Parameters:'));
      assert.ok(text.includes('`doctype`'));
      assert.ok(text.includes('str | { "doctype": str, ... }'));
      assert.ok(text.includes('📤 Returns:'));
      assert.ok(text.includes('frappe.model.document.Document'));
      assert.ok(text.includes('💡 Usage Example:'));
    });

    it('should display parameter format and return details on frappe.db.set_value hover', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: (range?: vscode.Range) => (range ? 'frappe.db.set_value' : 'frappe.db.set_value("Employee", "EMP-001", "status", "Active")'),
        getWordRangeAtPosition: () => new vscode.Range(0, 0, 0, 19),
        lineAt: () => ({ text: 'frappe.db.set_value("Employee", "EMP-001", "status", "Active")' }),
      };

      const hover = hoverProvider.provideHover(mockDoc, new vscode.Position(0, 12)) as vscode.Hover;
      assert.ok(hover);
      const markdown = hover.contents[0] as vscode.MarkdownString;
      const text = markdown.value;

      assert.ok(text.includes('frappe.db.set_value'));
      assert.ok(text.includes('📥 Parameters:'));
      assert.ok(text.includes('📤 Returns:'));
      assert.ok(text.includes('💡 Usage Example:'));
    });

    it('should display custom fields and import info on DocType hover', () => {
      const mockDoc: any = {
        fileName: '/apps/hrms/hrms/hr/doctype/employee/employee.py',
        getText: (range?: vscode.Range) => (range ? 'Employee' : 'doc = frappe.get_doc("Employee", "EMP-001")'),
        getWordRangeAtPosition: () => new vscode.Range(0, 22, 0, 30),
        lineAt: () => ({ text: 'doc = frappe.get_doc("Employee", "EMP-001")' }),
      };

      const hover = hoverProvider.provideHover(mockDoc, new vscode.Position(0, 25)) as vscode.Hover;
      assert.ok(hover);
      const markdown = hover.contents[0] as vscode.MarkdownString;
      const text = markdown.value;

      assert.ok(text.includes('Frappe DocType: `Employee`'));
      assert.ok(text.includes('Custom Fields'));
      assert.ok(text.includes('`custom_pan_number`'));
      assert.ok(text.includes('[Custom]'));
      assert.ok(text.includes('from hrms.hr.doctype.employee.employee import Employee'));
    });
  });


  describe('Custom Fields Parsing & Merging', () => {
    it('should parse custom field fixtures array format', () => {
      const tempFixture = path.join(__dirname, 'temp_custom_field.json');
      const fixtureData = [
        {
          doctype: 'Custom Field',
          dt: 'Employee',
          fieldname: 'custom_aadhaar_no',
          label: 'Aadhaar Number',
          fieldtype: 'Data',
          reqd: 1,
        },
      ];
      fs.writeFileSync(tempFixture, JSON.stringify(fixtureData));

      try {
        const parsed = DocTypeIndexer.parseCustomFieldJson(tempFixture);
        assert.ok(parsed.has('Employee'));
        const fields = parsed.get('Employee')!;
        assert.strictEqual(fields.length, 1);
        assert.strictEqual(fields[0].fieldname, 'custom_aadhaar_no');
        assert.strictEqual(fields[0].is_custom, true);
      } finally {
        if (fs.existsSync(tempFixture)) {
          fs.unlinkSync(tempFixture);
        }
      }
    });

    it('should parse custom field object format', () => {
      const tempFixture = path.join(__dirname, 'temp_custom_dict.json');
      const fixtureData = {
        Task: [
          {
            fieldname: 'custom_priority_score',
            label: 'Priority Score',
            fieldtype: 'Int',
          },
        ],
      };
      fs.writeFileSync(tempFixture, JSON.stringify(fixtureData));

      try {
        const parsed = DocTypeIndexer.parseCustomFieldJson(tempFixture);
        assert.ok(parsed.has('Task'));
        const fields = parsed.get('Task')!;
        assert.strictEqual(fields.length, 1);
        assert.strictEqual(fields[0].fieldname, 'custom_priority_score');
      } finally {
        if (fs.existsSync(tempFixture)) {
          fs.unlinkSync(tempFixture);
        }
      }
    });
  });

  describe('Auto-suggestions for DocTypes, Fields, and Imports', () => {
    it('should suggest DocType names with custom field badges in frappe.get_doc', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.get_doc("',
        lineAt: () => ({ text: 'frappe.get_doc("' }),
      };

      const position = new vscode.Position(0, 'frappe.get_doc("'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const empItem = items.find((i) => i.label === 'Employee');
      assert.ok(empItem);
      assert.ok(empItem.detail?.includes('Custom Fields'));
    });

    it('should suggest fields including custom fields for target DocType in frappe.db.get_value', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.db.get_value("Employee", "EMP-001", "',
        lineAt: () => ({ text: 'frappe.db.get_value("Employee", "EMP-001", "' }),
      };

      const position = new vscode.Position(0, 'frappe.db.get_value("Employee", "EMP-001", "'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('employee_name'));
      assert.ok(labels.includes('department'));
      assert.ok(labels.includes('custom_pan_number'));

      const customItem = items.find((i) => i.label === 'custom_pan_number');
      assert.ok(customItem?.detail?.includes('[Custom Field]'));
    });

    it('should infer module import paths accurately', () => {
      const pyPath = '/workspace/apps/hrms/hrms/payroll/doctype/salary_slip/salary_slip.py';
      const importPath = PyIndexer.inferModuleImportPath(pyPath);
      assert.strictEqual(importPath, 'hrms.payroll.doctype.salary_slip.salary_slip');
    });

    it('should provide Python import completions for from statements', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'from hrms.',
        lineAt: () => ({ text: 'from hrms.' }),
      };

      const position = new vscode.Position(0, 'from hrms.'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('hrms.payroll.doctype.salary_slip.salary_slip'));
      assert.ok(labels.includes('SalarySlip'));
    });

    it('should provide frappe.permissions completions in Python', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.permissions.',
        lineAt: () => ({ text: 'frappe.permissions.' }),
      };

      const position = new vscode.Position(0, 'frappe.permissions.'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('has_permission'));
      assert.ok(labels.includes('only_for'));
      assert.ok(labels.includes('get_roles'));
    });

    it('should provide frappe.router completions in JavaScript', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/public/js/desk.js',
        getText: () => 'frappe.router.',
        lineAt: () => ({ text: 'frappe.router.' }),
      };

      const position = new vscode.Position(0, 'frappe.router.'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('set_route'));
      assert.ok(labels.includes('get_route'));
    });

    it('should provide page API completions in form JavaScript', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/public/js/page_test.js',
        getText: () => 'page.',
        lineAt: () => ({ text: 'page.' }),
      };

      const position = new vscode.Position(0, 'page.'.length);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('set_title'));
      assert.ok(labels.includes('set_indicator'));
      assert.ok(labels.includes('add_inner_button'));
    });

    it('should provide comprehensive hooks in hooks.py', () => {
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/hooks.py',
        getText: () => '',
        lineAt: () => ({ text: '' }),
      };

      const position = new vscode.Position(0, 0);
      const items = completionProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 25);
      const labels = items.map((i) => i.label);
      assert.ok(labels.includes('app_name'));
      assert.ok(labels.includes('permission_query_conditions'));
      assert.ok(labels.includes('has_permission'));
      assert.ok(labels.includes('after_migrate'));
      assert.ok(labels.includes('boot_session'));
    });

    it('should provide frappe.session and frappe.local completions in Python', () => {
      const sessionDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.session.',
        lineAt: () => ({ text: 'frappe.session.' }),
      };
      const sessionItems = completionProvider.provideCompletionItems(sessionDoc, new vscode.Position(0, 'frappe.session.'.length)) as vscode.CompletionItem[];
      assert.ok(sessionItems.length > 0);
      assert.ok(sessionItems.map(i => i.label).includes('user'));

      const localDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.local.',
        lineAt: () => ({ text: 'frappe.local.' }),
      };
      const localItems = completionProvider.provideCompletionItems(localDoc, new vscode.Position(0, 'frappe.local.'.length)) as vscode.CompletionItem[];
      assert.ok(localItems.length > 0);
      assert.ok(localItems.map(i => i.label).includes('site'));
    });

    it('should provide frappe.web_form and listview completions in JavaScript', () => {
      const wfDoc: any = {
        fileName: '/apps/frappe/frappe/public/js/web_form.js',
        getText: () => 'frappe.web_form.',
        lineAt: () => ({ text: 'frappe.web_form.' }),
      };
      const wfItems = completionProvider.provideCompletionItems(wfDoc, new vscode.Position(0, 'frappe.web_form.'.length)) as vscode.CompletionItem[];
      assert.ok(wfItems.length > 0);
      assert.ok(wfItems.map(i => i.label).includes('on'));
      assert.ok(wfItems.map(i => i.label).includes('set_value'));

      const lvDoc: any = {
        fileName: '/apps/frappe/frappe/public/js/item_list.js',
        getText: () => 'listview.',
        lineAt: () => ({ text: 'listview.' }),
      };
      const lvItems = completionProvider.provideCompletionItems(lvDoc, new vscode.Position(0, 'listview.'.length)) as vscode.CompletionItem[];
      assert.ok(lvItems.length > 0);
      assert.ok(lvItems.map(i => i.label).includes('refresh'));
      assert.ok(lvItems.map(i => i.label).includes('get_checked_items'));
    });
  });


  describe('Jinja Completions, Signature Help & Diagnostics', () => {
    it('should provide Jinja filters when pipe is typed', () => {
      const { FrappeJinjaCompletionProvider } = require('../../providers/jinjaCompletionProvider');
      const jinjaProvider = new FrappeJinjaCompletionProvider();
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/templates/print.html',
        getText: () => '{{ doc.total | ',
        lineAt: () => ({ text: '{{ doc.total | ' }),
      };

      const position = new vscode.Position(0, '{{ doc.total | '.length);
      const items = jinjaProvider.provideCompletionItems(mockDoc, position) as vscode.CompletionItem[];

      assert.ok(items.length > 0);
      const labels = items.map((i: any) => i.label);
      assert.ok(labels.includes('format_currency'));
      assert.ok(labels.includes('len'));
      assert.ok(labels.includes('json'));
      assert.ok(labels.includes('striptags'));
    });

    it('should provide signature help with parameter structure hints', () => {
      const { FrappeSignatureHelpProvider } = require('../../providers/signatureHelpProvider');
      const sigProvider = new FrappeSignatureHelpProvider();
      const mockDoc: any = {
        fileName: '/apps/frappe/frappe/api.py',
        getText: () => 'frappe.get_doc("Employee", ',
        lineAt: () => ({ text: 'frappe.get_doc("Employee", ' }),
      };

      const position = new vscode.Position(0, 'frappe.get_doc("Employee", '.length);
      const help = sigProvider.provideSignatureHelp(mockDoc, position) as vscode.SignatureHelp;

      assert.ok(help);
      assert.strictEqual(help.activeParameter, 1);
      assert.ok(help.signatures[0].label.includes('frappe.get_doc'));
    });

    it('should correctly match frm.set_value signature in client form scripts without mixing with frappe.db', () => {
      const { FrappeSignatureHelpProvider } = require('../../providers/signatureHelpProvider');
      const sigProvider = new FrappeSignatureHelpProvider();
      const mockDoc: any = {
        fileName: '/apps/hrms/hrms/public/js/appointment_letter.js',
        getText: () => 'frm.set_value(',
        lineAt: () => ({ text: '    frm.set_value(' }),
      };

      const position = new vscode.Position(0, '    frm.set_value('.length);
      const help = sigProvider.provideSignatureHelp(mockDoc, position) as vscode.SignatureHelp;

      assert.ok(help);
      assert.strictEqual(help.activeParameter, 0);
      assert.ok(help.signatures[0].label.startsWith('frm.set_value'));
      assert.ok(!help.signatures[0].label.includes('doctype'));
    });

    it('should flag SQL injection vulnerabilities in frappe.db.sql', () => {
      const { DeprecationMatrix } = require('../../indexer/deprecationMatrix');
      const rules = DeprecationMatrix.getDeprecationsForVersion('v15', 'frappe.db.sql(f"SELECT * FROM tabUser WHERE name = \'{user}\'")');
      assert.ok(rules.length > 0);
      assert.ok(rules.some((r: any) => r.message.includes('SQL Injection Risk')));
    });

  });
});

