import * as vscode from 'vscode';
import { IndexManager } from '../indexer/indexManager';
import { FileClassifier } from '../context/fileClassifier';

export class FrappeJinjaCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    const index = IndexManager.getInstance();
    const fileInfo = FileClassifier.classify(document.fileName, document.getText());

    const items: vscode.CompletionItem[] = [];

    // 1. Trigger `{{ doc.` or `{{ row.` inside Jinja templates
    if (textBeforeCursor.match(/\{\{\s*(?:doc|row|item)\.\w*$/)) {
      const doctype = fileInfo.doctypeName;
      if (doctype) {
        const schema = index.getDocType(doctype);
        if (schema) {
          for (const field of schema.fields) {
            const customTag = field.is_custom ? ' [Custom Field]' : '';
            const item = new vscode.CompletionItem(field.fieldname, vscode.CompletionItemKind.Field);
            item.detail = `{{ doc.${field.fieldname} }} (${field.fieldtype})${customTag}`;
            item.documentation = new vscode.MarkdownString(`**Label**: ${field.label}\n**Type**: ${field.fieldtype}\n**DocType**: ${schema.name}`);
            items.push(item);
          }
          return items;
        }
      }
    }

    // 2. Trigger `{{ frappe.` inside Jinja templates
    if (textBeforeCursor.match(/\{\{\s*frappe\.$/)) {
      const helpers = [
        {
          name: 'format',
          snippet: 'format(${1:doc.fieldname}, "${2:Currency}")',
          doc: 'Formats a value according to fieldtype rules.',
          example: '{{ frappe.format(doc.grand_total, "Currency") }}'
        },
        {
          name: 'format_value',
          snippet: 'format_value(${1:doc.grand_total}, {"fieldtype": "${2:Currency}"})',
          doc: 'Formats a raw value using a fieldtype dictionary configuration.',
          example: '{{ frappe.format_value(doc.grand_total, {"fieldtype": "Currency", "currency": doc.currency}) }}'
        },
        {
          name: 'db.get_value',
          snippet: 'db.get_value("${1:DocType}", "${2:name}", "${3:fieldname}")',
          doc: 'Fetches a single field or multiple fields directly from the database in Jinja print formats and web pages.',
          example: '{{ frappe.db.get_value("Company", doc.company, "tax_id") }}'
        },
        {
          name: 'db.get_list',
          snippet: 'db.get_list("${1:DocType}", filters={${2}}, fields=[${3}])',
          doc: 'Fetches a list of records from the database respecting permissions.',
          example: '{% for row in frappe.db.get_list("Address", filters={"link_doctype": "Customer", "link_name": doc.customer}, fields=["address_line1", "city", "pincode"]) %}\n    <div>{{ row.address_line1 }}, {{ row.city }}</div>\n{% endfor %}'
        },
        {
          name: 'get_doc',
          snippet: 'get_doc("${1:DocType}", "${2:name}")',
          doc: 'Loads and returns a full Document controller object in Jinja templates.',
          example: '{% set comp = frappe.get_doc("Company", doc.company) %}\n<p>Phone: {{ comp.phone_no }}</p>'
        },
        {
          name: 'get_all',
          snippet: 'get_all("${1:DocType}", filters={${2}}, fields=[${3}])',
          doc: 'Fetches a list of records from the database ignoring permissions.',
          example: '{% for row in frappe.get_all("Item Tax Template", filters={"disabled": 0}, fields=["name", "title"]) %}\n    <span>{{ row.title }}</span>\n{% endfor %}'
        },
        {
          name: 'get_meta',
          snippet: 'get_meta("${1:DocType}")',
          doc: 'Retrieves DocType metadata schema object.',
          example: '{% set meta = frappe.get_meta("Sales Invoice") %}\n<span>Module: {{ meta.module }}</span>'
        },
        {
          name: 'render_template',
          snippet: 'render_template("${1:template_path}", {${2:context}})',
          doc: 'Renders a sub-template file or Jinja template string dynamically with context variables.',
          example: '{{ frappe.render_template("templates/includes/address.html", {"address_doc": address}) }}'
        },
        {
          name: 'utils.today',
          snippet: 'utils.today()',
          doc: 'Returns the current server date string in YYYY-MM-DD format.',
          example: '<span>Generated On: {{ frappe.utils.today() }}</span>'
        },
        {
          name: 'utils.nowdate',
          snippet: 'utils.nowdate()',
          doc: 'Returns current date string in YYYY-MM-DD format.',
          example: '<span>Date: {{ frappe.utils.nowdate() }}</span>'
        },
        {
          name: 'utils.format_date',
          snippet: 'utils.format_date(${1:doc.posting_date}, "${2:dd-mm-yyyy}")',
          doc: 'Formats a date string or date object into a custom display format.',
          example: '<span>Date: {{ frappe.utils.format_date(doc.posting_date, "dd-mm-yyyy") }}</span>'
        },
        {
          name: 'utils.format_datetime',
          snippet: 'utils.format_datetime(${1:doc.creation})',
          doc: 'Formats a creation / modification timestamp string with timezone support.',
          example: '<span>Created: {{ frappe.utils.format_datetime(doc.creation) }}</span>'
        },
        {
          name: 'utils.money_in_words',
          snippet: 'utils.money_in_words(${1:doc.grand_total})',
          doc: 'Converts a numeric currency amount into English words (e.g. for invoices / receipts).',
          example: '<p>Amount in words: {{ frappe.utils.money_in_words(doc.grand_total) }}</p>'
        },
        {
          name: 'session.user',
          snippet: 'session.user',
          doc: 'Current active logged-in session user ID / email address.',
          example: '<span>Printed by: {{ frappe.session.user }}</span>'
        },
        {
          name: 'session.user_email',
          snippet: 'session.user_email',
          doc: 'Current active session user email.',
          example: '<span>Email: {{ frappe.session.user_email }}</span>'
        },
        {
          name: 'form_dict',
          snippet: 'form_dict.${1:key}',
          doc: 'HTTP request query parameters dictionary passed to the page.',
          example: '{% if frappe.form_dict.key == "print" %}...{% endif %}'
        },
      ];

      for (const h of helpers) {
        const item = new vscode.CompletionItem(h.name, vscode.CompletionItemKind.Function);
        item.detail = `Frappe Jinja: {{ frappe.${h.name} }}`;
        item.insertText = new vscode.SnippetString(h.snippet);
        item.documentation = new vscode.MarkdownString(`${h.doc}\n\n**Example:**\n\`\`\`jinja\n${h.example}\n\`\`\``);
        items.push(item);
      }
      return items;
    }

    // 3. Trigger `{{ ... | ` Jinja Filters
    if (textBeforeCursor.match(/\{\{[^}]+(\|\s*[a-zA-Z0-9_]*)$/)) {
      const filters = [
        {
          name: 'len',
          snippet: 'len',
          doc: 'Returns the count or length of a list, tuple, or string.',
          example: '<span>Total Items: {{ doc.items | len }}</span>'
        },
        {
          name: 'int',
          snippet: 'int',
          doc: 'Casts a string or float value to an integer.',
          example: '<span>Page {{ doc.page_no | int }}</span>'
        },
        {
          name: 'float',
          snippet: 'float',
          doc: 'Casts a string or integer value to a floating point number.',
          example: '<span>{{ doc.rate | float }}</span>'
        },
        {
          name: 'round',
          snippet: 'round(${1:2})',
          doc: 'Rounds a number to the specified number of decimal places.',
          example: '<span>{{ doc.total_weight | round(2) }}</span>'
        },
        {
          name: 'json',
          snippet: 'json',
          doc: 'Serializes a Python object or dictionary to a JSON string.',
          example: '<script>var config = {{ doc.settings | json }};</script>'
        },
        {
          name: 'striptags',
          snippet: 'striptags',
          doc: 'Strips HTML tags to render plain clean text.',
          example: '<span>{{ doc.description | striptags }}</span>'
        },
        {
          name: 'format_currency',
          snippet: 'format_currency',
          doc: 'Formats a number according to currency symbols, decimals, and number format settings.',
          example: '<span>{{ doc.grand_total | format_currency(doc.currency) }}</span>'
        },
        {
          name: 'format_date',
          snippet: 'format_date("${1:dd-mm-yyyy}")',
          doc: 'Formats a date string according to a pattern.',
          example: '<span>{{ doc.posting_date | format_date("dd-mm-yyyy") }}</span>'
        },
        {
          name: 'format_datetime',
          snippet: 'format_datetime',
          doc: 'Formats a timestamp string with time and timezone.',
          example: '<span>{{ doc.modified | format_datetime }}</span>'
        },
        {
          name: 'get_fullname',
          snippet: 'get_fullname',
          doc: 'Converts a user ID or email into the user\'s full display name.',
          example: '<span>Approver: {{ doc.approved_by | get_fullname }}</span>'
        },
        {
          name: 'get_url',
          snippet: 'get_url',
          doc: 'Prepends the site base URL to a relative asset or image path.',
          example: '<img src="{{ doc.company_logo | get_url }}" />'
        },
        {
          name: 'escape',
          snippet: 'escape',
          doc: 'Escapes HTML entities in a string for safe rendering.',
          example: '<span>{{ doc.custom_notes | escape }}</span>'
        },
        {
          name: 'upper',
          snippet: 'upper',
          doc: 'Converts a string to all UPPERCASE characters.',
          example: '<span>{{ doc.status | upper }}</span>'
        },
        {
          name: 'lower',
          snippet: 'lower',
          doc: 'Converts a string to all lowercase characters.',
          example: '<span>{{ doc.email_id | lower }}</span>'
        },
        {
          name: 'title',
          snippet: 'title',
          doc: 'Converts a string to Title Case.',
          example: '<span>{{ doc.full_name | title }}</span>'
        },
        {
          name: 'trim',
          snippet: 'trim',
          doc: 'Trims leading and trailing whitespace characters.',
          example: '<span>{{ doc.customer_name | trim }}</span>'
        },
        {
          name: 'default',
          snippet: 'default("${1:N/A}")',
          doc: 'Provides a fallback value if the variable is empty, None, or undefined.',
          example: '<span>Tax ID: {{ doc.tax_id | default("N/A") }}</span>'
        },
      ];

      for (const f of filters) {
        const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Method);
        item.detail = `Jinja Filter: | ${f.name}`;
        item.insertText = new vscode.SnippetString(f.snippet);
        item.documentation = new vscode.MarkdownString(`${f.doc}\n\n**Example:**\n\`\`\`jinja\n${f.example}\n\`\`\``);
        items.push(item);
      }
      return items;
    }

    // 4. Trigger `{{ _(` translation
    if (textBeforeCursor.match(/\{\{\s*_\($/)) {
      const transItem = new vscode.CompletionItem('_("...")', vscode.CompletionItemKind.Snippet);
      transItem.detail = 'Translate localized string';
      transItem.insertText = new vscode.SnippetString('\'${1:Text}\') }}');
      transItem.documentation = new vscode.MarkdownString('Translates a localized UI or print string according to active user language.\n\n**Example:**\n```jinja\n{{ _("Grand Total") }}\n```');
      items.push(transItem);
      return items;
    }

    return items;
  }
}

