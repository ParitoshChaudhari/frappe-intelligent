# 🚀 Frappe Intelligent (v0.0.1) — Comprehensive Feature Guide & Documentation

[![GitHub Repository](https://img.shields.io/badge/GitHub-ParitoshChaudhari%2Ffrappe--intelligent-blue?logo=github)](https://github.com/ParitoshChaudhari/frappe-intelligent)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)](https://github.com/ParitoshChaudhari/frappe-intelligent/releases)

**Frappe Intelligent** turns VS Code into a comprehensive development environment for the **Frappe Framework**, **ERPNext**, **HRMS**, and custom Frappe apps.

---

## 🌟 1. Whole-Project AST Indexing & Multi-App Map
- **Recursive App Scanner**: Analyzes all apps (`apps/*`) and workspace subfolders on startup.
- **Unified DocType Schema Registry**: Indexes standard and custom DocTypes, fields, tables, and parent linkages across all apps.
- **Fixture & Custom Field Map**: Discovers custom fields from `fixtures/*.json` and `custom/*.json`, dynamically attaching them to target DocTypes with `[Custom Field]` indicators.
- **Python Import Tree Index**: Maps every class, method, whitelisted function, and Python module path for auto-suggesting `from app.module import Class`.
- **Live Incremental File Watcher**: Automatically keeps index maps synchronized as files are created, edited, or deleted.

---

## ⚡ 2. Context-Aware Multi-Line Autocompletion
- **Multi-Line Scope Reconstructor**: Traverses backward across lines to reconstruct full function call context and argument positions.
- **Inferred Child Table Row Completion**: Automatically infers child table DocTypes and suggests field completions when iterating (`for item in self.items: item.` or `let row = frm.add_child('items'); row.`).
- **`frm.fields_dict` & `cur_frm.fields_dict` Autocomplete**: Instant suggestions for all DocType fields.
- **Exact Prefix Routing**: Clean namespace separation (`frappe.db.`, `frappe.utils.`, `frappe.qb.`, `frm.`, `grid.`, `page.`, `frappe.listview_settings`).

---

## 🐍 3. Full Server-Side Python API Coverage
- **Core APIs**: `frappe.get_doc`, `frappe.get_cached_doc`, `frappe.get_all`, `frappe.get_list`, `frappe.new_doc`, `frappe.msgprint`, `frappe.throw`, `frappe.enqueue`, `frappe.sendmail`, `frappe.publish_realtime`, `frappe.publish_progress`, `frappe.respond_as_web_page`.
- **Context & Session**: `frappe.session.user`, `frappe.session.data`, `frappe.local.site`, `frappe.local.request`, `frappe.local.response`, `frappe.flags`, `frappe.form_dict`.
- **Database (`frappe.db`)**: `get_value`, `get_values`, `set_value`, `get_single_value`, `set_single_value`, `exists`, `count`, `truncate`, `delete`, `commit`, `rollback`, `savepoint`, `release_savepoint`, `table_exists`, `has_column`, `multisql`, `add_index`, `sql`.
- **Document Controller Lifecycle**: `validate`, `before_save`, `on_update`, `before_insert`, `after_insert`, `on_submit`, `on_cancel`, `on_trash`, `doc.insert`, `doc.save`, `doc.submit`, `doc.cancel`, `doc.append`, `doc.db_set`, `doc.add_comment`, `doc.add_tag`, `doc.run_method`, `doc.queue_action`, `doc.has_value_changed`.
- **Utilities (`frappe.utils`)**: `today`, `nowdate`, `now_datetime`, `add_days`, `add_months`, `add_to_date`, `time_diff_in_seconds`, `date_diff`, `flt`, `cint`, `cstr`, `money_in_words`, `render_template`, `get_print`, `log_error`, `logger`, `get_traceback`, `as_json`, `parse_json`, `safe_json_loads`, `safe_eval`, `get_link_to_form`, `validate_email_address`.
- **Permissions & Naming**: `frappe.permissions.has_permission`, `only_for`, `get_roles`, `frappe.model.naming.make_autoname`.
- **QueryBuilder (`frappe.qb`)**: `frappe.qb.DocType`, `frappe.qb.Table`, `frappe.qb.from_`, SQL aggregation & math functions.
- **Cache**: `frappe.cache().get_value`, `frappe.cache().set_value`.

---

## 💻 4. Client-Side JavaScript & Desk APIs
- **RPC & Modern Async RPC**: `frappe.call`, `await frappe.xcall`, `__("Translate")`, `frappe.show_alert`, `frappe.msgprint`, `frappe.throw`, `frappe.confirm`, `frappe.prompt`, `frappe.show_progress`, `frappe.show_modal`, `frappe.provide`, `frappe.set_route`, `frappe.router`.
- **Form API (`frm`)**: `frm.set_value`, `frm.get_value`, `frm.save`, `frm.refresh`, `frm.refresh_field`, `frm.set_df_property`, `frm.toggle_display`, `frm.toggle_enable`, `frm.toggle_reqd`, `frm.add_custom_button`, `frm.remove_custom_button`, `frm.change_custom_button_type`, `frm.set_query`, `frm.is_new`, `frm.is_dirty`, `frm.add_child`, `frm.clear_table`, `frm.scroll_to_field`, `frm.disable_save`, `frm.enable_save`, `frm.set_intro`, `frm.call`, `frm.reload_doc`, `frm.email_doc`.
- **Child Tables (`grid`)**: `grid.add_new_row`, `grid.get_selected`, `grid.grid_rows`, `grid.refresh`.
- **Desk Pages (`page`)**: `page.set_title`, `page.set_indicator`, `page.add_inner_button`, `page.set_primary_action`.
- **Web Forms (`frappe.web_form`)**: `frappe.web_form.on`, `frappe.web_form.set_value`, `frappe.web_form.get_value`, `frappe.web_form.validate`, `frappe.web_form.set_df_property`.
- **ListView Settings (`frappe.listview_settings`)**: `add_fields`, `get_indicator`, `onload`.

---

## 🛡️ 5. Advanced Anti-Pattern & Security Linters
- **N+1 Database Query Linter**: Detects and flags queries inside loops (`frappe.db.get_value` or `frappe.get_doc` in `for`/`while`).
- **Infinite Recursion Save Linter**: Flags `self.save()` or `self.insert()` inside `validate()`, `before_save()`, or `before_insert()`.
- **SQL Injection Detection**: Flags `frappe.db.sql` formatting vulnerabilities with QuickFix remediation.
- **Transactional Atomicity Linter**: Flags `frappe.db.commit()` inside Document controller hooks.
- **Version Deprecation Warnings**: Deprecation warnings for Frappe v13–v16 with automated CodeActions.

---

## 🏷️ 6. Strongly-Typed Stubs Generator
- **Python `.pyi` Stubs**: Generates PEP 561 stubs with strongly-typed child tables (`items: list['SalesOrderItem']`).
- **Ambient TypeScript `.d.ts` Declarations**: Generates typed document interfaces (`interface SalesOrderDoc { ... }`) in `.frappe/typings`.

---

## 🎨 7. Webview Form Layout Previewer
- Live interactive graphical rendering of form layouts from `.json` schema files.
- Full layout support for **Tab Breaks** (navigation bar), **Section Breaks** (collapsible cards), **Column Breaks** (multi-column grids), and **Child Tables** (column headers).

---

## 🛠️ 8. Bench CLI Commands & Scaffolding
- **Bench Management**: `Select Active Site`, `Clear Cache`, `Migrate`, `Restart`, `Build`, `Console`, `Backup`, `Restore`, `New App`, `Get App`, `Install App`, `Uninstall App`, `Run Unit Tests`.
- **Scaffolding Generators**:
  - `Frappe: Scaffold Custom Client Script`
  - `Frappe: Scaffold Server Script / Webhook Handler`
  - `Frappe: Scaffold Portal / Website Web Page`
  - `Frappe: Scaffold Print Format Template`
  - `Frappe: Scaffold Script Report`
  - `Frappe: Scaffold Desk Page`
  - `Frappe: Scaffold Migration Patch`
  - `Frappe: Scaffold Unit Test (FrappeTestCase)`
  - `Frappe: Scaffold Web Form Script`
  - `Frappe: Scaffold ListView Settings`

---

## 🔗 Repository
[https://github.com/ParitoshChaudhari/frappe-intelligent](https://github.com/ParitoshChaudhari/frappe-intelligent)
