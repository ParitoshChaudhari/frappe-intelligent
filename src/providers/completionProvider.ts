import * as vscode from 'vscode';
import { FileClassifier } from '../context/fileClassifier';
import { ScopeAnalyzer } from '../context/scopeAnalyzer';
import { IndexManager } from '../indexer/indexManager';
import { DocTypeSchema, FrappeField } from '../core/types';

import pythonApis from '../data/pythonApis.json';
import jsApis from '../data/jsApis.json';
import formApis from '../data/formApis.json';
import hooksSchema from '../data/hooksSchema.json';

export class FrappeCompletionProvider implements vscode.CompletionItemProvider {
  // Pre-cached static completion items to eliminate memory allocation and GC pauses
  private static cachedPyUtils: vscode.CompletionItem[] = [];
  private static cachedPyQb: vscode.CompletionItem[] = [];
  private static cachedPyCache: vscode.CompletionItem[] = [];
  private static cachedPyDb: vscode.CompletionItem[] = [];
  private static cachedPyFrappe: vscode.CompletionItem[] = [];
  private static cachedPyDoc: vscode.CompletionItem[] = [];
  private static cachedPyPermissions: vscode.CompletionItem[] = [];
  private static cachedPyNaming: vscode.CompletionItem[] = [];

  private static cachedPySession: vscode.CompletionItem[] = [];
  private static cachedPyLocal: vscode.CompletionItem[] = [];
  private static cachedPyFlags: vscode.CompletionItem[] = [];

  private static cachedJsDatetime: vscode.CompletionItem[] = [];
  private static cachedJsModel: vscode.CompletionItem[] = [];
  private static cachedJsRealtime: vscode.CompletionItem[] = [];
  private static cachedJsDialog: vscode.CompletionItem[] = [];
  private static cachedJsGrid: vscode.CompletionItem[] = [];
  private static cachedJsDb: vscode.CompletionItem[] = [];
  private static cachedJsFrappe: vscode.CompletionItem[] = [];
  private static cachedJsFrm: vscode.CompletionItem[] = [];
  private static cachedJsRouter: vscode.CompletionItem[] = [];
  private static cachedJsUtils: vscode.CompletionItem[] = [];
  private static cachedFormPage: vscode.CompletionItem[] = [];
  private static cachedJsWebForm: vscode.CompletionItem[] = [];
  private static cachedJsListViewSettings: vscode.CompletionItem[] = [];
  private static cachedFormListView: vscode.CompletionItem[] = [];
  private static cachedJsLocals: vscode.CompletionItem[] = [];
  private static cachedJsGlobals: vscode.CompletionItem[] = [];
  private static cachedJsUi: vscode.CompletionItem[] = [];

  private static cachedHooks: vscode.CompletionItem[] = [];
  private static cachedDfProps: vscode.CompletionItem[] = [];
  private static isInitialized = false;

  constructor() {
    FrappeCompletionProvider.initializeCache();
  }

