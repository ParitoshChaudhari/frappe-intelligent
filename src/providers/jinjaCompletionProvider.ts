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
    if (textBeforeCursor.match(/\{\{\s*(?:doc|row|item)\.$/)) {
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
        { name: 'format', snippet: 'format(${1:doc.fieldname}, "${2:Currency}")', doc: 'Formats a value according to fieldtype rules' },
        { name: 'format_value', snippet: 'format_value(${1:doc.grand_total}, {"fieldtype": "${2:Currency}"})', doc: 'Formats raw value with fieldtype dictionary' },
        { name: 'db.get_value', snippet: 'db.get_value("${1:DocType}", "${2:name}", "${3:fieldname}")', doc: 'Fetches field value directly from database in template' },
        { name: 'db.get_list', snippet: 'db.get_list("${1:DocType}", filters={${2}}, fields=[${3}])', doc: 'Fetches list of records from database' },
        { name: 'get_doc', snippet: 'get_doc("${1:DocType}", "${2:name}")', doc: 'Fetches full Document object in Jinja' },
        { name: 'get_all', snippet: 'get_all("${1:DocType}", filters={${2}}, fields=[${3}])', doc: 'Fetches list of records ignoring permissions' },
        { name: 'get_meta', snippet: 'get_meta("${1:DocType}")', doc: 'Retrieves DocType metadata schema' },
        { name: 'render_template', snippet: 'render_template("${1:template_path}", {${2:context}})', doc: 'Renders sub-template or Jinja string' },
        { name: 'utils.today', snippet: 'utils.today()', doc: 'Current date string (YYYY-MM-DD)' },
        { name: 'utils.nowdate', snippet: 'utils.nowdate()', doc: 'Current date string (YYYY-MM-DD)' },
        { name: 'utils.format_date', snippet: 'utils.format_date(${1:doc.posting_date}, "${2:dd-mm-yyyy}")', doc: 'Formats date into pattern' },
        { name: 'utils.format_datetime', snippet: 'utils.format_datetime(${1:doc.creation})', doc: 'Formats timestamp with timezone' },
        { name: 'utils.money_in_words', snippet: 'utils.money_in_words(${1:doc.grand_total})', doc: 'Converts currency number to English words' },
        { name: 'session.user', snippet: 'session.user', doc: 'Current active session user email/ID' },
        { name: 'session.user_email', snippet: 'session.user_email', doc: 'Active session user email' },
        { name: 'form_dict', snippet: 'form_dict.${1:key}', doc: 'HTTP request URL parameters dictionary' },
      ];

      for (const h of helpers) {
        const item = new vscode.CompletionItem(h.name, vscode.CompletionItemKind.Function);
        item.detail = `Frappe Jinja: {{ frappe.${h.name} }}`;
        item.insertText = new vscode.SnippetString(h.snippet);
        item.documentation = new vscode.MarkdownString(h.doc);
        items.push(item);
      }
      return items;
    }

    // 3. Trigger `{{ ... | ` Jinja Filters
    if (textBeforeCursor.match(/\{\{[^}]+(\|\s*[a-zA-Z0-9_]*)$/)) {
      const filters = [
        { name: 'len', snippet: 'len', doc: 'Returns length / count of list or string' },
        { name: 'int', snippet: 'int', doc: 'Casts value to integer' },
        { name: 'float', snippet: 'float', doc: 'Casts value to floating point number' },
        { name: 'round', snippet: 'round(${1:2})', doc: 'Rounds number to N decimal places' },
        { name: 'json', snippet: 'json', doc: 'Serializes object to JSON string' },
        { name: 'striptags', snippet: 'striptags', doc: 'Strips HTML tags for clean text rendering' },
        { name: 'format_currency', snippet: 'format_currency', doc: 'Formats number according to currency symbol and separators' },
        { name: 'format_date', snippet: 'format_date("${1:dd-mm-yyyy}")', doc: 'Formats date string' },
        { name: 'format_datetime', snippet: 'format_datetime', doc: 'Formats timestamp string' },
        { name: 'get_fullname', snippet: 'get_fullname', doc: 'Converts user ID into full user display name' },
        { name: 'get_url', snippet: 'get_url', doc: 'Prepends site base URL to relative asset path' },
        { name: 'escape', snippet: 'escape', doc: 'Escapes HTML entities' },
        { name: 'upper', snippet: 'upper', doc: 'Converts string to uppercase' },
        { name: 'lower', snippet: 'lower', doc: 'Converts string to lowercase' },
        { name: 'title', snippet: 'title', doc: 'Converts string to Title Case' },
        { name: 'trim', snippet: 'trim', doc: 'Trims leading and trailing whitespace' },
        { name: 'default', snippet: 'default("${1:N/A}")', doc: 'Fallback value if variable is empty or undefined' },
      ];

      for (const f of filters) {
        const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Method);
        item.detail = `Jinja Filter: | ${f.name}`;
        item.insertText = new vscode.SnippetString(f.snippet);
        item.documentation = new vscode.MarkdownString(f.doc);
        items.push(item);
      }
      return items;
    }

    // 4. Trigger `{{ _(` translation
    if (textBeforeCursor.match(/\{\{\s*_\($/)) {
      const transItem = new vscode.CompletionItem('_("...")', vscode.CompletionItemKind.Snippet);
      transItem.detail = 'Translate localized string';
      transItem.insertText = new vscode.SnippetString('__("${1:Text}") }}');
      items.push(transItem);
      return items;
    }

    return items;
  }
}

