import * as fs from 'fs';
import * as path from 'path';
import { BenchContext, DocTypeSchema, FrappeApiSymbol, FrappeField, FrappeImportSymbol, FrappeVersion } from '../core/types';
import { BenchDetector } from '../core/benchDetector';
import { DocTypeIndexer } from './doctypeIndexer';
import { PyIndexer, PyParsedClass } from './pyIndexer';
import { JsIndexer } from './jsIndexer';

export class IndexManager {
  private static instance: IndexManager;
  private benchContext: BenchContext | null = null;
  private allDocTypes = new Map<string, DocTypeSchema>();
  private allWhitelistedMethods = new Map<string, FrappeApiSymbol>();
  private allPyClasses = new Map<string, PyParsedClass>();
  private allCustomFields = new Map<string, FrappeField[]>();
  private allImportSymbols = new Map<string, FrappeImportSymbol>();
  private knownFilePaths = new Set<string>();
  private fileMtimes = new Map<string, number>();

  // Reverse mapping for precise cache invalidation and memory leak prevention
  private fileToDocTypes = new Map<string, Set<string>>();
  private fileToWhitelistedMethods = new Map<string, Set<string>>();
  private fileToPyClasses = new Map<string, Set<string>>();
  private fileToCustomFields = new Map<string, Set<string>>();
  private fileToImportSymbols = new Map<string, Set<string>>();

  public static getInstance(): IndexManager {
    if (!IndexManager.instance) {
      IndexManager.instance = new IndexManager();
    }
    return IndexManager.instance;
  }

  public initialize(workspaceRoot: string, fallbackVersion: FrappeVersion = 'v15'): BenchContext {
    this.benchContext = BenchDetector.discoverBench(workspaceRoot, fallbackVersion);
    this.rebuildIndex();
    return this.benchContext;
  }

  public async initializeAsync(workspaceRoot: string, fallbackVersion: FrappeVersion = 'v15'): Promise<BenchContext> {
    this.benchContext = BenchDetector.discoverBench(workspaceRoot, fallbackVersion);
    await this.rebuildIndexAsync();
    return this.benchContext;
  }

  public getBenchContext(): BenchContext | null {
    return this.benchContext;
  }

  public getDocType(name: string): DocTypeSchema | undefined {
    return this.allDocTypes.get(name) || this.allDocTypes.get(name.toLowerCase().replace(/ /g, '_'));
  }

  public getAllDocTypes(): DocTypeSchema[] {
    const unique = new Map<string, DocTypeSchema>();
    for (const schema of this.allDocTypes.values()) {
      unique.set(schema.name, schema);
    }
    return Array.from(unique.values());
  }

  public getCustomFieldsForDocType(doctypeName: string): FrappeField[] {
    return this.allCustomFields.get(doctypeName) || this.allCustomFields.get(doctypeName.toLowerCase().replace(/ /g, '_')) || [];
  }

  public getAllCustomFields(): Map<string, FrappeField[]> {
    return this.allCustomFields;
  }

  public getAllImportSymbols(): FrappeImportSymbol[] {
    return Array.from(this.allImportSymbols.values());
  }

  public getImportSymbolsForModule(modulePath: string): FrappeImportSymbol[] {
    const results: FrappeImportSymbol[] = [];
    for (const sym of this.allImportSymbols.values()) {
      if (sym.importPath === modulePath && sym.symbolName) {
        results.push(sym);
      }
    }
    return results;
  }

  public getWhitelistedMethod(name: string): FrappeApiSymbol | undefined {
    return this.allWhitelistedMethods.get(name);
  }

  public getAllWhitelistedMethods(): FrappeApiSymbol[] {
    return Array.from(this.allWhitelistedMethods.values());
  }

  public getPyClass(className: string): PyParsedClass | undefined {
    return this.allPyClasses.get(className);
  }

  public getChildDocTypeName(parentDocTypeName: string, tableFieldName: string): string | undefined {
    const parentSchema = this.getDocType(parentDocTypeName);
    if (!parentSchema) return undefined;
    return parentSchema.child_tables?.get(tableFieldName);
  }

  public getLinkDocTypeName(docTypeName: string, linkFieldName: string): string | undefined {
    const schema = this.getDocType(docTypeName);
    if (!schema) return undefined;
    return schema.link_fields?.get(linkFieldName);
  }

  public hasFile(filePath: string): boolean {
    return this.knownFilePaths.has(filePath);
  }

