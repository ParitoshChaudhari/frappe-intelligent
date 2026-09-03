import * as fs from 'fs';
import * as path from 'path';
import { DocTypeSchema, FrappeField } from '../core/types';

/**
 * Parses and indexes DocType JSON schema files and Custom Fields across apps and folders.
 */
export class DocTypeIndexer {
  public static parseDocTypeJson(jsonFilePath: string, appName?: string): DocTypeSchema | null {
    try {
      const content = fs.readFileSync(jsonFilePath, 'utf8');
      const raw = JSON.parse(content);

      if (!raw.name || !Array.isArray(raw.fields)) {
        return null;
      }

      const fields: FrappeField[] = raw.fields.map((f: any) => ({
        fieldname: f.fieldname || '',
        label: f.label || f.fieldname || '',
        fieldtype: f.fieldtype || 'Data',
        options: f.options,
        reqd: f.reqd,
        read_only: f.read_only,
        hidden: f.hidden,
        default: f.default,
        description: f.description,
        is_custom: false,
      })).filter((f: FrappeField) => f.fieldname.length > 0);

      // Add default system fields present on all Frappe DocTypes
      const standardFields: FrappeField[] = [
        { fieldname: 'name', label: 'ID', fieldtype: 'Data', reqd: 1 },
        { fieldname: 'creation', label: 'Created On', fieldtype: 'Datetime', read_only: 1 },
        { fieldname: 'modified', label: 'Last Modified On', fieldtype: 'Datetime', read_only: 1 },
        { fieldname: 'modified_by', label: 'Last Modified By', fieldtype: 'Data', read_only: 1 },
        { fieldname: 'owner', label: 'Owner', fieldtype: 'Data', read_only: 1 },
        { fieldname: 'docstatus', label: 'Document Status', fieldtype: 'Int', default: '0' },
        { fieldname: 'idx', label: 'Index', fieldtype: 'Int', default: '0' },
      ];

      const childTables = new Map<string, string>();
      const linkFields = new Map<string, string>();

      for (const f of fields) {
        if (f.fieldtype === 'Table' && f.options) {
          childTables.set(f.fieldname, f.options);
        } else if ((f.fieldtype === 'Link' || f.fieldtype === 'Dynamic Link') && f.options) {
          linkFields.set(f.fieldname, f.options);
        }
      }

      const pyInfo = this.inferPythonImportInfo(jsonFilePath, raw.name, appName);

      return {
        name: raw.name,
        module: raw.module,
        custom: raw.custom,
        is_submittable: raw.is_submittable,
        is_tree: raw.is_tree,
        is_single: raw.is_single,
        istable: raw.istable,
        fields: [...standardFields, ...fields],
        custom_fields: [],
        child_tables: childTables,
        link_fields: linkFields,
        app: appName,
        filePath: jsonFilePath,
        pyImportPath: pyInfo?.importPath,
        pyClassName: pyInfo?.className,
      };
    } catch {
      return null;
    }
  }

  public static indexAppDocTypes(appPath: string, appName: string): Map<string, DocTypeSchema> {
    const doctypes = new Map<string, DocTypeSchema>();
    this.scanDirectoryRecursively(appPath, appName, doctypes);
    return doctypes;
  }

