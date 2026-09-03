# Frappe Intelligent

[![GitHub Repository](https://img.shields.io/badge/GitHub-ParitoshChaudhari%2Ffrappe--intelligent-blue?logo=github)](https://github.com/ParitoshChaudhari/frappe-intelligent)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)](https://github.com/ParitoshChaudhari/frappe-intelligent/releases)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-blue.svg)](https://marketplace.visualstudio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ParitoshChaudhari/frappe-intelligent/blob/main/LICENSE)

**Frappe Intelligent** is an all-in-one developer intelligence and productivity suite built specifically for the **Frappe Framework**, **ERPNext**, **HRMS**, and custom Frappe apps in Visual Studio Code.

It brings deep multi-app AST analysis, accurate context-aware autocompletion, real-time security & anti-pattern linting, strongly-typed stub generation, interactive Form layout previewing, and seamless Bench CLI integration directly into your editor.

---

## 🚀 Key Features

### 1. 🌐 Whole-Project AST Indexing & Custom Field Discovery
- **Multi-App Recursive Scanner**: Automatically discovers and indexes all installed apps (`apps/*`), DocTypes, modules, and Python classes on startup.
- **Custom Field Detection**: Parses `fixtures/*.json` and `custom/*.json` files to dynamically attach custom fields to their parent DocTypes with `[Custom Field]` badges.
- **Python Import Tree**: AST indexer maps every class, function, and `@frappe.whitelist` method for fast `from app.module import Class` suggestions.
- **Live Incremental File Watcher**: Automatically keeps index maps synchronized as files are created, modified, or deleted.

---

### 2. 🧠 Context-Aware Multi-Line Autocompletion
- **Multi-Line Scope Reconstructor**: Seamlessly infers arguments and context even when function calls span across multiple lines with indentation and line breaks.
- **Inferred Child Table Row Completion**: Automatically infers child table types and autocompletes fields when iterating in Python (`for item in self.items: item.`) or JavaScript (`let row = frm.add_child('items'); row.`).
- **`frm.fields_dict` Completion**: Instant fieldname autocompletion when typing `frm.fields_dict.` or `cur_frm.fields_dict.`.
- **Server Python APIs**: `frappe.get_doc`, `frappe.get_all`, `frappe.db.get_value`, `frappe.db.set_value`, `frappe.qb`, `frappe.utils`, `frappe.enqueue`, `frappe.sendmail`, `frappe.publish_realtime`, `frappe.cache`, and `Document` controller lifecycle methods.
- **Client JavaScript APIs**: `frappe.call`, `frappe.xcall`, `frappe.msgprint`, `frappe.show_alert`, `frappe.confirm`, `frappe.prompt`, `frappe.ui.Dialog`, `frm`, `grid`, `page`, and `frappe.listview_settings`.
- **Jinja Print Formats & Templates**: Filters (`| format_currency`, `| format_date`), helper methods, and iteration properties (`doc.items`).
- **70+ Frappe Hooks**: Autocomplete for `doc_events`, `override_whitelisted_methods`, `scheduler_events`, `fixtures`, `portal_menu_items`, and more.

---

### 3. 📖 Deep Hover Documentation & Signature Help
- **Parameter Structure Guides**: Explicit templates showing required dictionaries (`{ "key": "value" }`) or lists (`[ "item" ]`).
- **Return Type & Meaning**: Clear explanations of return types and data structures.
- **Omnipresent Signature Help**: Displays active parameter indicators, parameter types, and defaults in real time.

---

### 4. 🛡️ Advanced Security & Anti-Pattern Diagnostics
- **N+1 Database Query Linter**: Detects and warns when database queries (`frappe.db.get_value`, `frappe.get_doc`) are executed inside `for` or `while` loops, suggesting batch fetching with `frappe.get_all()` or `frappe.qb`.
- **Infinite Recursion Save Linter**: Flags `self.save()` or `self.insert()` calls inside `validate()`, `before_save()`, or `before_insert()` controller hooks.
- **SQL Injection Detection**: Warns against string formatting (`f"..."`, `.format()`, `%s`) inside `frappe.db.sql()`.
- **Transactional Atomicity Linter**: Flags `frappe.db.commit()` inside document lifecycle hooks.
- **Version Deprecation Matrix**: Flags deprecated APIs across Frappe v13, v14, v15, and v16 with one-click QuickFix CodeActions.

---

### 5. 🏷️ Strongly-Typed Stub Generator (`.pyi` & `.d.ts`)
- **Python `.pyi` Stubs**: Generates PEP 561 type stubs with strongly-typed child tables (`items: list['SalesOrderItem']`) for Pylance / Pyright.
- **Ambient JavaScript `.d.ts` Types**: Generates ambient TypeScript definitions (`interface SalesOrderDoc { ... }`) for instant client-side autocomplete.

---

### 6. 🎨 Webview Form Layout Previewer & Frappe Explorer
- **Interactive Form Previewer**: Live graphical preview of DocType form layouts directly from `.json` schema files, supporting **Tab Breaks**, **Section Breaks**, **Column Breaks**, and **Child Table** columns.
- **Frappe Explorer Sidebar**: Interactive tree view displaying installed Apps, Modules, DocTypes, and DocFields in the Activity Bar.
- **Active Site Selector**: Switch active Frappe site directly from the status bar or Command Palette.

---

### 7. ⚙️ Bench CLI Commands & Code Scaffolding
Execute bench commands without leaving VS Code:
- `Frappe: Bench Clear Cache`
- `Frappe: Bench Migrate`
- `Frappe: Bench Restart`
- `Frappe: Bench Build`
- `Frappe: Open Bench Console`
- `Frappe: Bench Backup` / `Restore`
- `Frappe: Bench New App` / `Get App` / `Install App` / `Uninstall App`
- `Frappe: Bench Run Unit Tests`

Generate production-ready Frappe boilerplate:
- `Frappe: Scaffold Custom Client Script`
- `Frappe: Scaffold Server Script / Webhook Handler`
- `Frappe: Scaffold Script Report` (Python + JS filter)
- `Frappe: Scaffold Desk Page` (JS + HTML)
- `Frappe: Scaffold Portal / Website Web Page`
- `Frappe: Scaffold Print Format Template`
- `Frappe: Scaffold Migration Patch`
- `Frappe: Scaffold Unit Test (FrappeTestCase)`
- `Frappe: Scaffold Web Form Script`
- `Frappe: Scaffold ListView Settings`

---

## 📦 Installation

### From VSIX Package
1. Download the latest `frappe-intelligent-0.0.1.vsix` from [Releases](https://github.com/ParitoshChaudhari/frappe-intelligent/releases).
2. Install via VS Code Terminal:
   ```bash
   code --install-extension frappe-intelligent-0.0.1.vsix
   ```
3. Or via VS Code UI:
   - Open the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Click the **`...`** (Views and More Actions) menu in the top right.
   - Select **Install from VSIX...** and choose `frappe-intelligent-0.0.1.vsix`.

---

## ⚙️ Extension Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `frappeIntelligent.defaultFrappeVersion` | `string` | `"v15"` | Target Frappe Framework version (`v13`, `v14`, `v15`, `v16`). |
| `frappeIntelligent.enableDeprecationWarnings` | `boolean` | `true` | Enable real-time version deprecation diagnostics. |
| `frappeIntelligent.enableDocTypeFormPreview` | `boolean` | `true` | Enable interactive DocType Webview Form Previewer. |
| `frappeIntelligent.autoGenerateStubs` | `boolean` | `false` | Automatically generate `.pyi` and `.d.ts` stubs on project open. |

---

## 🔗 Links & Resources

- **GitHub Repository**: [https://github.com/ParitoshChaudhari/frappe-intelligent](https://github.com/ParitoshChaudhari/frappe-intelligent)
- **Issue Tracker**: [https://github.com/ParitoshChaudhari/frappe-intelligent/issues](https://github.com/ParitoshChaudhari/frappe-intelligent/issues)
- **Release Notes**: [https://github.com/ParitoshChaudhari/frappe-intelligent/releases](https://github.com/ParitoshChaudhari/frappe-intelligent/releases)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](https://github.com/ParitoshChaudhari/frappe-intelligent/blob/main/LICENSE) file for details.
