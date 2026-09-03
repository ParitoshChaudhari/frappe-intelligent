import * as vscode from 'vscode';
import { FileClassifier } from '../context/fileClassifier';
import { IndexManager } from '../indexer/indexManager';
import { DocTypeSchema, FrappeApiSymbol } from '../core/types';

import pythonApis from '../data/pythonApis.json';
import jsApis from '../data/jsApis.json';
import formApis from '../data/formApis.json';
import hooksSchema from '../data/hooksSchema.json';

export class FrappeHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_$.]+/);
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const lineText = document.lineAt(position.line).text;
    const fileInfo = FileClassifier.classify(document.fileName, document.getText());
    const index = IndexManager.getInstance();

    // 1. Check Full Expression under cursor from Static API dataset
    let apiData = this.findApiSymbol(word, lineText, fileInfo.isServerCode);
    if (apiData) {
      return new vscode.Hover(this.renderHoverMarkdown(apiData, fileInfo.isServerCode));
    }

    // 2. Check Workspace-Indexed Python Classes and Methods
    if (fileInfo.isServerCode) {
      const pyClass = index.getPyClass(word);
      if (pyClass) {
        return new vscode.Hover(this.renderPyClassHover(pyClass));
      }

      const whitelisted = index.getWhitelistedMethod(word);
      if (whitelisted) {
        return new vscode.Hover(this.renderHoverMarkdown(whitelisted, true));
      }
    }

    // 3. Check if hovering over DocType name string (e.g. "Employee" in `frappe.get_doc("Employee", ...)`)
    const stringLiteralMatch = lineText.match(/["']([a-zA-Z0-9_ ]+)["']/);
    if (stringLiteralMatch && stringLiteralMatch[1] === word) {
      const schema = index.getDocType(word);
      if (schema) {
        return new vscode.Hover(this.renderDocTypeHover(schema));
      }
    }

    // Check if word itself matches a DocType name directly
    const directDocType = index.getDocType(word);
    if (directDocType && (word[0] === word[0].toUpperCase() || lineText.includes('DocType') || lineText.includes('get_doc'))) {
      return new vscode.Hover(this.renderDocTypeHover(directDocType));
    }

    // 4. Check if in hooks.py
    if (fileInfo.fileType === 'hooks_py') {
      const hook = (hooksSchema as any).hooks.find((h: any) => h.name === word);
      if (hook) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`### Frappe Hook: \`${hook.name}\`\n\n`);
        md.appendMarkdown(`**Type**: \`${hook.type}\`\n\n`);
        md.appendMarkdown(`${hook.description}\n\n`);
        md.appendMarkdown(`**Example:**\n\`\`\`python\n${hook.example}\n\`\`\``);
        return new vscode.Hover(md);
      }
    }

    return null;
  }

  private findApiSymbol(word: string, lineText: string, isServer: boolean): any | null {
    // 1. Check surrounding prefix in lineText if available
    if (lineText.includes(`frm.${word}`) || lineText.includes(`cur_frm.${word}`)) {
      const frmList = (formApis as any)['frm'];
      const found = frmList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`page.${word}`) || lineText.includes(`cur_page.${word}`)) {
      const pageList = (formApis as any)['page'];
      const found = pageList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`grid.${word}`)) {
      const gridList = (formApis as any)['grid'];
      const found = gridList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.db.${word}`)) {
      const dbList = isServer ? (pythonApis as any)['frappe.db'] : (jsApis as any)['frappe.db'];
      const found = dbList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.utils.${word}`)) {
      const utilsList = isServer ? (pythonApis as any)['frappe.utils'] : (jsApis as any)['frappe.utils'];
      const found = utilsList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.router.${word}`)) {
      const rList = (jsApis as any)['frappe.router'];
      const found = rList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.permissions.${word}`)) {
      const pList = (pythonApis as any)['frappe.permissions'];
      const found = pList?.find((item: any) => item.name === word);
      if (found) return found;
    }

    if (lineText.includes(`frappe.web_form.${word}`)) {
      const wfList = (jsApis as any)['frappe.web_form'];
      const found = wfList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`listview.${word}`)) {
      const lvList = (formApis as any)['listview'];
      const found = lvList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.session.${word}`)) {
      const sList = (pythonApis as any)['frappe.session'];
      const found = sList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.local.${word}`)) {
      const lList = (pythonApis as any)['frappe.local'];
      const found = lList?.find((item: any) => item.name === word);
      if (found) return found;
    }
    if (lineText.includes(`frappe.flags.${word}`)) {
      const fList = (pythonApis as any)['frappe.flags'];
      const found = fList?.find((item: any) => item.name === word);
      if (found) return found;
    }

    if (isServer) {
      for (const group of ['frappe', 'frappe.db', 'frappe.utils', 'frappe.qb', 'frappe.cache', 'frappe.permissions', 'frappe.model.naming', 'frappe.session', 'frappe.local', 'frappe.flags', 'Document']) {
        const list = (pythonApis as any)[group];
        if (Array.isArray(list)) {
          const found = list.find((item: any) => item.name === word || word === `${group}.${item.name}`);
          if (found) return found;
        }
      }
    } else {
      for (const group of ['frm', 'grid', 'page', 'listview']) {
        const list = (formApis as any)[group];
        if (Array.isArray(list)) {
          const found = list.find((item: any) => item.name === word || word === `${group}.${item.name}`);
          if (found) return found;
        }
      }

      for (const group of ['frappe', 'frappe.db', 'frappe.ui.Dialog', 'frappe.datetime', 'frappe.model', 'frappe.realtime', 'frappe.ui.form', 'frappe.router', 'frappe.utils', 'frappe.web_form', 'frappe.listview_settings']) {
        const list = (jsApis as any)[group];
        if (Array.isArray(list)) {
          const found = list.find((item: any) => item.name === word || word === `${group}.${item.name}`);
          if (found) return found;
        }
      }
    }


    return null;
  }


  private renderHoverMarkdown(api: any, isServer: boolean): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    const lang = isServer ? 'python' : 'javascript';

    md.appendCodeblock(api.signature || api.name, lang);
    md.appendMarkdown(`\n${api.docstring}\n\n`);

    if (api.parameters && api.parameters.length > 0) {
      md.appendMarkdown('#### 📥 Parameters:\n');
      for (const param of api.parameters) {
        const opt = param.optional ? ' *(optional)*' : ' **(required)**';
        const typeInfo = param.type ? `: \`${param.type}\`` : '';
        const structInfo = param.structure ? ` [Format: \`${param.structure}\`]` : '';
        const defInfo = param.default !== undefined ? ` *(default: \`${param.default}\`)*` : '';
        md.appendMarkdown(`- **\`${param.name}\`**${typeInfo}${structInfo}${opt}${defInfo}\n`);
        if (param.description) {
          md.appendMarkdown(`  ${param.description}\n`);
        }
      }
      md.appendMarkdown('\n');
    }

    if (api.returnType || api.returnDescription) {
      md.appendMarkdown('#### 📤 Returns:\n');
      if (api.returnType) {
        md.appendMarkdown(`- **Type**: \`${api.returnType}\`\n`);
      }
      if (api.returnDescription) {
        md.appendMarkdown(`- **Description**: ${api.returnDescription}\n`);
      }
      md.appendMarkdown('\n');
    }

    if (api.example) {
      md.appendMarkdown(`#### 💡 Usage Example:\n\`\`\`${lang}\n${api.example}\n\`\`\`\n\n`);
    }

    if (api.docUrl) {
      md.appendMarkdown(`---\n📖 [Open Frappe Framework Documentation](${api.docUrl})`);
    }

    return md;
  }

  private renderPyClassHover(pyClass: any): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendCodeblock(`class ${pyClass.name}(${pyClass.superclasses.join(', ')}):`, 'python');
    md.appendMarkdown(`\n${pyClass.docstring || 'Frappe Controller Class.'}\n\n`);

    if (pyClass.methods && pyClass.methods.size > 0) {
      md.appendMarkdown('#### Methods:\n');
      for (const [mName, mSymbol] of pyClass.methods.entries()) {
        const whitelistedBadge = mSymbol.isWhitelisted ? ' `⚡ @frappe.whitelist`' : '';
        md.appendMarkdown(`- **\`${mName}\`**${whitelistedBadge}\n`);
      }
      md.appendMarkdown('\n');
    }

    md.appendMarkdown(`---\n📁 *Defined in \`${vscode.workspace.asRelativePath(pyClass.filePath)}\`*`);
    return md;
  }

  private renderDocTypeHover(schema: DocTypeSchema): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`### Frappe DocType: \`${schema.name}\`\n\n`);
    md.appendMarkdown(`- **Module**: \`${schema.module || 'Core'}\`\n`);
    md.appendMarkdown(`- **App**: \`${schema.app || 'Installed'}\`\n`);
    md.appendMarkdown(`- **Total Fields**: ${schema.fields.length}\n`);

    if (schema.custom_fields && schema.custom_fields.length > 0) {
      md.appendMarkdown(`- **Custom Fields**: ${schema.custom_fields.length} ✨\n`);
    }

    if (schema.pyImportPath) {
      md.appendMarkdown(`- **Python Import**: \`from ${schema.pyImportPath} import ${schema.pyClassName || schema.name}\`\n`);
    }
    md.appendMarkdown('\n');

    md.appendMarkdown('#### Fields Preview:\n');
    const previewFields = schema.fields.slice(0, 10);
    for (const f of previewFields) {
      const customTag = f.is_custom ? ' `[Custom]`' : '';
      const reqTag = f.reqd ? ' **[Mandatory]**' : '';
      md.appendMarkdown(`- \`${f.fieldname}\` (${f.fieldtype})${customTag}${reqTag}\n`);
    }
    if (schema.fields.length > 10) {
      md.appendMarkdown(`*...and ${schema.fields.length - 10} more fields.*\n`);
    }

    return md;
  }
}

