# 🚀 Frappe Intelligent — Comprehensive Feature Guide & Documentation

[![GitHub Repository](https://img.shields.io/badge/GitHub-ParitoshChaudhari%2Ffrappe--intelligent-blue?logo=github)](https://github.com/ParitoshChaudhari/frappe-intelligent)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)](https://github.com/ParitoshChaudhari/frappe-intelligent/releases)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-blue.svg)](https://marketplace.visualstudio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ParitoshChaudhari/frappe-intelligent/blob/main/LICENSE)

**Frappe Intelligent** turns Visual Studio Code into a world-class development environment for the **Frappe Framework**, **ERPNext**, **HRMS**, and custom Frappe apps.

---

## 🌟 1. Whole-Project AST Indexing & Multi-App Map
- **Recursive Multi-App Scanner**: Automatically scans and indexes all apps (`apps/*`) and workspace subfolders on startup, resolving root bench paths even when opening individual app folders.
- **Unified DocType Schema Registry**: Indexes standard and custom DocTypes, fields, table linkages, and parent-child relationships across all installed apps.
- **Fixture & Custom Field Map**: Discovers custom fields from `fixtures/*.json` and `custom/*.json`, dynamically attaching them to target DocTypes with `[Custom Field]` badges.
- **Python Import Tree Index**: Maps every class, method, whitelisted function, and Python module path for auto-suggesting `from app.module import Class`.
- **Live Incremental File Watcher**: Automatically keeps index maps synchronized in real time as files are created, edited, or deleted.

---

## 🧠 2. Context-Aware Multi-Line Autocompletion
- **Multi-Line Scope Reconstructor**: Traverses backward across lines to reconstruct full function call context and argument positions even across line breaks and nested parentheses.
- **Inferred Child Table Row Completion**: Automatically infers child table DocTypes and suggests field completions when iterating:
  - Python: `for item in self.items: item.`
  - JavaScript: `let row = frm.add_child('items'); row.`
- **Named Keyword Parameter Autocompletion**: Auto-suggests named function arguments (`doctype=`, `filters=`, `fields=`, `order_by=`, `limit_page_length=`, `as_dict=`, `ignore_permissions=`, `pluck=`) inside Python and JavaScript function calls with parameter types and documentation.
- **`frm.fields_dict` & `cur_frm.fields_dict` Autocomplete**: Instant suggestions for all DocType fields directly from the form field dictionary.
- **Exact Prefix Routing**: Clean namespace separation (`frappe.db.`, `frappe.utils.`, `frappe.qb.`, `frappe.cache.`, `frappe.model.naming.`, `frm.`, `grid.`, `page.`, `frappe.listview_settings`, `frappe.router.`).
- **Jinja Print Formats & Templates**: Autocomplete for Jinja filters (`| format_currency`, `| format_date`), Frappe helpers, and iteration objects (`doc.items`).
- **70+ Frappe Hooks**: Comprehensive autocompletion for `doc_events`, `override_whitelisted_methods`, `scheduler_events`, `fixtures`, and `portal_menu_items` in `hooks.py`.

---

## 🐍 3. Full Server-Side Python API Coverage
- **Core APIs**: `frappe.get_doc`, `frappe.get_cached_doc`, `frappe.get_all`, `frappe.get_list`, `frappe.new_doc`, `frappe.msgprint`, `frappe.throw`, `frappe.enqueue`, `frappe.sendmail`, `frappe.publish_realtime`, `frappe.publish_progress`, `frappe.respond_as_web_page`.
- **Context & Session**: `frappe.session.user`, `frappe.session.data`, `frappe.local.site`, `frappe.local.request`, `frappe.local.response`, `frappe.flags`, `frappe.form_dict`.
- **Database (`frappe.db`)**: `get_value`, `get_values`, `set_value`, `get_single_value`, `set_single_value`, `exists`, `count`, `truncate`, `delete`, `commit`, `rollback`, `savepoint`, `release_savepoint`, `table_exists`, `has_column`, `multisql`, `add_index`, `sql`.
- **Document Controller Lifecycle**: `validate`, `before_save`, `on_update`, `before_insert`, `after_insert`, `on_submit`, `on_cancel`, `on_trash`, `doc.insert`, `doc.save`, `doc.submit`, `doc.cancel`, `doc.append`, `doc.db_set`, `doc.add_comment`, `doc.add_tag`, `doc.run_method`, `doc.queue_action`, `doc.has_value_changed`.
- **Utilities (`frappe.utils`)**: `today`, `nowdate`, `now_datetime`, `add_days`, `add_months`, `add_to_date`, `time_diff_in_seconds`, `date_diff`, `flt`, `cint`, `cstr`, `money_in_words`, `render_template`, `get_print`, `log_error`, `logger`, `get_traceback`, `as_json`, `parse_json`, `safe_json_loads`, `safe_eval`, `get_link_to_form`, `validate_email_address`.
- **Permissions & Naming**: `frappe.permissions.has_permission`, `only_for`, `get_roles`, `frappe.model.naming.make_autoname`, `frappe.model.naming.getseries`, `frappe.model.naming.revert_series_if_last`, `frappe.model.naming.parse_naming_series`.
- **QueryBuilder (`frappe.qb`)**: `frappe.qb.DocType`, `frappe.qb.Table`, `frappe.qb.from_`, SQL aggregation & math functions with type-safe chainable query building.
- **Cache (`frappe.cache`)**: `frappe.cache.get_value`, `frappe.cache.set_value`, `frappe.cache.hget`, `frappe.cache.hset`, `frappe.cache.delete_value`.

---

## 💻 4. Client-Side JavaScript & Desk APIs
- **RPC & Modern Async RPC**: `frappe.call`, `await frappe.xcall`, `__("Translate")`, `frappe.show_alert`, `frappe.msgprint`, `frappe.throw`, `frappe.confirm`, `frappe.prompt`, `frappe.show_progress`, `frappe.show_modal`, `frappe.provide`, `frappe.set_route`, `frappe.router.push`, `frappe.router.current_route`.
- **Form API (`frm`)**: `frm.set_value`, `frm.get_value`, `frm.save`, `frm.refresh`, `frm.refresh_field`, `frm.set_df_property`, `frm.toggle_display`, `frm.toggle_enable`, `frm.toggle_reqd`, `frm.add_custom_button`, `frm.remove_custom_button`, `frm.change_custom_button_type`, `frm.set_query`, `frm.is_new`, `frm.is_dirty`, `frm.add_child`, `frm.clear_table`, `frm.scroll_to_field`, `frm.disable_save`, `frm.enable_save`, `frm.set_intro`, `frm.call`, `frm.reload_doc`, `frm.email_doc`.
- **Dialogs & UI (`frappe.ui.Dialog`)**: `dialog.show`, `dialog.hide`, `dialog.get_values`, `dialog.set_value`, `dialog.set_primary_action`.
- **Date & Time Helpers (`frappe.datetime`)**: `frappe.datetime.now_date`, `frappe.datetime.now_datetime`, `frappe.datetime.add_days`, `frappe.datetime.str_to_user`, `frappe.datetime.get_diff`.
- **Child Tables (`grid`)**: `grid.add_new_row`, `grid.get_selected`, `grid.grid_rows`, `grid.refresh`.
- **Desk Pages (`page`)**: `page.set_title`, `page.set_indicator`, `page.add_inner_button`, `page.set_primary_action`.
- **Web Forms (`frappe.web_form`)**: `frappe.web_form.on`, `frappe.web_form.set_value`, `frappe.web_form.get_value`, `frappe.web_form.validate`, `frappe.web_form.set_df_property`.
- **ListView Settings (`frappe.listview_settings`)**: `add_fields`, `get_indicator`, `onload`.

---

## 📖 5. Deep Hover Documentation & Signature Help
- **Parameter Structure Guides**: Interactive hovers provide explicit schema structures for complex dictionary and array arguments (`{ "field": "value" }` or `[ "column_name" ]`).
- **Return Type & Descriptions**: Clear summaries of return signatures, return descriptions, and usage code examples.
- **Omnipresent Signature Help**: Live active-parameter highlighting as you type arguments in Python and JavaScript calls.

---

## 🛡️ 6. Advanced Anti-Pattern & Security Linters
- **N+1 Database Query Linter**: Detects and flags queries inside loops (`frappe.db.get_value` or `frappe.get_doc` in `for`/`while`), suggesting batch querying with `frappe.get_all` or QueryBuilder.
- **Infinite Recursion Save Linter**: Flags `self.save()` or `self.insert()` inside `validate()`, `before_save()`, or `before_insert()`.
- **SQL Injection Detection**: Flags `frappe.db.sql` formatting vulnerabilities with QuickFix remediation.
- **Transactional Atomicity Linter**: Flags `frappe.db.commit()` inside Document controller hooks.
- **Version Deprecation Warnings**: Deprecation warnings for Frappe v13–v16 with automated CodeActions.

---

## 🏷️ 7. Strongly-Typed Stubs Generator
- **Python `.pyi` Stubs**: Generates PEP 561 stubs with strongly-typed child tables (`items: list['SalesOrderItem']`) for Pylance / Pyright.
- **Ambient TypeScript `.d.ts` Declarations**: Generates typed document interfaces (`interface SalesOrderDoc { ... }`) in `.frappe/typings` for seamless client-side intellisense.

---

## 🎨 8. Webview Form Layout Previewer & Frappe Explorer
- **Interactive Form Layout Previewer**: Live interactive graphical rendering of form layouts from `.json` schema files.
- **Full Layout Component Support**: **Tab Breaks** (navigation bar), **Section Breaks** (collapsible cards), **Column Breaks** (multi-column grids), and **Child Tables** (column headers).
- **Frappe Explorer Sidebar**: Tree view in Activity Bar exploring Apps, Modules, DocTypes, and DocFields.

---

## 🛠️ 9. Bench CLI Commands, Interactive Runner & Terminal Shell Completions
- **Interactive Bench Command Palette (`Frappe: Run Bench Command...`)**:
  - Searchable QuickPick palette with auto-suggestions for all 30+ bench CLI commands grouped by category (**Site Operations**, **App & Code Operations**, **Workers & Scheduler**, **System & Database**).
  - Automatically attaches `--site <active_site>` for site-aware commands.
  - Interactive parameter auto-suggestion for installed Frappe apps and workspace DocTypes.
- **Terminal Shell Auto-completion (`Frappe: Setup Bench Terminal Shell Auto-completion`)**:
  - One-click configuration of Click-based `<Tab>` shell completions in `~/.zshrc` / `~/.bashrc` / `~/.config/fish/config.fish`.
  - Automatic session completion injection into the integrated `Frappe Bench` terminal for instant `bench <Tab>` and `bench --site <Tab>` suggestions.
- **Site Auto-Discovery**: Automatically discovers sites from `sites/` directory or parent bench paths, auto-selecting `currentsite.txt` and supporting manual custom site entry.
- **Status Bar Integration**: Live active site indicator in the status bar with instant site switching.
- **Bench Management Commands**:
  - `Frappe: Bench Clear Cache`
  - `Frappe: Bench Migrate`
  - `Frappe: Bench Restart`
  - `Frappe: Bench Build`
  - `Frappe: Open Bench Console`
  - `Frappe: Bench Backup` / `Restore`
  - `Frappe: Bench New App` / `Get App` / `Install App` / `Uninstall App`
  - `Frappe: Bench Run Unit Tests`

---

## 🏗️ 10. Code Scaffolding Generators
Generate production-ready Frappe boilerplate with single commands:
- `Frappe: Scaffold Custom Client Script`
- `Frappe: Scaffold Server Script / Webhook Handler`
- `Frappe: Scaffold Portal / Website Web Page`
- `Frappe: Scaffold Print Format Template`
- `Frappe: Scaffold Script Report` (Python + JS Filter)
- `Frappe: Scaffold Desk Page` (JS + HTML)
- `Frappe: Scaffold Migration Patch`
- `Frappe: Scaffold Unit Test (FrappeTestCase)`
- `Frappe: Scaffold Web Form Script`
- `Frappe: Scaffold ListView Settings`

---

## 🔗 Repository
[https://github.com/ParitoshChaudhari/frappe-intelligent](https://github.com/ParitoshChaudhari/frappe-intelligent)
