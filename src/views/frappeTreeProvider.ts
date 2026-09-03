import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DocTypeSchema, FrappeField } from '../core/types';
import { IndexManager } from '../indexer/indexManager';

export type TreeItemType = 'app' | 'module' | 'doctype' | 'field' | 'file_action';

export class FrappeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: TreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly appName?: string,
    public readonly moduleName?: string,
    public readonly doctypeSchema?: DocTypeSchema,
    public readonly field?: FrappeField,
    public readonly targetFilePath?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = itemType;
    this.setupVisuals();
  }

  private setupVisuals(): void {
    if (this.itemType === 'app') {
      this.iconPath = new vscode.ThemeIcon('package');
      this.description = this.appName;
    } else if (this.itemType === 'module') {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (this.itemType === 'doctype') {
      if (this.doctypeSchema?.istable) {
        this.iconPath = new vscode.ThemeIcon('table');
        this.description = 'Child Table';
      } else if (this.doctypeSchema?.is_single) {
        this.iconPath = new vscode.ThemeIcon('file-text');
        this.description = 'Single';
      } else {
        this.iconPath = new vscode.ThemeIcon('symbol-class');
      }

      this.tooltip = `DocType: ${this.label} (${this.doctypeSchema?.fields.length || 0} fields)`;
    } else if (this.itemType === 'field') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      const req = this.field?.reqd ? ' *' : '';
      this.description = `${this.field?.fieldtype || 'Data'}${req}`;
      this.tooltip = `Fieldname: ${this.field?.fieldname}\nType: ${this.field?.fieldtype}\nMandatory: ${Boolean(this.field?.reqd)}`;
    } else if (this.itemType === 'file_action') {
      this.iconPath = new vscode.ThemeIcon('go-to-file');
      if (this.targetFilePath) {
        this.command = {
          command: 'frappeIntelligent.openDocTypeFile',
          title: 'Open File',
          arguments: [this.targetFilePath],
        };
      }
    }
  }
}

export class FrappeTreeProvider implements vscode.TreeDataProvider<FrappeTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FrappeTreeItem | undefined | void> = new vscode.EventEmitter<FrappeTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FrappeTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: FrappeTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: FrappeTreeItem): vscode.ProviderResult<FrappeTreeItem[]> {
    const index = IndexManager.getInstance();
    const bench = index.getBenchContext();
    if (!bench) {
      return [];
    }

    // 1. Root Level: Apps
    if (!element) {
      const items: FrappeTreeItem[] = [];
      for (const app of bench.apps.values()) {
        items.push(
          new FrappeTreeItem(
            app.name,
            'app',
            vscode.TreeItemCollapsibleState.Collapsed,
            app.name
          )
        );
      }
      return items;
    }

    // 2. App Level: Modules
    if (element.itemType === 'app' && element.appName) {
      const appDocTypes = index.getAllDocTypes().filter((d) => d.app === element.appName);
      const modules = new Set<string>();

      for (const dt of appDocTypes) {
        modules.add(dt.module || 'General');
      }

      const items: FrappeTreeItem[] = [];
      for (const mod of Array.from(modules).sort()) {
        items.push(
          new FrappeTreeItem(
            mod,
            'module',
            vscode.TreeItemCollapsibleState.Collapsed,
            element.appName,
            mod
          )
        );
      }
      return items;
    }

    // 3. Module Level: DocTypes
    if (element.itemType === 'module' && element.appName && element.moduleName) {
      const moduleDocTypes = index
        .getAllDocTypes()
        .filter((d) => d.app === element.appName && (d.module || 'General') === element.moduleName);

      const items: FrappeTreeItem[] = [];
      for (const dt of moduleDocTypes.sort((a, b) => a.name.localeCompare(b.name))) {
        items.push(
          new FrappeTreeItem(
            dt.name,
            'doctype',
            vscode.TreeItemCollapsibleState.Collapsed,
            element.appName,
            element.moduleName,
            dt
          )
        );
      }
      return items;
    }

    // 4. DocType Level: Quick File Actions + Fields
    if (element.itemType === 'doctype' && element.doctypeSchema) {
      const items: FrappeTreeItem[] = [];
      const schema = element.doctypeSchema;

      if (schema.filePath) {
        const dir = path.dirname(schema.filePath);
        const base = path.basename(schema.filePath, '.json');

        const pyFile = path.join(dir, `${base}.py`);
        const jsFile = path.join(dir, `${base}.js`);

        if (fs.existsSync(pyFile)) {
          items.push(new FrappeTreeItem(`Controller (${base}.py)`, 'file_action', vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, undefined, pyFile));
        }

        if (fs.existsSync(jsFile)) {
          items.push(new FrappeTreeItem(`Client Script (${base}.js)`, 'file_action', vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, undefined, jsFile));
        }

        items.push(new FrappeTreeItem(`Schema (${base}.json)`, 'file_action', vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, undefined, schema.filePath));
      }

      // Fields
      for (const field of schema.fields) {
        items.push(
          new FrappeTreeItem(
            field.label || field.fieldname,
            'field',
            vscode.TreeItemCollapsibleState.None,
            element.appName,
            element.moduleName,
            schema,
            field
          )
        );
      }

      return items;
    }

    return [];
  }
}
