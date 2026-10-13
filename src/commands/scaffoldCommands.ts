import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BenchContext } from '../core/types';

/**
 * Commands for scaffolding Frappe Reports, Desk Pages, Migration Patches, and Client Scripts.
 */
export class ScaffoldCommands {
  public static registerCommands(context: vscode.ExtensionContext, getBench: () => BenchContext | null): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('frappeIntelligent.scaffoldReport', async () => {
        const reportName = await vscode.window.showInputBox({
          prompt: 'Enter Script Report Name',
          placeHolder: 'e.g. Monthly Attendance Summary',
        });
        if (!reportName) return;

        const doctypeName = await vscode.window.showInputBox({
          prompt: 'Enter Primary Reference DocType',
          placeHolder: 'e.g. Attendance',
        });
        if (!doctypeName) return;

        const pyContent = this.generateReportPy(reportName, doctypeName);
        const jsContent = this.generateReportJs(reportName, doctypeName);

        await this.createAndOpenFiles([
          { fileName: `${this.slugify(reportName)}.py`, content: pyContent },
          { fileName: `${this.slugify(reportName)}.js`, content: jsContent },
        ]);

        vscode.window.showInformationMessage(`Scaffolded Script Report: ${reportName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldPage', async () => {
        const pageName = await vscode.window.showInputBox({
          prompt: 'Enter Desk Page Name',
          placeHolder: 'e.g. Custom Analytics Dashboard',
        });
        if (!pageName) return;

        const jsContent = this.generatePageJs(pageName);
        const htmlContent = this.generatePageHtml(pageName);

        await this.createAndOpenFiles([
          { fileName: `${this.slugify(pageName)}.js`, content: jsContent },
          { fileName: `${this.slugify(pageName)}.html`, content: htmlContent },
        ]);

        vscode.window.showInformationMessage(`Scaffolded Desk Page: ${pageName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldPatch', async () => {
        const patchName = await vscode.window.showInputBox({
          prompt: 'Enter Migration Patch Name',
          placeHolder: 'e.g. set_default_employee_status',
        });
        if (!patchName) return;

        const pyContent = this.generatePatchPy(patchName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(patchName)}.py`, content: pyContent }]);

        vscode.window.showInformationMessage(`Scaffolded Migration Patch: ${patchName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldUnitTest', async () => {
        const doctypeName = await vscode.window.showInputBox({
          prompt: 'Enter DocType Name for Unit Test',
          placeHolder: 'e.g. Employee or Sales Invoice',
        });
        if (!doctypeName) return;

        const pyContent = this.generateUnitTestPy(doctypeName);
        await this.createAndOpenFiles([{ fileName: `test_${this.slugify(doctypeName)}.py`, content: pyContent }]);

        vscode.window.showInformationMessage(`Scaffolded FrappeTestCase: test_${this.slugify(doctypeName)}.py`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldWebForm', async () => {
        const formName = await vscode.window.showInputBox({
          prompt: 'Enter Web Form Title',
          placeHolder: 'e.g. Job Application',
        });
        if (!formName) return;

        const jsContent = this.generateWebFormJs(formName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(formName)}.js`, content: jsContent }]);

        vscode.window.showInformationMessage(`Scaffolded Web Form Script: ${formName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldListView', async () => {
        const doctypeName = await vscode.window.showInputBox({
          prompt: 'Enter DocType Name for ListView Settings',
          placeHolder: 'e.g. Leave Application',
        });
        if (!doctypeName) return;

        const jsContent = this.generateListViewJs(doctypeName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(doctypeName)}_list.js`, content: jsContent }]);

        vscode.window.showInformationMessage(`Scaffolded ListView Settings: ${doctypeName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldClientScript', async () => {
        const doctypeName = await vscode.window.showInputBox({
          prompt: 'Enter DocType Name for Client Script',
          placeHolder: 'e.g. Sales Order',
        });
        if (!doctypeName) return;

        const jsContent = this.generateClientScriptJs(doctypeName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(doctypeName)}_custom.js`, content: jsContent }]);

        vscode.window.showInformationMessage(`Scaffolded Client Script for ${doctypeName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldServerScript', async () => {
        const scriptName = await vscode.window.showInputBox({
          prompt: 'Enter Server Script / API Handler Name',
          placeHolder: 'e.g. sync_external_orders',
        });
        if (!scriptName) return;

        const pyContent = this.generateServerScriptPy(scriptName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(scriptName)}.py`, content: pyContent }]);

        vscode.window.showInformationMessage(`Scaffolded Server Script: ${scriptName}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldWebPage', async () => {
        const pageTitle = await vscode.window.showInputBox({
          prompt: 'Enter Portal / Website Page Title',
          placeHolder: 'e.g. Product Catalog',
        });
        if (!pageTitle) return;

        const slug = this.slugify(pageTitle);
        const pyContent = this.generateWebPagePy(pageTitle);
        const htmlContent = this.generateWebPageHtml(pageTitle);

        await this.createAndOpenFiles([
          { fileName: `${slug}.py`, content: pyContent },
          { fileName: `${slug}.html`, content: htmlContent },
        ]);

        vscode.window.showInformationMessage(`Scaffolded Web Page: ${pageTitle}`);
      }),

      vscode.commands.registerCommand('frappeIntelligent.scaffoldPrintFormat', async () => {
        const formatName = await vscode.window.showInputBox({
          prompt: 'Enter Print Format Name',
          placeHolder: 'e.g. Modern Tax Invoice',
        });
        if (!formatName) return;

        const doctypeName = await vscode.window.showInputBox({
          prompt: 'Enter Reference DocType',
          placeHolder: 'e.g. Sales Invoice',
        });
        if (!doctypeName) return;

        const htmlContent = this.generatePrintFormatHtml(formatName, doctypeName);
        await this.createAndOpenFiles([{ fileName: `${this.slugify(formatName)}.html`, content: htmlContent }]);

        vscode.window.showInformationMessage(`Scaffolded Print Format: ${formatName}`);
      })
    );
  }


  public static escapeStringLiteral(str: string): string {
    return str.replace(/['"\\]/g, '\\$&').replace(/\r?\n/g, ' ');
  }

  public static generateReportPy(reportName: string, doctype: string): string {
    const safeDocType = this.escapeStringLiteral(doctype);
    return `# Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "label": _("ID"),
            "fieldname": "name",
            "fieldtype": "Link",
            "options": "${safeDocType}",
            "width": 140,
        },
        {
            "label": _("Status"),
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": _("Creation Date"),
            "fieldname": "creation",
            "fieldtype": "Date",
            "width": 120,
        },
    ]

def get_data(filters):
    conditions = {}
    if filters and filters.get("status"):
        conditions["status"] = filters.get("status")

    return frappe.get_all(
        "${safeDocType}",
        filters=conditions,
        fields=["name", "status", "creation"],
        order_by="creation desc",
    )
`;
  }

  public static generateReportJs(reportName: string, doctype: string): string {
    const safeReportName = this.escapeStringLiteral(reportName);
    return `// Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.query_reports["${safeReportName}"] = {
    filters: [
        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "Select",
            options: "\\nActive\\nPending\\nCompleted\\nCancelled",
        },
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
            default: frappe.datetime.add_months(frappe.datetime.nowdate(), -1),
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
            default: frappe.datetime.nowdate(),
        },
    ],
};
`;
  }

  public static generatePageJs(pageName: string): string {
    const safePageName = this.escapeStringLiteral(pageName);
    const slug = this.slugify(pageName);
    return `frappe.pages["${slug}"].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('${safePageName}'),
        single_column: true
    });

    page.set_primary_action(__('Refresh'), () => {
        frappe.show_alert({ message: __('Refreshed'), indicator: 'green' });
    });

    $(frappe.render_template("${slug}", {})).appendTo(page.main);
};
`;
  }

  public static generatePageHtml(pageName: string): string {
    const safePageName = pageName.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return c;
      }
    });
    return `<div class="custom-page-container p-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card p-3 shadow-sm">
                <h4>{{ __('${safePageName}') }}</h4>
                <p class="text-muted">{{ __('Custom Frappe Desk Page') }}</p>
            </div>
        </div>
    </div>
</div>
`;
  }

  public static generatePatchPy(patchName: string): string {
    const safePatchName = this.escapeStringLiteral(patchName);
    return `import frappe

def execute():
    """
    Migration patch: ${safePatchName}
    """
    frappe.reload_doc("core", "doctype", "doctype")
    # Add your migration logic here
`;
  }

  public static generateUnitTestPy(doctype: string): string {
    const safeDocType = this.escapeStringLiteral(doctype);
    const className = doctype.replace(/[^a-zA-Z0-9]/g, '');
    return `# Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

class Test${className}(FrappeTestCase):
    def setUp(self):
        """Runs before each test case."""
        pass

    def test_${this.slugify(doctype)}_creation(self):
        """Test document creation and validation."""
        doc = frappe.new_doc("${safeDocType}")
        # Configure mandatory fields and assertions
        self.assertEqual(doc.doctype, "${safeDocType}")

    def tearDown(self):
        """Rollback database changes after each test."""
        frappe.db.rollback()
`;
  }

  public static generateWebFormJs(formName: string): string {
    const safeFormName = this.escapeStringLiteral(formName);
    return `// Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ready(function() {
    // Web Form Client Script for: ${safeFormName}
    frappe.web_form.on('onload', () => {
        // Set initial field values or custom intro
    });

    frappe.web_form.validate = () => {
        // Return false to prevent submission
        return true;
    };

    frappe.web_form.after_save = () => {
        frappe.msgprint(__('Thank you for your submission!'));
    };
});
`;
  }

  public static generateListViewJs(doctype: string): string {
    const safeDocType = this.escapeStringLiteral(doctype);
    return `// Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.listview_settings['${safeDocType}'] = {
    add_fields: ['status'],
    get_indicator(doc) {
        if (doc.status === 'Active' || doc.status === 'Approved') {
            return [__(doc.status), 'green', 'status,=,' + doc.status];
        } else if (doc.status === 'Pending' || doc.status === 'Draft') {
            return [__(doc.status), 'orange', 'status,=,' + doc.status];
        } else if (doc.status === 'Cancelled' || doc.status === 'Rejected') {
            return [__(doc.status), 'red', 'status,=,' + doc.status];
        }
    },
    onload(listview) {
        // Add custom buttons or bulk actions
    }
};
`;
  }

  public static generateClientScriptJs(doctype: string): string {
    const safeDocType = this.escapeStringLiteral(doctype);
    return `// Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('${safeDocType}', {
    setup(frm) {
        // Setup initial queries or calculations
    },
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Process Action'), () => {
                frappe.msgprint(__('Action triggered'));
            }, __('Actions'));
        }
    },
    validate(frm) {
        // Custom validations before save
    }
});
`;
  }

  public static generateServerScriptPy(scriptName: string): string {
    const safeName = this.escapeStringLiteral(scriptName);
    return `# Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _

@frappe.whitelist()
def execute_handler():
    """
    Server API Endpoint: ${safeName}
    """
    param = frappe.form_dict.get("param")
    if not param:
        frappe.throw(_("Missing required parameter: param"))

    # Implement business logic
    return {
        "status": "success",
        "data": param
    }
`;
  }

  public static generateWebPagePy(pageTitle: string): string {
    const safeTitle = this.escapeStringLiteral(pageTitle);
    return `# Copyright (c) ${new Date().getFullYear()}, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe

def get_context(context):
    context.no_cache = 1
    context.title = "${safeTitle}"
    context.parents = [{"name": "home", "title": "Home"}]
    context.items = []
`;
  }

  public static generateWebPageHtml(pageTitle: string): string {
    const safeTitle = pageTitle.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return c;
      }
    });
    return `{% extends "templates/web.html" %}

{% block page_content %}
<div class="container py-4">
    <div class="row">
        <div class="col-md-12">
            <h2>{{ _("${safeTitle}") }}</h2>
            <p class="text-muted">{{ _("Portal web page template.") }}</p>
        </div>
    </div>
</div>
{% endblock %}
`;
  }

  public static generatePrintFormatHtml(formatName: string, doctype: string): string {
    const safeName = formatName.replace(/[<>&"']/g, '');
    const safeDocType = this.escapeStringLiteral(doctype);
    return `<!-- Print Format: ${safeName} for ${safeDocType} -->
<div class="print-format-container">
    <div class="header d-flex justify-content-between mb-4">
        <div>
            <h3>{{ doc.company or _("Company Name") }}</h3>
            <h4>{{ _("${safeDocType}") }}: {{ doc.name }}</h4>
        </div>
        <div class="text-right">
            <p>{{ _("Date") }}: {{ frappe.utils.format_date(doc.posting_date or doc.creation) }}</p>
            <p>{{ _("Status") }}: <strong>{{ doc.status or _("Draft") }}</strong></p>
        </div>
    </div>

    {% if doc.items %}
    <table class="table table-bordered mt-3">
        <thead>
            <tr>
                <th>{{ _("Sr") }}</th>
                <th>{{ _("Item Description") }}</th>
                <th class="text-right">{{ _("Qty") }}</th>
                <th class="text-right">{{ _("Rate") }}</th>
                <th class="text-right">{{ _("Amount") }}</th>
            </tr>
        </thead>
        <tbody>
            {% for item in doc.items %}
            <tr>
                <td>{{ loop.index }}</td>
                <td>{{ item.item_name or item.item_code }}</td>
                <td class="text-right">{{ item.qty }}</td>
                <td class="text-right">{{ frappe.format_value(item.rate, {"fieldtype": "Currency"}) }}</td>
                <td class="text-right">{{ frappe.format_value(item.amount, {"fieldtype": "Currency"}) }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    {% endif %}

    <div class="row mt-4">
        <div class="col-6 offset-6 text-right">
            <h4>{{ _("Grand Total") }}: {{ frappe.format_value(doc.grand_total or doc.total, {"fieldtype": "Currency"}) }}</h4>
        </div>
    </div>
</div>
`;
  }



  public static slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'scaffolded_item';
  }

  private static async createAndOpenFiles(files: { fileName: string; content: string }[]): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const targetDir = activeEditor ? path.dirname(activeEditor.document.fileName) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!targetDir) return;

    for (const f of files) {
      const safeFileName = path.basename(f.fileName);
      const fullPath = path.join(targetDir, safeFileName);
      if (fs.existsSync(fullPath)) {
        const choice = await vscode.window.showWarningMessage(
          `File "${safeFileName}" already exists in the target directory. Do you want to overwrite it?`,
          { modal: true },
          'Overwrite',
          'Skip'
        );
        if (choice !== 'Overwrite') {
          continue;
        }
      }
      fs.writeFileSync(fullPath, f.content, 'utf8');
      const doc = await vscode.workspace.openTextDocument(fullPath);
      await vscode.window.showTextDocument(doc);
    }
  }
}
