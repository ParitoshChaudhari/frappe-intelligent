import * as vscode from 'vscode';
import { DeprecationMatrix } from '../indexer/deprecationMatrix';
import { IndexManager } from '../indexer/indexManager';
import { FileClassifier } from '../context/fileClassifier';
import { FrappeVersion } from '../core/types';

export class FrappeDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('frappe');
  }

  public register(context: vscode.ExtensionContext): void {
    if (vscode.window.activeTextEditor) {
      this.analyzeDocument(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.analyzeDocument(doc)),
      vscode.workspace.onDidChangeTextDocument((e) => this.debouncedAnalyze(e.document)),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        const key = doc.uri.toString();
        const timer = this.debounceTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(key);
        }
        this.diagnosticCollection.delete(doc.uri);
      }),
      this.diagnosticCollection
    );
  }

  public debouncedAnalyze(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.analyzeDocument(document);
    }, 250);

    this.debounceTimers.set(key, timer);
  }

  public analyzeDocument(document: vscode.TextDocument): void {
    if (document.languageId !== 'python' && document.languageId !== 'javascript') {
      return;
    }

    const config = vscode.workspace.getConfiguration('frappeIntelligent');
    if (!config.get<boolean>('enableDeprecationWarnings', true)) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const index = IndexManager.getInstance();
    const bench = index.getBenchContext();
    const version: FrappeVersion = bench?.frappeVersion || (config.get('defaultFrappeVersion') as FrappeVersion) || 'v15';
    const fileInfo = FileClassifier.classify(document.fileName, document.getText());

    const diagnostics: vscode.Diagnostic[] = [];
    let insideDocMethod = false;
    let currentMethodName = '';
    let insideLoop = false;
    let loopIndent = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      const trimmed = text.trim();

      // Fast path: skip empty or purely whitespace lines
      if (!trimmed) continue;

      const indent = text.length - text.trimStart().length;

      // Track loop scopes
      if (fileInfo.isServerCode && (trimmed.startsWith('for ') || trimmed.startsWith('while ')) && trimmed.endsWith(':')) {
        insideLoop = true;
        loopIndent = indent;
      } else if (insideLoop && indent <= loopIndent && !trimmed.startsWith('#')) {
        insideLoop = false;
      }

      // 1. Transactional Linter & Recursive Save Linter in Python controllers
      if (fileInfo.isServerCode && fileInfo.fileType === 'doctype_controller_py') {
        const methodMatch = text.match(/^\s+def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (methodMatch && indent <= 4) {
          currentMethodName = methodMatch[1];
          insideDocMethod = ['validate', 'before_save', 'on_submit', 'before_insert', 'on_cancel', 'before_validate'].includes(currentMethodName);
        } else if (text.startsWith('class ') || (text.startsWith('def ') && !text.startsWith(' ')) || indent <= 4) {
          insideDocMethod = false;
          currentMethodName = '';
        }

        // Check frappe.db.commit() inside lifecycle hooks
        if (insideDocMethod && text.includes('frappe.db.commit()')) {
          const diagnostic = new vscode.Diagnostic(
            line.range,
            '[Frappe Best Practice] Calling frappe.db.commit() inside Document controller hooks breaks transactional atomicity. Frappe commits automatically at the end of the request.',
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = 'Frappe Intelligent';
          diagnostics.push(diagnostic);
        }

        // Check recursive self.save() inside validate / before_save
        if (insideDocMethod && ['validate', 'before_save', 'before_insert', 'before_validate'].includes(currentMethodName)) {
          if (text.includes('self.save()') || text.includes('self.insert()') || text.includes('doc.save()')) {
            const diagnostic = new vscode.Diagnostic(
              line.range,
              `[Infinite Recursion Warning] Calling save()/insert() inside '${currentMethodName}' triggers recursive document lifecycle loops. Field mutations on 'self' are automatically saved.`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'Frappe Intelligent';
            diagnostics.push(diagnostic);
          }
        }
      }

      // 2. N+1 Database Query Linter in loops
      if (fileInfo.isServerCode && insideLoop) {
        if (text.includes('frappe.db.get_value(') || text.includes('frappe.get_doc(')) {
          const diagnostic = new vscode.Diagnostic(
            line.range,
            '[Performance Warning: N+1 Query] Executing database queries inside a loop degrades performance. Use batch fetching with frappe.get_all() or frappe.qb before the loop.',
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = 'Frappe Intelligent';
          diagnostics.push(diagnostic);
        }
      }

      // 3. Version & Deprecation Rules (Fast keyword filter to skip 95%+ of lines)
      if (text.includes('frappe') || text.includes('cur_frm')) {
        const deprecations = DeprecationMatrix.getDeprecationsForVersion(version, text);
        for (const dep of deprecations) {
          if (dep.pattern.source.includes('cur_frm') && fileInfo.fileType !== 'doctype_form_js') {
            continue;
          }
          const diagnostic = new vscode.Diagnostic(
            line.range,
            `[Frappe ${version}] Deprecation Warning: ${dep.message}` + (dep.replacement ? ` (Suggested: ${dep.replacement})` : ''),
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = 'Frappe Intelligent';
          diagnostics.push(diagnostic);
        }
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }
}