  private static initializeCache(): void {
    if (this.isInitialized) return;

    // Python pre-caching
    this.cachedPyUtils = this.buildItems((pythonApis as any)['frappe.utils'], vscode.CompletionItemKind.Function, 'python');
    this.cachedPyQb = this.buildItems((pythonApis as any)['frappe.qb'], vscode.CompletionItemKind.Function, 'python');
    this.cachedPyCache = this.buildItems((pythonApis as any)['frappe.cache'], vscode.CompletionItemKind.Method, 'python');
    this.cachedPyDb = this.buildItems((pythonApis as any)['frappe.db'], vscode.CompletionItemKind.Method, 'python');
    this.cachedPyFrappe = this.buildItems((pythonApis as any)['frappe'], vscode.CompletionItemKind.Function, 'python');
    this.cachedPyDoc = this.buildItems((pythonApis as any)['Document'], vscode.CompletionItemKind.Method, 'python');
    this.cachedPyPermissions = this.buildItems((pythonApis as any)['frappe.permissions'], vscode.CompletionItemKind.Function, 'python');
    this.cachedPyNaming = this.buildItems((pythonApis as any)['frappe.model.naming'], vscode.CompletionItemKind.Function, 'python');
    this.cachedPySession = this.buildItems((pythonApis as any)['frappe.session'], vscode.CompletionItemKind.Property, 'python');
    this.cachedPyLocal = this.buildItems((pythonApis as any)['frappe.local'], vscode.CompletionItemKind.Property, 'python');
    this.cachedPyFlags = this.buildItems((pythonApis as any)['frappe.flags'], vscode.CompletionItemKind.Property, 'python');

    // JS pre-caching
    this.cachedJsDatetime = this.buildItems((jsApis as any)['frappe.datetime'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedJsModel = this.buildItems((jsApis as any)['frappe.model'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedJsRealtime = this.buildItems((jsApis as any)['frappe.realtime'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedJsDialog = this.buildItems((jsApis as any)['frappe.ui.Dialog']?.filter((d: any) => d.name !== 'Dialog') || [], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsGrid = this.buildItems((formApis as any)['grid'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsDb = this.buildItems((jsApis as any)['frappe.db'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsFrappe = this.buildItems((jsApis as any)['frappe'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedJsFrm = this.buildItems((formApis as any)['frm'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsRouter = this.buildItems((jsApis as any)['frappe.router'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedJsUtils = this.buildItems((jsApis as any)['frappe.utils'], vscode.CompletionItemKind.Function, 'javascript');
    this.cachedFormPage = this.buildItems((formApis as any)['page'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsWebForm = this.buildItems((jsApis as any)['frappe.web_form'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsListViewSettings = this.buildItems((jsApis as any)['frappe.listview_settings'], vscode.CompletionItemKind.Property, 'javascript');
    this.cachedFormListView = this.buildItems((formApis as any)['listview'], vscode.CompletionItemKind.Method, 'javascript');
    this.cachedJsLocals = this.buildItems((jsApis as any)['locals'] || [], vscode.CompletionItemKind.Variable, 'javascript');
    this.cachedJsGlobals = this.buildItems((jsApis as any)['frappe.globals'] || [], vscode.CompletionItemKind.Variable, 'javascript');

    const uiNamespaces = ['Dialog', 'form', 'toolbar', 'keys', 'misc'];
    this.cachedJsUi = uiNamespaces.map((ns) => {
      const item = new vscode.CompletionItem(ns, vscode.CompletionItemKind.Module);
      item.detail = `frappe.ui.${ns}`;
      return item;
    });

    // Hooks pre-caching
    this.cachedHooks = (hooksSchema as any).hooks.map((hook: any) => {
      const item = new vscode.CompletionItem(hook.name, vscode.CompletionItemKind.Variable);
      item.detail = `Frappe Hook: ${hook.type}`;
      item.documentation = new vscode.MarkdownString(`${hook.description}\n\n\`\`\`python\n${hook.example}\n\`\`\``);
      item.insertText = new vscode.SnippetString(`${hook.name} = $0`);
      return item;
    });

    // DocField properties pre-caching
    const props = [
      { name: 'reqd', desc: 'Mandatory / Required property (boolean: 1 or 0)' },
      { name: 'read_only', desc: 'Read-only / Disabled property (boolean: 1 or 0)' },
      { name: 'hidden', desc: 'Hidden / Visibility property (boolean: 1 or 0)' },
      { name: 'options', desc: 'Select options or Link DocType target' },
      { name: 'label', desc: 'Field display label' },
      { name: 'description', desc: 'Help text description below input' },
      { name: 'placeholder', desc: 'Placeholder text inside input' },
    ];
    this.cachedDfProps = props.map((p) => {
      const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
      item.detail = `DocField Property: ${p.name}`;
      item.documentation = new vscode.MarkdownString(p.desc);
      return item;
    });

    this.isInitialized = true;
  }

  private static buildItems(apis: any[], kind: vscode.CompletionItemKind, lang: string): vscode.CompletionItem[] {
    if (!Array.isArray(apis)) return [];
    return apis.map((api) => {
      const item = new vscode.CompletionItem(api.name, kind);
      item.detail = api.signature || api.name;

      const doc = new vscode.MarkdownString();
      doc.appendMarkdown(`${api.docstring}\n\n`);

      if (api.parameters && api.parameters.length > 0) {
        doc.appendMarkdown('**Parameters:**\n');
        for (const param of api.parameters) {
          const struct = param.structure ? ` [Format: \`${param.structure}\`]` : '';
          doc.appendMarkdown(`- \`${param.name}\`${param.type ? ` (\`${param.type}\`)` : ''}${struct}: ${param.description || ''}\n`);
        }
        doc.appendMarkdown('\n');
      }

      if (api.returnType || api.returnDescription) {
        doc.appendMarkdown(`**Returns**: \`${api.returnType || 'Any'}\`${api.returnDescription ? ` — ${api.returnDescription}` : ''}\n\n`);
      }

      if (api.example) {
        doc.appendMarkdown(`**Example:**\n\`\`\`${lang}\n${api.example}\n\`\`\`\n\n`);
      }
      if (api.docUrl) {
        doc.appendMarkdown(`[Frappe Documentation](${api.docUrl})`);
      }
      item.documentation = doc;
      return item;
    });
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const lineText = document.lineAt(position.line).text;
    const fullText = document.getText();
    const fileInfo = FileClassifier.classify(document.fileName, fullText);
    const scope = ScopeAnalyzer.analyze(lineText, position.character, fileInfo, fullText);
    const index = IndexManager.getInstance();

    // 0. Python Import Statements Completion (e.g. `from hrms...` or `import hrms...`)
    if (fileInfo.isServerCode && scope.importContext) {
      return this.provideImportCompletions(scope.importContext, index);
    }

    // 0.1 Inferred Child Table Row Completion (e.g. `for item in self.items: item.` or `let row = frm.add_child('items'); row.`)
    if (scope.childTableRowDocType) {
      const childSchema = index.getDocType(scope.childTableRowDocType);
      if (childSchema) {
        return this.buildFieldCompletionItems(childSchema);
      }
    }

    // 0.2 `frm.fields_dict.` or `cur_frm.fields_dict.` completion
    if (scope.targetObject === 'frm.fields_dict' || scope.targetObject === 'cur_frm.fields_dict') {
      const targetDt = scope.currentDocType;
      if (targetDt) {
        const schema = index.getDocType(targetDt);
        if (schema) {
          return this.buildFieldCompletionItems(schema);
        }
      }
    }

    // 1. Python Target: `frappe.utils.`
    if (fileInfo.isServerCode && (scope.targetObject === 'frappe.utils' || scope.targetObject === 'utils')) {
      return FrappeCompletionProvider.cachedPyUtils;
    }

    // 2. Python Target: `frappe.qb.`
    if (fileInfo.isServerCode && scope.targetObject === 'frappe.qb') {
      return FrappeCompletionProvider.cachedPyQb;
    }

    // 3. Python Target: `frappe.cache.`
    if (fileInfo.isServerCode && (scope.targetObject === 'frappe.cache' || scope.targetObject === 'frappe.cache()')) {
      return FrappeCompletionProvider.cachedPyCache;
    }

    // Python Target: `frappe.permissions.`
    if (fileInfo.isServerCode && scope.targetObject === 'frappe.permissions') {
      return FrappeCompletionProvider.cachedPyPermissions;
    }

    // Python Target: `frappe.model.naming.`
    if (fileInfo.isServerCode && (scope.targetObject === 'frappe.model.naming' || scope.targetObject === 'naming')) {
      return FrappeCompletionProvider.cachedPyNaming;
    }

    // Python Target: `frappe.session.`
    if (fileInfo.isServerCode && scope.targetObject === 'frappe.session') {
      return FrappeCompletionProvider.cachedPySession;
    }

    // Python Target: `frappe.local.`
    if (fileInfo.isServerCode && scope.targetObject === 'frappe.local') {
      return FrappeCompletionProvider.cachedPyLocal;
    }

    // Python Target: `frappe.flags.`
    if (fileInfo.isServerCode && scope.targetObject === 'frappe.flags') {
      return FrappeCompletionProvider.cachedPyFlags;
    }

    // JS Target: `frappe.web_form.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.web_form') {
      return FrappeCompletionProvider.cachedJsWebForm;
    }

    // JS Target: `listview.` or `cur_list.`
    if (fileInfo.isClientCode && (scope.targetObject === 'listview' || scope.targetObject === 'cur_list')) {
      return FrappeCompletionProvider.cachedFormListView;
    }

    // JS Target: `frappe.listview_settings`
    if (fileInfo.isClientCode && (scope.targetObject === 'frappe.listview_settings' || scope.targetObject?.includes('listview_settings'))) {
      return FrappeCompletionProvider.cachedJsListViewSettings;
    }

    // 4. JS Target: `frappe.datetime.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.datetime') {
      return FrappeCompletionProvider.cachedJsDatetime;
    }

    // 5. JS Target: `frappe.model.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.model') {
      return FrappeCompletionProvider.cachedJsModel;
    }

    // 6. JS Target: `frappe.realtime.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.realtime') {
      return FrappeCompletionProvider.cachedJsRealtime;
    }

    // JS Target: `frappe.router.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.router') {
      return FrappeCompletionProvider.cachedJsRouter;
    }

    // JS Target: `frappe.utils.` (JS)
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.utils') {
      return FrappeCompletionProvider.cachedJsUtils;
    }

    // JS Target: `frappe.ui.`
    if (fileInfo.isClientCode && scope.targetObject === 'frappe.ui') {
      return FrappeCompletionProvider.cachedJsUi;
    }

    // JS Target: `frappe.ui.Dialog` or `Dialog.`
    if (fileInfo.isClientCode && (scope.targetObject === 'frappe.ui.Dialog' || scope.targetObject === 'Dialog')) {
      return FrappeCompletionProvider.cachedJsDialog;
    }

    // 7. JS Target: `dialog.` / `d.` / `cur_dialog.`
    if (fileInfo.isClientCode && (scope.targetObject === 'dialog' || scope.targetObject === 'd' || scope.targetObject === 'cur_dialog')) {
      return FrappeCompletionProvider.cachedJsDialog;
    }

    // 8. JS Target: `grid.`
    if (fileInfo.isClientCode && (scope.targetObject?.endsWith('grid') || scope.targetObject === 'grid')) {
      return FrappeCompletionProvider.cachedJsGrid;
    }

    // JS Target: `page.` or `cur_page.`
    if (fileInfo.isClientCode && (scope.targetObject === 'page' || scope.targetObject === 'cur_page')) {
      return FrappeCompletionProvider.cachedFormPage;
    }

    // JS Target: `locals[cdt][cdn].` or `locals.`
    if (fileInfo.isClientCode && (scope.targetObject === 'locals[cdt][cdn]' || scope.targetObject?.startsWith('locals'))) {
      const targetDt = scope.childTableRowDocType || scope.currentDocType;
      if (targetDt) {
        const schema = index.getDocType(targetDt);
        if (schema) {
          return this.buildFieldCompletionItems(schema);
        }
      }
      return FrappeCompletionProvider.cachedJsLocals;
    }

    // 9. Target Object: `frappe.db.`
    if (scope.targetObject === 'frappe.db') {
      return fileInfo.isServerCode ? FrappeCompletionProvider.cachedPyDb : FrappeCompletionProvider.cachedJsDb;
    }

    // 10. Target Object: `frappe.`
    if (scope.targetObject === 'frappe') {
      const baseItems = fileInfo.isServerCode ? FrappeCompletionProvider.cachedPyFrappe : FrappeCompletionProvider.cachedJsFrappe;
      const namespaces = fileInfo.isServerCode
        ? ['db', 'utils', 'qb', 'cache', 'flags', 'session']
        : ['db', 'ui', 'datetime', 'model', 'realtime', 'router', 'route_options', 'session'];

      const nsItems = namespaces.map((ns) => {
        const item = new vscode.CompletionItem(ns, vscode.CompletionItemKind.Module);
        item.detail = `frappe.${ns} namespace`;
        return item;
      });

      return [...baseItems, ...nsItems];
    }

    // 11. Target Object: `frm.` or `cur_frm.`
    if (scope.targetObject === 'frm' || scope.targetObject === 'cur_frm') {
      const items = [...FrappeCompletionProvider.cachedJsFrm];
      const targetDt = scope.currentDocType;
      if (targetDt) {
        const schema = index.getDocType(targetDt);
        if (schema) {
          for (const field of schema.fields) {
            const isCustom = field.is_custom ? ' [Custom Field]' : '';
            const fieldItem = new vscode.CompletionItem(`doc.${field.fieldname}`, vscode.CompletionItemKind.Field);
            fieldItem.detail = `${field.label} (${field.fieldtype})${isCustom}`;
            items.push(fieldItem);
          }
        }
      }
      return items;
    }

    // Target Object: `frm.doc.` or `cur_frm.doc.`
    if (scope.targetObject === 'frm.doc' || scope.targetObject === 'cur_frm.doc') {
      const targetDt = scope.currentDocType;
      if (targetDt) {
        const schema = index.getDocType(targetDt);
        if (schema) {
          return this.buildFieldCompletionItems(schema);
        }
      }
    }

    // 12. Target Object: `doc.` or `self.` in Python Document controllers
    if (fileInfo.isServerCode && (scope.targetObject === 'doc' || scope.targetObject === 'self')) {
      const items = [...FrappeCompletionProvider.cachedPyDoc];
      if (scope.currentDocType) {
        const schema = index.getDocType(scope.currentDocType);
        if (schema) {
          items.push(...this.buildFieldCompletionItems(schema));
        }
      }
      return items;
    }

    // 13. Whitelisted Method Completion in `frappe.call({ method: "..." })` or `frappe.xcall("...")`
    if (scope.callContext?.callee === 'frappe.call' || scope.callContext?.callee === 'frappe.xcall') {
      const items: vscode.CompletionItem[] = [];
      if (scope.callContext.isObjectLiteral) {
        const methodKeyItem = new vscode.CompletionItem('method', vscode.CompletionItemKind.Property);
        methodKeyItem.detail = 'Whitelisted API Endpoint';
        methodKeyItem.insertText = new vscode.SnippetString('method: "$1",\nargs: {\n\t$0\n},\ncallback: function(r) {\n\t\n}');
        items.push(methodKeyItem);

        const props = ['args', 'callback', 'error', 'freeze', 'freeze_message', 'async'];
        for (const prop of props) {
          items.push(new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property));
        }
      }

      if (scope.callContext.callee === 'frappe.xcall' && scope.callContext.argIndex === 0 || scope.callContext.callee === 'frappe.call') {
        const whitelisted = index.getAllWhitelistedMethods();
        for (const wm of whitelisted) {
          const wmItem = new vscode.CompletionItem(wm.name, vscode.CompletionItemKind.Value);
          wmItem.detail = `Whitelisted Method: ${wm.signature}`;
          wmItem.documentation = new vscode.MarkdownString(wm.docstring);
          items.push(wmItem);
        }
        return items;
      }
    }

    // 14. DocType Name Completions in DocType-expecting function calls
    const docTypeCallees = [
      'frappe.get_doc',
      'frappe.get_cached_doc',
      'frappe.get_all',
      'frappe.get_list',
      'frappe.get_value',
      'frappe.get_cached_value',
      'frappe.new_doc',
      'frappe.get_single',
      'frappe.get_meta',
      'frappe.copy_doc',
      'frappe.delete_doc',
      'frappe.rename_doc',
      'frappe.reload_doctype',
      'frappe.db.get_value',
      'frappe.db.get_values',
      'frappe.db.set_value',
      'frappe.db.exists',
      'frappe.db.count',
      'frappe.db.delete',
      'frappe.db.truncate',
      'frappe.db.get_doc',
      'frappe.db.get_list',
      'frappe.db.insert',
      'frappe.qb.DocType',
      'frappe.qb.from_',
      'frappe.model.get_doc',
      'frappe.model.get_value',
      'frappe.model.set_value',
      'frappe.model.add_child',
      'frappe.model.clear_table',
      'frappe.model.delete_doc',
      'frappe.model.with_doctype',
      'frappe.model.with_doc',
      'frappe.model.is_submittable',
      'frappe.model.is_single',
      'frappe.model.is_tree',
      'frappe.model.can_create',
      'frappe.model.can_read',
      'frappe.model.can_write',
      'frappe.model.can_delete',
      'frappe.model.can_cancel',
      'frappe.ui.form.on',
      'frappe.set_route',
    ];

    if (scope.callContext && docTypeCallees.includes(scope.callContext.callee)) {
      if (scope.callContext.argIndex === 0) {
        return this.buildDocTypeCompletionItems(index);
      }

      // Field completions in 2nd or 3rd argument when target DocType is known
      if (scope.callContext.argIndex > 0) {
        const targetDt = scope.targetDocTypeInCall || scope.currentDocType;
        if (targetDt) {
          const schema = index.getDocType(targetDt);
          if (schema) {
            return this.buildFieldCompletionItems(schema);
          }
        }
      }
    }

    // 15. DocField Name Completions inside Form Script Arguments
    if (scope.callContext && ['frm.set_value', 'frm.get_value', 'frm.get_field', 'frm.toggle_display', 'frm.toggle_enable', 'frm.toggle_reqd', 'frm.set_df_property', 'frm.refresh_field', 'frm.set_query', 'frm.add_child', 'frm.clear_table', 'doc.get', 'doc.set', 'doc.db_set'].includes(scope.callContext.callee)) {
      if (scope.callContext.argIndex === 0 && scope.currentDocType) {
        const schema = index.getDocType(scope.currentDocType);
        if (schema) {
          return this.buildFieldCompletionItems(schema);
        }
      }

      // 16. DocField Property Completion in 2nd argument of `frm.set_df_property("field", "...")`
      if (scope.callContext.callee === 'frm.set_df_property' && scope.callContext.argIndex === 1) {
        return FrappeCompletionProvider.cachedDfProps;
      }
    }

    // 17. Hooks completion in `hooks.py`
    if (fileInfo.fileType === 'hooks_py') {
      return FrappeCompletionProvider.cachedHooks;
    }

    return [];
  }

  private buildDocTypeCompletionItems(index: IndexManager): vscode.CompletionItem[] {
    const doctypes = index.getAllDocTypes();
    return doctypes.map((dt) => {
      const dtItem = new vscode.CompletionItem(dt.name, vscode.CompletionItemKind.Class);
      const customCount = dt.custom_fields?.length || 0;
      const customBadge = customCount > 0 ? ` (${customCount} Custom Fields)` : '';
      dtItem.detail = `DocType: ${dt.name} (${dt.module || 'Core'})${customBadge}`;

      const doc = new vscode.MarkdownString();
      doc.appendMarkdown(`### Frappe DocType: \`${dt.name}\`\n\n`);
      doc.appendMarkdown(`- **Module**: \`${dt.module || 'Core'}\`\n`);
      doc.appendMarkdown(`- **App**: \`${dt.app || 'Installed'}\`\n`);
      doc.appendMarkdown(`- **Total Fields**: ${dt.fields.length}\n`);
      if (customCount > 0) {
        doc.appendMarkdown(`- **Custom Fields**: ${customCount}\n`);
      }
      if (dt.pyImportPath) {
        doc.appendMarkdown(`- **Python Import**: \`from ${dt.pyImportPath} import ${dt.pyClassName || dt.name}\`\n`);
      }
      dtItem.documentation = doc;
      return dtItem;
    });
  }

  private buildFieldCompletionItems(schema: DocTypeSchema): vscode.CompletionItem[] {
    return schema.fields.map((field) => {
      const fieldItem = new vscode.CompletionItem(field.fieldname, vscode.CompletionItemKind.Field);
      const customTag = field.is_custom ? ' [Custom Field]' : '';
      fieldItem.detail = `${field.label} (${field.fieldtype})${customTag}`;

      const doc = new vscode.MarkdownString();
      doc.appendMarkdown(`**DocType**: \`${schema.name}\`\n\n`);
      doc.appendMarkdown(`- **Fieldname**: \`${field.fieldname}\`\n`);
      doc.appendMarkdown(`- **Label**: ${field.label}\n`);
      doc.appendMarkdown(`- **Type**: \`${field.fieldtype}\`\n`);
      doc.appendMarkdown(`- **Mandatory**: ${Boolean(field.reqd)}\n`);
      if (field.is_custom) {
        doc.appendMarkdown(`- **Custom Field**: Yes ✨\n`);
      }
      if (field.options) {
        doc.appendMarkdown(`- **Options**: \`${field.options}\`\n`);
      }
      if (field.description) {
        doc.appendMarkdown(`- **Description**: ${field.description}\n`);
      }
      fieldItem.documentation = doc;
      return fieldItem;
    });
  }

  private provideImportCompletions(
    importContext: { isImport: boolean; isFromImport: boolean; modulePrefix?: string },
    index: IndexManager
  ): vscode.CompletionItem[] {
    const symbols = index.getAllImportSymbols();
    const items: vscode.CompletionItem[] = [];
    const seenPaths = new Set<string>();

    if (importContext.isFromImport) {
      // User is in `from <module> import <symbol>`
      // 1. Suggest all module paths
      for (const sym of symbols) {
        if (!seenPaths.has(sym.importPath)) {
          seenPaths.add(sym.importPath);
          const modItem = new vscode.CompletionItem(sym.importPath, vscode.CompletionItemKind.Module);
          modItem.detail = `Frappe App Module: ${sym.appName}`;
          items.push(modItem);
        }

        // 2. Suggest symbols (classes, functions, doctypes)
        if (sym.symbolName) {
          const kind = sym.symbolType === 'doctype' || sym.symbolType === 'class'
            ? vscode.CompletionItemKind.Class
            : vscode.CompletionItemKind.Function;
          const symItem = new vscode.CompletionItem(sym.symbolName, kind);
          symItem.detail = `${sym.symbolType === 'doctype' ? 'DocType Controller' : sym.symbolType}: ${sym.importPath}.${sym.symbolName}`;
          if (sym.docstring) {
            symItem.documentation = new vscode.MarkdownString(sym.docstring);
          }
          items.push(symItem);
        }
      }

      // Also suggest standard Frappe imports
      const standardFrappeModules = [
        'frappe',
        'frappe.utils',
        'frappe.model.document',
        'frappe.query_builder',
        'frappe.desk.form.load',
      ];
      for (const m of standardFrappeModules) {
        if (!seenPaths.has(m)) {
          seenPaths.add(m);
          const item = new vscode.CompletionItem(m, vscode.CompletionItemKind.Module);
          item.detail = 'Frappe Core Module';
          items.push(item);
        }
      }
    } else {
      // User is in `import <module>`
      for (const sym of symbols) {
        if (!seenPaths.has(sym.importPath)) {
          seenPaths.add(sym.importPath);
          const modItem = new vscode.CompletionItem(sym.importPath, vscode.CompletionItemKind.Module);
          modItem.detail = `Frappe Module: ${sym.appName}`;
          items.push(modItem);
        }
      }
    }

    return items;
  }
}

