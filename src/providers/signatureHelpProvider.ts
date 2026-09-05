import * as vscode from 'vscode';
import { FileClassifier } from '../context/fileClassifier';
import { ScopeAnalyzer } from '../context/scopeAnalyzer';
import { IndexManager } from '../indexer/indexManager';
import pythonApis from '../data/pythonApis.json';
import jsApis from '../data/jsApis.json';
import formApis from '../data/formApis.json';

export class FrappeSignatureHelpProvider implements vscode.SignatureHelpProvider {
  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const lineText = document.lineAt(position.line).text;
    const fullText = document.getText();
    let textBeforeCursor = lineText.substring(0, position.character);

    if (!textBeforeCursor.includes('(')) {
      const reconstructed = ScopeAnalyzer.reconstructMultiLineContext(fullText, lineText, position.character);
      if (reconstructed) {
        textBeforeCursor = reconstructed;
      }
    }

    const callMatch = textBeforeCursor.match(/([a-zA-Z0-9_$.]+)\s*\(([^()]*)$/);
    if (!callMatch) return null;

    const callee = callMatch[1];
    const rawArgs = callMatch[2];
    const activeParam = ScopeAnalyzer.countArgumentIndex(rawArgs);

    const fileInfo = FileClassifier.classify(document.fileName, fullText);
    const apiSymbol = this.findApiSymbol(callee, fileInfo.isServerCode);

    if (!apiSymbol || !apiSymbol.parameters || apiSymbol.parameters.length === 0) return null;

    const help = new vscode.SignatureHelp();
    const sigInfo = new vscode.SignatureInformation(
      apiSymbol.signature || callee,
      new vscode.MarkdownString(apiSymbol.docstring)
    );

    for (const p of apiSymbol.parameters) {
      const struct = p.structure ? `\n\n📌 **Format / Example**: \`${p.structure}\`` : '';
      const def = p.default !== undefined ? ` *(default: \`${p.default}\`)*` : '';
      const opt = p.optional ? ' *(optional)*' : ' **(required)**';
      const pInfo = new vscode.ParameterInformation(
        p.name,
        new vscode.MarkdownString(`**Type**: \`${p.type || 'any'}\`${opt}${def}\n\n📖 **Description**: ${p.description || ''}${struct}\n\n---\n💡 *${apiSymbol.docstring}*`)
      );
      sigInfo.parameters.push(pInfo);
    }

    help.signatures = [sigInfo];
    help.activeSignature = 0;
    help.activeParameter = Math.min(activeParam, Math.max(0, apiSymbol.parameters.length - 1));

    return help;
  }

