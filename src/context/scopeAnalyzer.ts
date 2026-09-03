import { CursorScopeContext, FileClassificationResult } from '../core/types';
import { IndexManager } from '../indexer/indexManager';

/**
 * Advanced multi-line scope analyzer with quotation tracking, child table inference,
 * and robust argument indexing for Python and JavaScript.
 */
export class ScopeAnalyzer {
  public static analyze(
    lineText: string,
    characterPosition: number,
    fileInfo: FileClassificationResult,
    fullContent?: string
  ): CursorScopeContext {
    const textBeforeCursorOnLine = lineText.substring(0, characterPosition);
    const trimmedBefore = textBeforeCursorOnLine.trimStart();
    const context: CursorScopeContext = {
      currentDocType: fileInfo.doctypeName,
    };

    // 0. Detect Quote Context on current line
    const quoteInfo = this.checkQuoteContext(textBeforeCursorOnLine);
    context.isInsideQuotes = quoteInfo.isInside;
    context.quoteChar = quoteInfo.quoteChar;

    // 1. Detect Python Import Statement Context
    if (fileInfo.isServerCode) {
      if (trimmedBefore.startsWith('from ')) {
        const fromMatch = trimmedBefore.match(/^from\s+([a-zA-Z0-9_.]*)(?:\s+import\s+([a-zA-Z0-9_, ]*))?$/);
        if (fromMatch) {
          context.importContext = {
            isImport: true,
            isFromImport: true,
            modulePrefix: fromMatch[1],
          };
          return context;
        }
      } else if (trimmedBefore.startsWith('import ')) {
        const importMatch = trimmedBefore.match(/^import\s+([a-zA-Z0-9_.]*)$/);
        if (importMatch) {
          context.importContext = {
            isImport: true,
            isFromImport: false,
            modulePrefix: importMatch[1],
          };
          return context;
        }
      }
    }

    // 2. Reconstruct Multi-line Text Before Cursor if inside an unclosed expression
    let textBeforeCursor = textBeforeCursorOnLine;
    if (fullContent && !textBeforeCursorOnLine.includes('(') && !textBeforeCursorOnLine.includes('{')) {
      const reconstructed = this.reconstructMultiLineContext(fullContent, lineText, characterPosition);
      if (reconstructed) {
        textBeforeCursor = reconstructed;
      }
    }

    const hasDot = textBeforeCursorOnLine.includes('.');
    const hasParen = textBeforeCursor.includes('(');
    const hasBrace = textBeforeCursor.includes('{');

    // 3. Detect object member access (e.g. `frappe.db.`, `frm.fields_dict.`, `frm.`, `doc.`, `self.`)
    if (hasDot) {
      const memberAccessMatch = textBeforeCursorOnLine.match(/(?:([a-zA-Z0-9_$.()]+)\.)([a-zA-Z0-9_$]*)$/);
      if (memberAccessMatch) {
        context.targetObject = memberAccessMatch[1];

        // Child Table Row Property Access Detection in Python (e.g. `row.` or `item.`)
        if (fileInfo.isServerCode && fileInfo.doctypeName && ['row', 'item', 'd', 'child'].includes(context.targetObject)) {
          const inferredDt = this.inferChildTableDocTypeFromContent(fullContent || lineText, fileInfo.doctypeName, context.targetObject);
          if (inferredDt) {
            context.childTableRowDocType = inferredDt;
          }
        }

        // Child Table Row in JavaScript (e.g. `row.`, `d.`, `child.`)
        if (fileInfo.isClientCode && fileInfo.doctypeName && ['row', 'd', 'child', 'item'].includes(context.targetObject)) {
          const inferredDt = this.inferChildTableDocTypeFromJs(fullContent || lineText, fileInfo.doctypeName, context.targetObject);
          if (inferredDt) {
            context.childTableRowDocType = inferredDt;
          }
        }

        return context;
      }
    }

    // 4. Detect `frappe.call({` or `frappe.xcall(` object literal / parameter completion
    if (hasParen && hasBrace) {
      const objectLiteralMatch = textBeforeCursor.match(/frappe\.call\(\s*\{[^}]*$/);
      if (objectLiteralMatch) {
        context.callContext = {
          callee: 'frappe.call',
          argIndex: 0,
          isObjectLiteral: true,
        };
        return context;
      }
    }

    // 5. Detect function call parameter context with multi-line argument index tracking
    if (hasParen) {
      const callMatch = textBeforeCursor.match(/([a-zA-Z0-9_$.]+)\s*\(([^()]*)$/);
      if (callMatch) {
        const callee = callMatch[1];
        const argsSoFar = callMatch[2];
        const argIndex = this.countArgumentIndex(argsSoFar);

        context.callContext = {
          callee,
          argIndex,
        };

        // Extract 1st argument DocType string if present, e.g. `frappe.db.get_value("Employee", ...)`
        const trimmedArgs = argsSoFar.trimStart();
        const firstArgMatch = trimmedArgs.match(/^['"]([a-zA-Z0-9_ ]+)['"]/);
        if (firstArgMatch) {
          context.targetDocTypeInCall = firstArgMatch[1];
        }

        // If in frappe.ui.form.on('DocType', ...)
        if (callee === 'frappe.ui.form.on' && firstArgMatch) {
          context.currentDocType = firstArgMatch[1];
        }

        // If in frappe.xcall("method", ...)
        if (callee === 'frappe.xcall') {
          if (firstArgMatch) {
            context.targetDocTypeInCall = firstArgMatch[1];
          }
        }

        return context;
      }
    }

    // 6. Check if inside DocType class or Client Form handler
    if (fileInfo.isServerCode && fileInfo.fileType === 'doctype_controller_py') {
      context.isInsideDocTypeClass = true;
    }

    if (fileInfo.isClientCode && fileInfo.fileType === 'doctype_form_js') {
      context.isInsideFormHandler = true;
    }

    return context;
  }

  public static checkQuoteContext(textBeforeCursor: string): { isInside: boolean; quoteChar?: string } {
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < textBeforeCursor.length; i++) {
      const char = textBeforeCursor[i];
      const prev = i > 0 ? textBeforeCursor[i - 1] : '';

      if (char === "'" && !inDouble && prev !== '\\') {
        inSingle = !inSingle;
      } else if (char === '"' && !inSingle && prev !== '\\') {
        inDouble = !inDouble;
      }
    }

    return {
      isInside: inSingle || inDouble,
      quoteChar: inSingle ? "'" : inDouble ? '"' : undefined,
    };
  }

  public static reconstructMultiLineContext(
    fullContent: string,
    currentLineText: string,
    characterPosition: number
  ): string | null {
    const lines = fullContent.split(/\r?\n/);
    let targetLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === currentLineText) {
        targetLineIdx = i;
        break;
      }
    }

    if (targetLineIdx <= 0) return null;

    let combined = currentLineText.substring(0, characterPosition);
    let parenDepth = 0;
    let foundOpenParen = false;

    for (let j = targetLineIdx; j >= Math.max(0, targetLineIdx - 15); j--) {
      const line = j === targetLineIdx ? currentLineText.substring(0, characterPosition) : lines[j];
      for (let k = line.length - 1; k >= 0; k--) {
        const c = line[k];
        if (c === ')') parenDepth++;
        else if (c === '(') {
          if (parenDepth > 0) {
            parenDepth--;
          } else {
            foundOpenParen = true;
            break;
          }
        }
      }

      if (j !== targetLineIdx) {
        combined = lines[j] + ' ' + combined;
      }

      if (foundOpenParen) {
        return combined;
      }
    }

    return null;
  }

  public static inferChildTableDocTypeFromContent(
    content: string,
    parentDocType: string,
    rowVarName: string
  ): string | undefined {
    const index = IndexManager.getInstance();
    // Match Python: `for row in self.items:` or `for item in doc.items:`
    const loopRegex = new RegExp(`for\\s+${rowVarName}\\s+in\\s+(?:self|doc)\\.([a-zA-Z0-9_]+):`);
    const match = content.match(loopRegex);
    if (match && match[1]) {
      const tableFieldName = match[1];
      return index.getChildDocTypeName(parentDocType, tableFieldName);
    }
    return undefined;
  }

  public static inferChildTableDocTypeFromJs(
    content: string,
    parentDocType: string,
    rowVarName: string
  ): string | undefined {
    const index = IndexManager.getInstance();
    // Match JS: `let row = frm.add_child('items');` or `const d = locals[cdt][cdn];`
    const addChildRegex = new RegExp(`(?:let|const|var)\\s+${rowVarName}\\s*=\\s*(?:frm|cur_frm)\\.add_child\\(['"]([^'"]+)['"]\\)`);
    const match = content.match(addChildRegex);
    if (match && match[1]) {
      const tableFieldName = match[1];
      return index.getChildDocTypeName(parentDocType, tableFieldName);
    }
    return undefined;
  }

  public static countArgumentIndex(argsText: string): number {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let depth = 0;
    let commas = 0;

    for (let i = 0; i < argsText.length; i++) {
      const char = argsText[i];
      const prevChar = i > 0 ? argsText[i - 1] : '';

      if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if ((char === ')' || char === ']' || char === '}') && depth > 0) {
          depth--;
        } else if (char === ',' && depth === 0) {
          commas++;
        }
      }
    }
    return commas;
  }
}


