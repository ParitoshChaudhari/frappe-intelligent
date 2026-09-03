/**
 * Core type definitions for Frappe Intelligent extension.
 */

export type FrappeVersion = 'v13' | 'v14' | 'v15' | 'v16';

export type FrappeFileType =
  | 'doctype_controller_py'
  | 'doctype_form_js'
  | 'doctype_schema_json'
  | 'hooks_py'
  | 'api_module_py'
  | 'patch_py'
  | 'report_py'
  | 'report_js'
  | 'page_js'
  | 'test_py'
  | 'generic_py'
  | 'generic_js'
  | 'unknown';

export interface FrappeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  reqd?: number | boolean;
  read_only?: number | boolean;
  hidden?: number | boolean;
  default?: string;
  description?: string;
  is_custom?: boolean;
  insert_after?: string;
}

export interface DocTypeSchema {
  name: string;
  module?: string;
  custom?: number | boolean;
  is_submittable?: number | boolean;
  is_tree?: number | boolean;
  is_single?: number | boolean;
  istable?: number | boolean;
  fields: FrappeField[];
  custom_fields?: FrappeField[];
  child_tables?: Map<string, string>; // fieldname -> Child DocType name
  link_fields?: Map<string, string>; // fieldname -> Target Link DocType name
  app?: string;
  filePath?: string;
  pyImportPath?: string;
  pyClassName?: string;
}

export interface FrappeMethodParam {
  name: string;
  type?: string;
  default?: string;
  optional?: boolean;
  description?: string;
  structure?: string; // e.g. "{}", "[]", "dict", "list", etc.
}

export interface FrappeApiSymbol {
  name: string;
  module: string;
  signature: string;
  returnType?: string;
  returnDescription?: string;
  docstring: string;
  example?: string;
  parameters: FrappeMethodParam[];
  since?: FrappeVersion;
  deprecated?: {
    since: FrappeVersion;
    message: string;
    replacement?: string;
  };
  docUrl?: string;
  sourceFile?: string;
  sourceLine?: number;
  isWhitelisted?: boolean;
}

export interface FrappeImportSymbol {
  importPath: string; // e.g. 'hrms.payroll.doctype.salary_slip.salary_slip'
  moduleName: string; // e.g. 'salary_slip'
  appName: string; // e.g. 'hrms'
  symbolName?: string; // e.g. 'SalarySlip'
  symbolType: 'module' | 'class' | 'function' | 'doctype';
  sourceFile: string;
  docstring?: string;
}

export interface FrappeAppInfo {
  name: string;
  version: string;
  majorVersion: FrappeVersion;
  path: string;
  isFrappeCore: boolean;
  isErpnext: boolean;
  doctypes: Map<string, DocTypeSchema>;
  whitelistedMethods: Map<string, FrappeApiSymbol>;
  hooks: Map<string, any>;
  customFields?: Map<string, FrappeField[]>;
}

export interface BenchContext {
  benchPath: string;
  frappeVersion: FrappeVersion;
  apps: Map<string, FrappeAppInfo>;
  activeAppNames: string[];
  importMap?: Map<string, FrappeImportSymbol>;
}

export interface FileClassificationResult {
  fileType: FrappeFileType;
  appName?: string;
  doctypeName?: string;
  moduleName?: string;
  isServerCode: boolean;
  isClientCode: boolean;
}

export interface CursorScopeContext {
  targetObject?: string; // 'frappe.db', 'frappe', 'frm', 'doc', 'cur_frm', 'frm.fields_dict', etc.
  callContext?: {
    callee: string;
    argIndex: number;
    isObjectLiteral?: boolean;
    objectKey?: string;
  };
  isInsideDocTypeClass?: boolean;
  isInsideFormHandler?: boolean;
  currentDocType?: string;
  targetDocTypeInCall?: string; // e.g. 'Employee' in frappe.db.get_value("Employee", ...)
  childTableRowDocType?: string; // Inferred child DocType for child table rows
  isInsideQuotes?: boolean;
  quoteChar?: string;
  importContext?: {
    isImport: boolean;
    isFromImport: boolean;
    modulePrefix?: string;
  };
}


