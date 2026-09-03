import * as vscode from 'vscode';
import * as fs from 'fs';
import { DocTypeSchema, FrappeField } from '../core/types';
import { DocTypeIndexer } from '../indexer/doctypeIndexer';

/**
 * Webview panel that renders an interactive Frappe Desk Form mockup for any DocType JSON schema.
 * Hardened with strict HTML sanitization and Content Security Policy (CSP).
 */
export class DocTypePreviewPanel {
  public static currentPanel: DocTypePreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, schemaPath: string): void {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (DocTypePreviewPanel.currentPanel) {
      DocTypePreviewPanel.currentPanel._panel.reveal(column);
      DocTypePreviewPanel.currentPanel.update(schemaPath);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'frappeDocTypePreview',
      'Frappe Form Preview',
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: false, // Security: Disabled JavaScript execution inside form preview
        retainContextWhenHidden: true,
      }
    );

    DocTypePreviewPanel.currentPanel = new DocTypePreviewPanel(panel, schemaPath);
  }

  private constructor(panel: vscode.WebviewPanel, schemaPath: string) {
    this._panel = panel;
    this.update(schemaPath);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public update(schemaPath: string): void {
    if (!fs.existsSync(schemaPath)) return;
    const schema = DocTypeIndexer.parseDocTypeJson(schemaPath);
    if (!schema) return;

    this._panel.title = `Form Preview: ${this.escapeHtml(schema.name)}`;
    this._panel.webview.html = this.getHtmlForWebview(schema);
  }

  private escapeHtml(text: unknown): string {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getHtmlForWebview(schema: DocTypeSchema): string {
    const fieldsHtml = this.renderFieldsLayout(schema.fields);
    const safeTitle = this.escapeHtml(schema.name);
    const safeModule = this.escapeHtml(schema.module || 'Core');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocType Form Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .form-header {
            border-bottom: 1px solid var(--vscode-widget-border, #333);
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .form-title {
            font-size: 22px;
            font-weight: 600;
        }
        .badge {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .form-section {
            background: var(--vscode-editorWidget-background, rgba(255,255,255,0.03));
            border: 1px solid var(--vscode-widget-border, #444);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .field-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
        }
        .reqd {
            color: var(--vscode-errorForeground, #ff5555);
            font-weight: bold;
        }
        .field-input {
            padding: 8px 10px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border, #555);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 13px;
        }
        .field-table {
            grid-column: span 2;
            border: 1px dashed var(--vscode-widget-border, #666);
            border-radius: 6px;
            padding: 14px;
            background: rgba(0,0,0,0.1);
        }
        .table-title {
            font-weight: 600;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="form-header">
        <div class="form-title">${safeTitle}</div>
        <div>
            <span class="badge">${safeModule}</span>
            ${schema.is_submittable ? '<span class="badge" style="background:#28a745;">Submittable</span>' : ''}
            ${schema.is_single ? '<span class="badge" style="background:#17a2b8;">Single</span>' : ''}
            ${schema.istable ? '<span class="badge" style="background:#ffc107;color:#000;">Child Table</span>' : ''}
        </div>
    </div>

    <div class="form-body">
        ${fieldsHtml}
    </div>
</body>
</html>`;
  }

  private renderFieldsLayout(fields: FrappeField[]): string {
    const tabs: { label: string; fields: FrappeField[] }[] = [];
    let currentTab: { label: string; fields: FrappeField[] } = { label: 'Details', fields: [] };
    tabs.push(currentTab);

    for (const field of fields) {
      if (field.fieldtype === 'Tab Break') {
        const tabLabel = this.escapeHtml(field.label || 'Tab');
        currentTab = { label: tabLabel, fields: [] };
        tabs.push(currentTab);
        continue;
      }
      currentTab.fields.push(field);
    }

    let tabsNavHtml = '';
    if (tabs.length > 1) {
      tabsNavHtml = '<div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--vscode-widget-border, #444);padding-bottom:8px;">';
      tabs.forEach((t, idx) => {
        const activeStyle = idx === 0 ? 'background:var(--vscode-button-background);color:var(--vscode-button-foreground);font-weight:600;' : 'background:rgba(255,255,255,0.05);color:var(--vscode-descriptionForeground);';
        tabsNavHtml += `<span style="padding:6px 14px;border-radius:4px;font-size:13px;${activeStyle}">${t.label}</span>`;
      });
      tabsNavHtml += '</div>';
    }

    let bodyHtml = tabsNavHtml;

    for (const tab of tabs) {
      bodyHtml += `<div class="form-section"><div class="section-title">${tab.label}</div><div class="form-grid">`;

      for (const field of tab.fields) {
        if (['name', 'creation', 'modified', 'modified_by', 'owner', 'docstatus', 'idx'].includes(field.fieldname)) {
          continue;
        }

        const safeLabel = this.escapeHtml(field.label || field.fieldname);
        const safeFieldtype = this.escapeHtml(field.fieldtype);

        if (field.fieldtype === 'Section Break') {
          bodyHtml += `</div></div><div class="form-section"><div class="section-title">${safeLabel || 'Section'}</div><div class="form-grid">`;
          continue;
        }

        if (field.fieldtype === 'Column Break') {
          continue;
        }

        if (field.fieldtype === 'Table') {
          const safeOptions = this.escapeHtml(field.options || 'Table');
          bodyHtml += `<div class="field-table"><div class="table-title">Child Table: ${safeLabel} (${safeOptions})</div><div style="font-size:12px;opacity:0.7;">Grid Table widget preview with column headers for '${safeOptions}'.</div></div>`;
          continue;
        }

        const req = field.reqd ? '<span class="reqd">*</span>' : '';
        let inputWidget = `<input type="text" class="field-input" placeholder="${safeFieldtype}" disabled />`;

        if (field.fieldtype === 'Check') {
          inputWidget = `<input type="checkbox" style="width:18px;height:18px;" disabled />`;
        } else if (field.fieldtype === 'Select') {
          const firstOption = field.options ? this.escapeHtml(field.options.split('\n')[0]) : 'Select...';
          inputWidget = `<select class="field-input" disabled><option>${firstOption}</option></select>`;
        }

        bodyHtml += `<div class="form-field"><div class="field-label">${safeLabel} ${req}</div>${inputWidget}</div>`;
      }

      bodyHtml += '</div></div>';
    }

    return bodyHtml;
  }

  public dispose(): void {
    DocTypePreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