  public rebuildIndex(): void {
    if (!this.benchContext) return;

    this.clearAll();

    for (const app of this.benchContext.apps.values()) {
      // 1. Index DocTypes across all folders in app
      const appDocTypes = DocTypeIndexer.indexAppDocTypes(app.path, app.name);
      for (const [key, schema] of appDocTypes.entries()) {
        this.allDocTypes.set(key, schema);
        app.doctypes.set(key, schema);
        if (schema.filePath) {
          this.knownFilePaths.add(schema.filePath);
          this.trackFileSymbol(this.fileToDocTypes, schema.filePath, key);
        }
      }

      // 2. Index Custom Fields
      const appCustomFields = DocTypeIndexer.indexCustomFieldsInDir(app.path);
      for (const [dt, fields] of appCustomFields.entries()) {
        this.mergeCustomFields(dt, fields);
      }

      // 3. Index Source files in app
      this.scanDirectoryFiles(app.path, (filePath) => {
        this.knownFilePaths.add(filePath);
        if (filePath.endsWith('.py')) {
          this.indexPythonFile(filePath, app.name);
        } else if (filePath.endsWith('.js')) {
          this.indexJsFile(filePath);
        }
      });
    }

    // Attach custom fields to indexed DocTypes
    this.applyCustomFieldsToDocTypes();
  }

  public async rebuildIndexAsync(): Promise<void> {
    if (!this.benchContext) return;

    this.clearAll();

    for (const app of this.benchContext.apps.values()) {
      // 1. Index DocTypes
      const appDocTypes = DocTypeIndexer.indexAppDocTypes(app.path, app.name);
      for (const [key, schema] of appDocTypes.entries()) {
        this.allDocTypes.set(key, schema);
        app.doctypes.set(key, schema);
        if (schema.filePath) {
          this.knownFilePaths.add(schema.filePath);
          this.trackFileSymbol(this.fileToDocTypes, schema.filePath, key);
        }
      }

      // 2. Index Custom Fields
      const appCustomFields = DocTypeIndexer.indexCustomFieldsInDir(app.path);
      for (const [dt, fields] of appCustomFields.entries()) {
        this.mergeCustomFields(dt, fields);
      }

      // 3. Async directory scan
      await this.scanDirectoryFilesAsync(app.path, (filePath) => {
        this.knownFilePaths.add(filePath);
        if (filePath.endsWith('.py')) {
          this.indexPythonFile(filePath, app.name);
        } else if (filePath.endsWith('.js')) {
          this.indexJsFile(filePath);
        }
      });
    }

    this.applyCustomFieldsToDocTypes();
  }

