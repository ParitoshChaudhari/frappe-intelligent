import { FrappeVersion } from '../core/types';

export interface DeprecationRule {
  pattern: RegExp;
  deprecatedSince: FrappeVersion;
  removedIn?: FrappeVersion;
  message: string;
  replacement?: string;
  codeActionSnippet?: string;
  isTransactionalWarning?: boolean;
}

export class DeprecationMatrix {
  public static readonly RULES: DeprecationRule[] = [
    {
      pattern: /frappe\.db\.sql\s*\(\s*["'][^"']*%\s*\(/,
      deprecatedSince: 'v13',
      removedIn: 'v16',
      message: 'String formatting/interpolation in frappe.db.sql is insecure and deprecated. Use parameterized queries with values dict or tuple.',
      replacement: 'frappe.db.sql("SELECT ... WHERE field = %(val)s", {"val": my_val})',
    },
    {
      pattern: /frappe\.db\.sql\s*\(\s*f["']/,
      deprecatedSince: 'v13',
      message: '[Security Alert: SQL Injection Risk] Direct f-string interpolation inside frappe.db.sql() allows SQL injection vulnerabilities. Use parameterized %(name)s syntax.',
      replacement: 'frappe.db.sql("SELECT ... WHERE field = %(val)s", {"val": my_val})',
    },
    {
      pattern: /frappe\.db\.sql\s*\(\s*["'].*\.format\(/,
      deprecatedSince: 'v13',
      message: '[Security Alert: SQL Injection Risk] Using .format() inside frappe.db.sql() creates SQL injection vulnerabilities. Use parameterized queries.',
      replacement: 'frappe.db.sql("SELECT ... WHERE field = %(val)s", {"val": my_val})',
    },
    {
      pattern: /flags\.ignore_permissions\s*=\s*(?:True|1)/,
      deprecatedSince: 'v14',
      message: '[Security Notice] ignore_permissions bypasses Frappe Role Permissions. Ensure this is guarded and not exposed to arbitrary user inputs.',
      replacement: 'if frappe.has_permission(doctype, ptype="read", user=frappe.session.user): ...',
    },
    {
      pattern: /frappe\.client\.get_value\(/,
      deprecatedSince: 'v14',
      message: 'frappe.client.get_value in client JS is deprecated. Use frappe.db.get_value() instead.',
      replacement: 'frappe.db.get_value(...)',
    },
    {
      pattern: /cur_frm\.cscript\./,
      deprecatedSince: 'v13',
      removedIn: 'v15',
      message: 'cur_frm.cscript is deprecated. Use frappe.ui.form.on() event handlers instead.',
      replacement: 'frappe.ui.form.on(...)',
    },
    {
      pattern: /cur_frm\.(?:set_value|get_value|save|refresh|set_df_property)\(/,
      deprecatedSince: 'v14',
      message: 'Using cur_frm directly is an anti-pattern. Use the scoped frm instance passed to the event handler.',
      replacement: 'frm.<method>(...)',
    },
    {
      pattern: /frappe\.msgprint\s*\(\s*['"].*['"]\s*,\s*raise_exception\s*=\s*(?:True|1)\s*\)/,
      deprecatedSince: 'v14',
      message: 'raise_exception parameter in frappe.msgprint is deprecated. Use frappe.throw() instead.',
      replacement: 'frappe.throw(...)',
    },
  ];

  public static getDeprecationsForVersion(
    currentVersion: FrappeVersion,
    lineText: string
  ): DeprecationRule[] {
    const versionOrder: Record<FrappeVersion, number> = {
      v13: 13,
      v14: 14,
      v15: 15,
      v16: 16,
    };

    const currentNum = versionOrder[currentVersion] || 15;
    const matches: DeprecationRule[] = [];

    for (const rule of this.RULES) {
      const depNum = versionOrder[rule.deprecatedSince];
      if (currentNum >= depNum && rule.pattern.test(lineText)) {
        matches.push(rule);
      }
    }

    return matches;
  }
}