  private findApiSymbol(callee: string, isServer: boolean): any | null {
    const index = IndexManager.getInstance();

    // 1. Exact Callee Routing based on prefix
    if (callee.startsWith('frm.') || callee.startsWith('cur_frm.')) {
      const methodName = callee.replace(/^(?:cur_)?frm\./, '');
      const frmList = (formApis as any)['frm'];
      if (Array.isArray(frmList)) {
        const found = frmList.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('grid.')) {
      const methodName = callee.replace(/^grid\./, '');
      const gridList = (formApis as any)['grid'];
      if (Array.isArray(gridList)) {
        const found = gridList.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('page.') || callee.startsWith('cur_page.')) {
      const methodName = callee.replace(/^(?:cur_)?page\./, '');
      const pageList = (formApis as any)['page'];
      if (Array.isArray(pageList)) {
        const found = pageList.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('doc.') || callee.startsWith('self.')) {
      const methodName = callee.replace(/^(?:doc|self)\./, '');
      const docList = (pythonApis as any)['Document'];
      if (Array.isArray(docList)) {
        const found = docList.find((item: any) => item.name === methodName);
        if (found) return found;
      }
      if (!isServer) {
        const frmList = (formApis as any)['frm'];
        if (Array.isArray(frmList)) {
          const found = frmList.find((item: any) => item.name === methodName);
          if (found) return found;
        }
      }
    } else if (callee.startsWith('frappe.db.')) {
      const methodName = callee.replace(/^frappe\.db\./, '');
      const list = isServer ? (pythonApis as any)['frappe.db'] : (jsApis as any)['frappe.db'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.utils.')) {
      const methodName = callee.replace(/^frappe\.utils\./, '');
      const list = isServer ? (pythonApis as any)['frappe.utils'] : (jsApis as any)['frappe.utils'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.router.')) {
      const methodName = callee.replace(/^frappe\.router\./, '');
      const list = (jsApis as any)['frappe.router'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.datetime.')) {
      const methodName = callee.replace(/^frappe\.datetime\./, '');
      const list = (jsApis as any)['frappe.datetime'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.model.naming.')) {
      const methodName = callee.replace(/^frappe\.model\.naming\./, '');
      const list = (pythonApis as any)['frappe.model.naming'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.permissions.')) {
      const methodName = callee.replace(/^frappe\.permissions\./, '');
      const list = (pythonApis as any)['frappe.permissions'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.qb.')) {
      const methodName = callee.replace(/^frappe\.qb\.(?:functions\.)?/, '');
      const list = (pythonApis as any)['frappe.qb'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.cache')) {
      const methodName = callee.replace(/^frappe\.cache(?:\(\))?\./, '');
      const list = (pythonApis as any)['frappe.cache'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.')) {
      const methodName = callee.replace(/^frappe\./, '');
      const list = isServer ? (pythonApis as any)['frappe'] : (jsApis as any)['frappe'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.web_form.')) {
      const methodName = callee.replace(/^frappe\.web_form\./, '');
      const list = (jsApis as any)['frappe.web_form'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('listview.')) {
      const methodName = callee.replace(/^listview\./, '');
      const list = (formApis as any)['listview'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.session.')) {
      const propName = callee.replace(/^frappe\.session\./, '');
      const list = (pythonApis as any)['frappe.session'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === propName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.local.')) {
      const propName = callee.replace(/^frappe\.local\./, '');
      const list = (pythonApis as any)['frappe.local'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === propName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.flags.')) {
      const propName = callee.replace(/^frappe\.flags\./, '');
      const list = (pythonApis as any)['frappe.flags'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === propName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.model.')) {
      const methodName = callee.replace(/^frappe\.model\./, '');
      const list = (jsApis as any)['frappe.model'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.ui.form.')) {
      const methodName = callee.replace(/^frappe\.ui\.form\./, '');
      const list = (jsApis as any)['frappe.ui.form'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('frappe.ui.Dialog.') || callee.startsWith('dialog.') || callee.startsWith('d.') || callee.startsWith('cur_dialog.')) {
      const methodName = callee.replace(/^(?:frappe\.ui\.Dialog|dialog|d|cur_dialog)\./, '');
      const list = (jsApis as any)['frappe.ui.Dialog'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === methodName);
        if (found) return found;
      }
    } else if (callee.startsWith('locals')) {
      const list = (jsApis as any)['locals'];
      if (Array.isArray(list)) {
        const found = list.find((item: any) => item.name === 'locals');
        if (found) return found;
      }
    }

    // 2. Fallback search
    if (isServer) {
      const groups = ['frappe', 'frappe.db', 'frappe.utils', 'frappe.qb', 'frappe.cache', 'frappe.permissions', 'frappe.model.naming', 'Document'];
      for (const group of groups) {
        const list = (pythonApis as any)[group];
        if (Array.isArray(list)) {
          const found = list.find((item: any) => item.name === callee || callee.endsWith(`.${item.name}`));
          if (found) return found;
        }
      }

      const whitelisted = index.getWhitelistedMethod(callee);
      if (whitelisted) return whitelisted;
    } else {
      const groups = ['frm', 'grid', 'page', 'listview', 'frappe', 'locals', 'frappe.globals', 'frappe.db', 'frappe.model', 'frappe.ui.Dialog', 'frappe.ui.form', 'frappe.datetime', 'frappe.router', 'frappe.utils', 'frappe.web_form', 'frappe.listview_settings'];
      for (const group of groups) {
        const list = (formApis as any)[group] || (jsApis as any)[group];
        if (Array.isArray(list)) {
          const found = list.find((item: any) => item.name === callee || callee.endsWith(`.${item.name}`));
          if (found) return found;
        }
      }
    }

    return null;
  }
}

