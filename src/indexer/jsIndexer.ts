import * as fs from 'fs';
import { FrappeApiSymbol } from '../core/types';

export interface JsClientHandler {
  doctype: string;
  eventName: string;
  sourceFile: string;
  sourceLine: number;
}

export interface JsFileIndexResult {
  formHandlers: JsClientHandler[];
  functions: Map<string, FrappeApiSymbol>;
}

/**
 * Parses client JavaScript files to extract Form handlers and Frappe client methods.
 */
export class JsIndexer {
  public static parseJsFile(filePath: string): JsFileIndexResult {
    const formHandlers: JsClientHandler[] = [];
    const functions = new Map<string, FrappeApiSymbol>();

    if (!fs.existsSync(filePath)) {
      return { formHandlers, functions };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      // Match `frappe.ui.form.on("DocType", { ... })`
      const formOnRegex = /frappe\.ui\.form\.on\s*\(\s*["']([^"']+)["']\s*,\s*\{/g;
      let match: RegExpExecArray | null;

      while ((match = formOnRegex.exec(content)) !== null) {
        const doctype = match[1];
        const line = content.substring(0, match.index).split('\n').length;
        formHandlers.push({
          doctype,
          eventName: 'form_events',
          sourceFile: filePath,
          sourceLine: line,
        });
      }

      // Match top-level functions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcMatch = line.match(/(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/);
        if (funcMatch) {
          const funcName = funcMatch[1] || funcMatch[2];
          if (funcName) {
            functions.set(funcName, {
              name: funcName,
              module: 'client',
              signature: `${funcName}()`,
              docstring: `Client JavaScript function in ${filePath}`,
              parameters: [],
              sourceFile: filePath,
              sourceLine: i + 1,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    return { formHandlers, functions };
  }
}
