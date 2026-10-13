import * as fs from 'fs';
import * as path from 'path';
import { FrappeApiSymbol, FrappeImportSymbol, FrappeMethodParam } from '../core/types';

export interface PyParsedClass {
  name: string;
  superclasses: string[];
  docstring?: string;
  methods: Map<string, FrappeApiSymbol>;
  filePath: string;
  line: number;
}

export interface PyFileIndexResult {
  classes: Map<string, PyParsedClass>;
  whitelistedMethods: Map<string, FrappeApiSymbol>;
  allFunctions: Map<string, FrappeApiSymbol>;
  importSymbols: FrappeImportSymbol[];
}

/**
 * Fast AST/Regex Python code indexer for Frappe classes, methods, docstrings, imports, and whitelisted endpoints.
 */
export class PyIndexer {
  public static parsePythonFile(filePath: string, appName?: string): PyFileIndexResult {
    const classes = new Map<string, PyParsedClass>();
    const whitelistedMethods = new Map<string, FrappeApiSymbol>();
    const allFunctions = new Map<string, FrappeApiSymbol>();
    const importSymbols: FrappeImportSymbol[] = [];

    if (!fs.existsSync(filePath)) {
      return { classes, whitelistedMethods, allFunctions, importSymbols };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      const moduleImportPath = this.inferModuleImportPath(filePath, appName);
      const moduleBaseName = path.basename(filePath, '.py');
      const detectedApp = appName || moduleImportPath.split('.')[0] || 'frappe';

      // Record module itself as an importable symbol
      importSymbols.push({
        importPath: moduleImportPath,
        moduleName: moduleBaseName,
        appName: detectedApp,
        symbolType: 'module',
        sourceFile: filePath,
      });

      let currentClass: PyParsedClass | null = null;
      let pendingDecorator: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Detect Decorators
        if (trimmed.startsWith('@')) {
          if (trimmed.includes('frappe.whitelist') || trimmed.includes('whitelist')) {
            pendingDecorator = 'whitelist';
          }
          continue;
        }

        // 2. Detect Class Definitions
        const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?:/);
        if (classMatch) {
          const className = classMatch[1];
          const superclasses = classMatch[2]
            ? classMatch[2].split(',').map((s) => s.trim())
            : [];
          const classDocstring = this.extractDocstring(lines, i + 1);

          currentClass = {
            name: className,
            superclasses,
            methods: new Map(),
            docstring: classDocstring,
            filePath,
            line: i + 1,
          };
          classes.set(className, currentClass);

          const isDocType = superclasses.some((s) => s.includes('Document') || s.includes('NestedSet') || s.includes('StatusUpdater'));

          importSymbols.push({
            importPath: moduleImportPath,
            moduleName: moduleBaseName,
            appName: detectedApp,
            symbolName: className,
            symbolType: isDocType ? 'doctype' : 'class',
            sourceFile: filePath,
            docstring: classDocstring,
          });
          continue;
        }

        // Accumulate multi-line def if necessary
        let fullDefLine = line;
        let lineOffset = 0;
        if (/^\s*(?:async\s+)?def\s+/.test(line) && !line.includes('):') && !/\)\s*(?:->[^:]+)?\s*:/.test(line)) {
          for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
            fullDefLine += ' ' + lines[j].trim();
            lineOffset++;
            if (lines[j].includes('):') || /\)\s*(?:->[^:]+)?\s*:/.test(lines[j])) {
              break;
            }
          }
        }

        // 3. Detect Method Definitions inside Class
        const methodMatch = fullDefLine.match(/^\s{4}(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)(?:\s*->\s*([^:]+))?:/);
        if (methodMatch && currentClass) {
          const methodName = methodMatch[1];
          const rawParams = methodMatch[2].replace(/\s+/g, ' ').trim();
          const returnType = methodMatch[3]?.trim();

          const params = this.parseParams(rawParams);
          const docstring = this.extractDocstring(lines, i + lineOffset + 1);

          const methodSymbol: FrappeApiSymbol = {
            name: methodName,
            module: currentClass.name,
            signature: `${currentClass.name}.${methodName}(${rawParams})` + (returnType ? ` -> ${returnType}` : ''),
            returnType,
            docstring: docstring || `Method on ${currentClass.name} Document.`,
            parameters: params,
            sourceFile: filePath,
            sourceLine: i + 1,
            isWhitelisted: pendingDecorator === 'whitelist',
          };

          currentClass.methods.set(methodName, methodSymbol);

          if (pendingDecorator === 'whitelist') {
            whitelistedMethods.set(`${currentClass.name}.${methodName}`, methodSymbol);
            whitelistedMethods.set(`${moduleImportPath}.${methodName}`, methodSymbol);
          }
          pendingDecorator = null;
          i += lineOffset;
          continue;
        }

        // 4. Detect Module-Level Function Definitions
        const funcMatch = fullDefLine.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)(?:\s*->\s*([^:]+))?:/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          const rawParams = funcMatch[2].replace(/\s+/g, ' ').trim();
          const returnType = funcMatch[3]?.trim();

          const params = this.parseParams(rawParams);
          const docstring = this.extractDocstring(lines, i + lineOffset + 1);

          const funcSymbol: FrappeApiSymbol = {
            name: funcName,
            module: path.basename(filePath, '.py'),
            signature: `def ${funcName}(${rawParams})` + (returnType ? ` -> ${returnType}` : ''),
            returnType,
            docstring: docstring || `Function defined in ${path.basename(filePath)}`,
            parameters: params,
            sourceFile: filePath,
            sourceLine: i + 1,
            isWhitelisted: pendingDecorator === 'whitelist',
          };

          allFunctions.set(funcName, funcSymbol);

          importSymbols.push({
            importPath: moduleImportPath,
            moduleName: moduleBaseName,
            appName: detectedApp,
            symbolName: funcName,
            symbolType: 'function',
            sourceFile: filePath,
            docstring,
          });

          if (pendingDecorator === 'whitelist') {
            whitelistedMethods.set(funcName, funcSymbol);
            whitelistedMethods.set(`${moduleImportPath}.${funcName}`, funcSymbol);
          }
          pendingDecorator = null;
          currentClass = null;
          i += lineOffset;
          continue;
        }

        if (trimmed !== '' && !trimmed.startsWith('@') && !trimmed.startsWith('#')) {
          pendingDecorator = null;
        }
      }
    } catch {
      // ignore
    }

    return { classes, whitelistedMethods, allFunctions, importSymbols };
  }

  public static inferModuleImportPath(filePath: string, appName?: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const appsIdx = normalized.lastIndexOf('/apps/');
    let rel = '';

    if (appsIdx !== -1) {
      const afterApps = normalized.substring(appsIdx + 6);
      const firstSlash = afterApps.indexOf('/');
      if (firstSlash !== -1) {
        rel = afterApps.substring(firstSlash + 1);
      } else {
        rel = afterApps;
      }
    } else {
      rel = normalized;
      if (appName) {
        const appIdx = rel.lastIndexOf(`/${appName}/`);
        if (appIdx !== -1) {
          rel = rel.substring(appIdx + 1);
        }
      }
    }

    // Clean up .py and /__init__
    let mod = rel.replace(/\.py$/i, '');
    if (mod.endsWith('/__init__')) {
      mod = mod.substring(0, mod.length - 9);
    }
    return mod.replace(/^[./]+/, '').replace(/\//g, '.');
  }

  private static parseParams(rawParams: string): FrappeMethodParam[] {
    if (!rawParams.trim()) return [];

    const params: string[] = [];
    let current = '';
    let bracketDepth = 0;
    let parenDepth = 0;
    let braceDepth = 0;
    let inQuote: string | null = null;

    for (let i = 0; i < rawParams.length; i++) {
      const char = rawParams[i];
      if (inQuote) {
        if (char === inQuote && rawParams[i - 1] !== '\\') {
          inQuote = null;
        }
        current += char;
      } else if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
      } else if (char === '[') {
        bracketDepth++;
        current += char;
      } else if (char === ']') {
        if (bracketDepth > 0) bracketDepth--;
        current += char;
      } else if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        if (parenDepth > 0) parenDepth--;
        current += char;
      } else if (char === '{') {
        braceDepth++;
        current += char;
      } else if (char === '}') {
        if (braceDepth > 0) braceDepth--;
        current += char;
      } else if (char === ',' && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
        if (current.trim()) params.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      params.push(current.trim());
    }

    return params
      .filter((p) => p !== 'self' && p !== 'cls' && p.length > 0)
      .map((p) => {
        const eqIdx = p.indexOf('=');
        const declaration = eqIdx !== -1 ? p.substring(0, eqIdx).trim() : p.trim();
        const defaultVal = eqIdx !== -1 ? p.substring(eqIdx + 1).trim() : undefined;

        const colonIdx = declaration.indexOf(':');
        const name = colonIdx !== -1 ? declaration.substring(0, colonIdx).trim() : declaration;
        const typeStr = colonIdx !== -1 ? declaration.substring(colonIdx + 1).trim() : undefined;

        let structure: string | undefined;
        if (typeStr) {
          if (typeStr.includes('dict')) structure = '{ "key": value }';
          else if (typeStr.includes('list')) structure = '[ "item" ]';
        }

        return {
          name,
          type: typeStr,
          structure,
          default: defaultVal,
          optional: defaultVal !== undefined,
        };
      });
  }

  private static extractDocstring(lines: string[], startLine: number): string | undefined {
    if (startLine >= lines.length) return undefined;

    const firstLine = lines[startLine].trim();
    if (firstLine.startsWith('"""') || firstLine.startsWith("'''")) {
      const quote = firstLine.substring(0, 3);
      if (firstLine.endsWith(quote) && firstLine.length > 3) {
        return firstLine.substring(3, firstLine.length - 3).trim();
      }

      const docLines: string[] = [firstLine.substring(3)];
      for (let i = startLine + 1; i < Math.min(lines.length, startLine + 25); i++) {
        const line = lines[i];
        if (line.includes(quote)) {
          docLines.push(line.substring(0, line.indexOf(quote)));
          break;
        }
        docLines.push(line);
      }
      return docLines.join('\n').trim();
    }
    return undefined;
  }
}