  public static parseCustomFieldJson(jsonFilePath: string): Map<string, FrappeField[]> {
    const customFieldsMap = new Map<string, FrappeField[]>();
    try {
      const content = fs.readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && (item.doctype === 'Custom Field' || item.dt || item.doc_type) && item.fieldname) {
            const targetDocType = item.dt || item.doc_type;
            if (targetDocType) {
              const field: FrappeField = {
                fieldname: item.fieldname,
                label: item.label || item.fieldname,
                fieldtype: item.fieldtype || 'Data',
                options: item.options,
                reqd: item.reqd,
                read_only: item.read_only,
                hidden: item.hidden,
                default: item.default,
                description: item.description,
                is_custom: true,
                insert_after: item.insert_after,
              };
              let list = customFieldsMap.get(targetDocType);
              if (!list) {
                list = [];
                customFieldsMap.set(targetDocType, list);
              }
              list.push(field);
            }
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        // Handle dictionary format e.g. { "Employee": [ { "fieldname": "custom_pan", ... } ] }
        for (const [docTypeName, fields] of Object.entries(data)) {
          if (Array.isArray(fields)) {
            for (const f of fields) {
              if (f && f.fieldname) {
                const field: FrappeField = {
                  fieldname: f.fieldname,
                  label: f.label || f.fieldname,
                  fieldtype: f.fieldtype || 'Data',
                  options: f.options,
                  reqd: f.reqd,
                  read_only: f.read_only,
                  hidden: f.hidden,
                  default: f.default,
                  description: f.description,
                  is_custom: true,
                  insert_after: f.insert_after,
                };
                let list = customFieldsMap.get(docTypeName);
                if (!list) {
                  list = [];
                  customFieldsMap.set(docTypeName, list);
                }
                list.push(field);
              }
            }
          }
        }
      }
    } catch {
      // ignore JSON parse errors in malformed fixture files
    }
    return customFieldsMap;
  }

  public static indexCustomFieldsInDir(dirPath: string): Map<string, FrappeField[]> {
    const result = new Map<string, FrappeField[]>();
    const merge = (fieldsMap: Map<string, FrappeField[]>) => {
      for (const [dt, fields] of fieldsMap.entries()) {
        let list = result.get(dt);
        if (!list) {
          list = [];
          result.set(dt, list);
        }
        for (const f of fields) {
          if (!list.some((existing) => existing.fieldname === f.fieldname)) {
            list.push(f);
          }
        }
      }
    };

    try {
      const scan = (currDir: string) => {
        const entries = fs.readdirSync(currDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '__pycache__' || entry.name === '.frappe') {
            continue;
          }
          const fullPath = path.join(currDir, entry.name);
          if (entry.isDirectory()) {
            scan(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            if (entry.name.includes('custom_field') || currDir.includes('fixtures') || currDir.includes('custom')) {
              const cf = this.parseCustomFieldJson(fullPath);
              if (cf.size > 0) {
                merge(cf);
              }
            }
          }
        }
      };
      scan(dirPath);
    } catch {
      // ignore
    }

    return result;
  }

  private static scanDirectoryRecursively(
    dir: string,
    appName: string,
    result: Map<string, DocTypeSchema>
  ): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '__pycache__' || entry.name === '.frappe') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.scanDirectoryRecursively(fullPath, appName, result);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Check if this JSON is a DocType definition
          if (dir.includes('doctype') || fullPath.includes('/doctype/')) {
            const schema = this.parseDocTypeJson(fullPath, appName);
            if (schema) {
              result.set(schema.name, schema);
              result.set(schema.name.toLowerCase().replace(/ /g, '_'), schema);
            }
          }
        }
      }
    } catch {
      // ignore read errors
    }
  }

  public static inferPythonImportInfo(
    jsonFilePath: string,
    doctypeName: string,
    appName?: string
  ): { importPath: string; className: string } | null {
    const normalized = jsonFilePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const doctypeIdx = parts.lastIndexOf('doctype');
    if (doctypeIdx <= 0 || parts.length < doctypeIdx + 2) {
      return null;
    }

    // e.g. ["apps", "hrms", "hrms", "payroll", "doctype", "salary_slip", "salary_slip.json"]
    const dtFolder = parts[doctypeIdx + 1];
    const moduleName = parts[doctypeIdx - 1];
    const detectedApp = appName || (parts.indexOf('apps') !== -1 ? parts[parts.indexOf('apps') + 1] : parts[doctypeIdx - 2]);

    const pyBaseName = dtFolder;
    const importPath = `${detectedApp}.${moduleName}.doctype.${dtFolder}.${pyBaseName}`;
    const className = doctypeName.replace(/(?:^|\s|_)([a-z0-9])/gi, (_, c) => c.toUpperCase());

    return { importPath, className };
  }
}

