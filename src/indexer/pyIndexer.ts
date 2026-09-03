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

        // 3. Detect Method Definitions inside Class
        const methodMatch = line.match(/^\s{4}def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
        if (methodMatch && currentClass) {
          const methodName = methodMatch[1];
          const rawParams = methodMatch[2];
          const returnType = methodMatch[3]?.trim();

          const params = this.parseParams(rawParams);
          const docstring = this.extractDocstring(lines, i + 1);

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
          continue;
        }

        // 4. Detect Module-Level Function Definitions
        const funcMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          const rawParams = funcMatch[2];
          const returnType = funcMatch[3]?.trim();

          const params = this.parseParams(rawParams);
          const docstring = this.extractDocstring(lines, i + 1);

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
          continue;
        }

        if (!trimmed.startsWith('@')) {
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

    return rawParams
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p !== 'self' && p !== 'cls' && p.length > 0)
      .map((p) => {
        const parts = p.split('=');
        const nameAndType = parts[0].trim().split(':');
        const typeStr = nameAndType[1]?.trim();
        let structure: string | undefined;
        if (typeStr) {
          if (typeStr.includes('dict')) structure = '{ "key": value }';
          else if (typeStr.includes('list')) structure = '[ "item" ]';
        }
        return {
          name: nameAndType[0].trim(),
          type: typeStr,
          structure,
          default: parts[1]?.trim(),
          optional: parts.length > 1,
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

