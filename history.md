# Change History and Changelog

This document tracks all changes, feature additions, enhancements, and bug fixes for Frappe Intelligent, organized chronologically by date.

---

## 2026-09-05

### JavaScript Autocompletion, Child Table APIs, and Model Methods
- Added full support for JavaScript and TypeScript files (`.js`, `.ts`, `.jsx`, `.tsx`).
- Documented and structured comprehensive client-side API datasets with parameter specifications, return descriptions, and usage examples.
- Added support for `locals[cdt][cdn]` bracket notation with direct field suggestions.
- Implemented complete API coverage for `frappe.model` methods:
  - `frappe.model.get_value`
  - `frappe.model.set_value`
  - `frappe.model.get_doc`
  - `frappe.model.get_children`
  - `frappe.model.add_child`
  - `frappe.model.remove_from_locals`
  - `frappe.model.delete_doc`
  - `frappe.model.has_workflow`
  - `frappe.model.sync`
  - `frappe.model.copy_doc`
  - `frappe.model.get_docinfo`
  - `frappe.model.set_default_values`
  - `frappe.model.with_doctype`
  - `frappe.model.clear_table`
  - `frappe.model.map_current_doc`
- Implemented full API coverage for `grid` and `grid_row` child table operations:
  - `grid.add_new_row`
  - `grid.get_selected`
  - `grid.get_selected_children`
  - `grid.refresh`
  - `grid.refresh_row`
  - `grid.toggle_reqd`
  - `grid.toggle_enable`
  - `grid.toggle_display`
  - `grid.set_column_disp`
  - `grid.get_row`
  - `grid.remove_all`
- Added context-aware child DocType inference when writing handlers in `frappe.ui.form.on("Child DocType", ...)`.
- Added hover tooltips and signature help for `locals`, `frappe.model`, and `grid` calls.

### Bench Terminal Auto-Completion and Command Runner
- Added interactive command palette `Frappe: Run Bench Command...` (`frappeIntelligent.runBenchCommand`):
  - Categorized list of 30+ bench commands covering Site Operations, App Management, Background Workers, and Database utilities.
  - Automatic detection and inclusion of `--site <active_site>` for site-dependent commands.
  - Interactive parameter prompts for installed apps and workspace DocTypes.
- Added native shell auto-completion configurator `Frappe: Setup Bench Terminal Shell Auto-completion` (`frappeIntelligent.setupTerminalCompletions`):
  - Configures Click shell completion in user shell configuration files (`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`).
  - Automatically initializes session-level shell completion when opening the `Frappe Bench` terminal.
- Added dynamic site discovery resolving bench root paths, `sites/` directories, and `currentsite.txt`.
- Added status bar active site indicator with instant switching.

### Server-Side APIs and Hover Enhancements
- Added documentation and autocompletion for naming routines (`frappe.model.naming.make_autoname`, `getseries`, `parse_naming_series`).
- Added Redis cache methods (`frappe.cache.get_value`, `set_value`, `hget`, `hset`, `delete_value`).
- Added QueryBuilder API signatures (`frappe.qb.DocType`, `frappe.qb.from_`, aggregations).
- Enhanced parameter structure schema rendering in hover tooltips.

### Documentation and Packaging
- Created `features.md` comprehensive feature guide and architectural reference.
- Maintained test suite coverage with all 75 unit tests passing.
- Generated and packaged extension archive `frappe-intelligent-0.0.1.vsix`.

---

## 2026-09-03

### Initial Release (v0.0.1)

#### AST Indexing and Multi-App Workspace Architecture
- Recursive multi-app scanner indexing all `apps/*` folders, custom apps, and workspace subdirectories.
- DocType schema registry parsing JSON definitions, standard fields, custom fields, and child table linkages.
- Fixture and custom field mapper discovering custom fields from `fixtures/*.json` and `custom/*.json`.
- Python import tree mapper indexing classes, methods, whitelisted endpoints, and module paths.
- Incremental file watcher updating AST index in memory upon file creation, modification, or deletion.

#### Multi-Line Autocompletion Engine
- Multi-line backward context parser resolving chained calls, nested arguments, and cross-line scopes.
- Child table iteration inference for Python (`for item in self.items: item.`) and JavaScript (`frm.doc.items.forEach(...)`).
- Form field autocompletion for `frm.fields_dict` and `cur_frm.fields_dict`.
- Jinja template autocompletion for standard filters and print format variables.
- Frappe Hooks completion covering 70+ hook keys in `hooks.py`.

#### Server-Side Python Intelligence
- Core document methods (`frappe.get_doc`, `frappe.get_all`, `frappe.get_list`, `frappe.new_doc`).
- Database API coverage (`frappe.db.get_value`, `frappe.db.set_value`, `frappe.db.sql`, `frappe.db.exists`, `frappe.db.count`).
- Document lifecycle hooks (`validate`, `before_save`, `on_update`, `on_submit`, `on_cancel`).
- Utility functions (`frappe.utils.today`, `nowdate`, `flt`, `cint`, `money_in_words`).

#### Anti-Pattern Diagnostics and Security Linters
- N+1 database query detection in iterative loops (`for`/`while`).
- Infinite recursion detection for `self.save()` or `self.insert()` inside lifecycle validation hooks.
- SQL injection vulnerability detection in raw SQL strings with QuickFix actions.
- Transactional atomicity checker for explicit `frappe.db.commit()` inside document hooks.
- Deprecation warnings across Frappe framework versions v13 through v16.

#### Typing Generators
- Python PEP 561 `.pyi` stub generator with typed child table attributes.
- Ambient TypeScript `.d.ts` declaration generator for DocTypes.

#### Webview Form Layout Previewer and Frappe Explorer
- Interactive Webview previewer rendering graphical DocType form layouts directly from JSON definitions (Tab Breaks, Section Breaks, Column Breaks, and Child Table Grids).
- Dedicated Activity Bar sidebar with Frappe Explorer tree view for Apps, Modules, DocTypes, and DocFields.

#### Code Scaffolding
- Boilerplate generators for Client Scripts, Server Scripts, Web Pages, Print Formats, Script Reports, Desk Pages, Migration Patches, Unit Tests, Web Forms, and ListView Settings.

#### Bench Command Integration
- Command palette shortcuts for cache clearing, schema migration, server restart, asset building, console access, backup/restore, and test running.