  public updateFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      this.removeFile(filePath);
      return;
    }

    this.knownFilePaths.add(filePath);
    const stats = fs.statSync(filePath);
    const lastMtime = this.fileMtimes.get(filePath) || 0;
    if (stats.mtimeMs <= lastMtime) return;

    this.fileMtimes.set(filePath, stats.mtimeMs);
    this.removeFileSymbols(filePath);

    if (filePath.endsWith('.json')) {
      if (filePath.includes('/doctype/')) {
        const schema = DocTypeIndexer.parseDocTypeJson(filePath);
        if (schema) {
          this.allDocTypes.set(schema.name, schema);
          this.allDocTypes.set(schema.name.toLowerCase().replace(/ /g, '_'), schema);
          this.trackFileSymbol(this.fileToDocTypes, filePath, schema.name);
          this.trackFileSymbol(this.fileToDocTypes, filePath, schema.name.toLowerCase().replace(/ /g, '_'));
          this.applyCustomFieldsToDocTypes();
        }
      } else if (filePath.includes('custom_field') || filePath.includes('/fixtures/') || filePath.includes('/custom/')) {
        const customFields = DocTypeIndexer.parseCustomFieldJson(filePath);
        for (const [dt, fields] of customFields.entries()) {
          this.mergeCustomFields(dt, fields);
          this.trackFileSymbol(this.fileToCustomFields, filePath, dt);
        }
        this.applyCustomFieldsToDocTypes();
      }
    } else if (filePath.endsWith('.py')) {
      this.indexPythonFile(filePath);
    } else if (filePath.endsWith('.js')) {
      this.indexJsFile(filePath);
    }
  }

  public removeFile(filePath: string): void {
    this.knownFilePaths.delete(filePath);
    this.fileMtimes.delete(filePath);
    this.removeFileSymbols(filePath);
  }

  private removeFileSymbols(filePath: string): void {
    const docTypes = this.fileToDocTypes.get(filePath);
    if (docTypes) {
      for (const name of docTypes) {
        this.allDocTypes.delete(name);
      }
      this.fileToDocTypes.delete(filePath);
    }

    const whitelisted = this.fileToWhitelistedMethods.get(filePath);
    if (whitelisted) {
      for (const name of whitelisted) {
        this.allWhitelistedMethods.delete(name);
      }
      this.fileToWhitelistedMethods.delete(filePath);
    }

    const pyClasses = this.fileToPyClasses.get(filePath);
    if (pyClasses) {
      for (const name of pyClasses) {
        this.allPyClasses.delete(name);
      }
      this.fileToPyClasses.delete(filePath);
    }

    const customFields = this.fileToCustomFields.get(filePath);
    if (customFields) {
      for (const name of customFields) {
        this.allCustomFields.delete(name);
      }
      this.fileToCustomFields.delete(filePath);
    }

    const importSyms = this.fileToImportSymbols.get(filePath);
    if (importSyms) {
      for (const key of importSyms) {
        this.allImportSymbols.delete(key);
      }
      this.fileToImportSymbols.delete(filePath);
    }
  }

  private trackFileSymbol(map: Map<string, Set<string>>, filePath: string, symbol: string): void {
    let set = map.get(filePath);
    if (!set) {
      set = new Set();
      map.set(filePath, set);
    }
    set.add(symbol);
  }

  private clearAll(): void {
    this.allDocTypes.clear();
    this.allWhitelistedMethods.clear();
    this.allPyClasses.clear();
    this.allCustomFields.clear();
    this.allImportSymbols.clear();
    this.knownFilePaths.clear();
    this.fileMtimes.clear();
    this.fileToDocTypes.clear();
    this.fileToWhitelistedMethods.clear();
    this.fileToPyClasses.clear();
    this.fileToCustomFields.clear();
    this.fileToImportSymbols.clear();
  }

  private indexPythonFile(filePath: string, appName?: string): void {
    const res = PyIndexer.parsePythonFile(filePath, appName);
    for (const [clsName, cls] of res.classes.entries()) {
      this.allPyClasses.set(clsName, cls);
      this.trackFileSymbol(this.fileToPyClasses, filePath, clsName);
    }
    for (const [methodName, symbol] of res.whitelistedMethods.entries()) {
      this.allWhitelistedMethods.set(methodName, symbol);
      this.trackFileSymbol(this.fileToWhitelistedMethods, filePath, methodName);
    }
    for (const sym of res.importSymbols) {
      const key = `${sym.importPath}:${sym.symbolName || ''}`;
      this.allImportSymbols.set(key, sym);
      this.trackFileSymbol(this.fileToImportSymbols, filePath, key);
    }
  }

  private indexJsFile(filePath: string): void {
    JsIndexer.parseJsFile(filePath);
  }

  private mergeCustomFields(docTypeName: string, fields: FrappeField[]): void {
    let existing = this.allCustomFields.get(docTypeName);
    if (!existing) {
      existing = [];
      this.allCustomFields.set(docTypeName, existing);
      this.allCustomFields.set(docTypeName.toLowerCase().replace(/ /g, '_'), existing);
    }
    for (const f of fields) {
      if (!existing.some((e) => e.fieldname === f.fieldname)) {
        existing.push(f);
      }
    }
  }

  private applyCustomFieldsToDocTypes(): void {
    for (const schema of this.allDocTypes.values()) {
      const custom = this.getCustomFieldsForDocType(schema.name);
      if (custom.length > 0) {
        schema.custom_fields = custom;
        for (const cf of custom) {
          if (!schema.fields.some((f) => f.fieldname === cf.fieldname)) {
            schema.fields.push(cf);
          }
        }
      }
    }
  }

  private scanDirectoryFiles(dir: string, callback: (filePath: string) => void): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '__pycache__' || entry.name === '.frappe') {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.scanDirectoryFiles(fullPath, callback);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch {
      // ignore
    }
  }

  private async scanDirectoryFilesAsync(dir: string, callback: (filePath: string) => void): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '__pycache__' || entry.name === '.frappe') {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.scanDirectoryFilesAsync(fullPath, callback);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch {
      // ignore
    }
  }
}

