import * as path from 'path';
import { FileClassificationResult, FrappeFileType } from '../core/types';

/**
 * Heuristically classifies files in a Frappe project based on path, name, and contents.
 */
export class FileClassifier {
  public static classify(filePath: string, fileContent?: string): FileClassificationResult {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    // Default result
    const result: FileClassificationResult = {
      fileType: ext === '.py' ? 'generic_py' : ext === '.js' ? 'generic_js' : 'unknown',
      isServerCode: ext === '.py',
      isClientCode: ext === '.js' || ext === '.ts',
    };

    // Extract App Name if inside apps/<app_name>/
    const appMatch = normalizedPath.match(/\/apps\/([^/]+)\//);
    if (appMatch) {
      result.appName = appMatch[1];
    }

    // 1. DocType Schema JSON
    if (normalizedPath.includes('/doctype/') && basename.endsWith('.json')) {
      result.fileType = 'doctype_schema_json';
      result.doctypeName = path.basename(basename, '.json');
      return result;
    }

    // 2. DocType Server Controller Python
    if (normalizedPath.includes('/doctype/') && ext === '.py') {
      const parts = normalizedPath.split('/');
      const doctypeIdx = parts.lastIndexOf('doctype');
      if (doctypeIdx !== -1 && parts.length > doctypeIdx + 2) {
        const folderDocType = parts[doctypeIdx + 1];
        if (basename.startsWith('test_')) {
          result.fileType = 'test_py';
          result.doctypeName = folderDocType;
          return result;
        }

        result.fileType = 'doctype_controller_py';
        result.doctypeName = folderDocType;
        result.isServerCode = true;
        result.isClientCode = false;
        return result;
      }
    }

    // 3. DocType Client Form Script JS
    if (normalizedPath.includes('/doctype/') && ext === '.js') {
      const parts = normalizedPath.split('/');
      const doctypeIdx = parts.lastIndexOf('doctype');
      if (doctypeIdx !== -1 && parts.length > doctypeIdx + 2) {
        const folderDocType = parts[doctypeIdx + 1];
        if (basename === folderDocType + '.js') {
          result.fileType = 'doctype_form_js';
          result.doctypeName = folderDocType;
          result.isServerCode = false;
          result.isClientCode = true;
          return result;
        } else if (basename === folderDocType + '_list.js') {
          result.fileType = 'doctype_list_js' as any;
          result.doctypeName = folderDocType;
          result.isClientCode = true;
          return result;
        }
      }
    }

    // HTML/Jinja templates in DocType directory
    if (normalizedPath.includes('/doctype/') && (ext === '.html' || ext === '.htm')) {
      const parts = normalizedPath.split('/');
      const doctypeIdx = parts.lastIndexOf('doctype');
      if (doctypeIdx !== -1 && parts.length > doctypeIdx + 2) {
        result.fileType = 'unknown'; // Keep as unknown but set doctypeName
        result.doctypeName = parts[doctypeIdx + 1];
        return result;
      }
    }

    // 4. Hooks.py
    if (basename === 'hooks.py') {
      result.fileType = 'hooks_py';
      result.isServerCode = true;
      return result;
    }

    // 5. Patches
    if (normalizedPath.includes('/patches/') && ext === '.py') {
      result.fileType = 'patch_py';
      result.isServerCode = true;
      return result;
    }

    // 6. Reports (Python and JS)
    if (normalizedPath.includes('/report/')) {
      if (ext === '.py') {
        result.fileType = 'report_py';
        result.isServerCode = true;
        return result;
      } else if (ext === '.js') {
        result.fileType = 'report_js';
        result.isClientCode = true;
        return result;
      }
    }

    // 7. Desk Page JS
    if (normalizedPath.includes('/page/') && ext === '.js') {
      result.fileType = 'page_js';
      result.isClientCode = true;
      return result;
    }

    // 8. Unit Tests
    if (basename.startsWith('test_') && ext === '.py') {
      result.fileType = 'test_py';
      result.isServerCode = true;
      return result;
    }

    // 9. API / Utility modules
    if (basename === 'api.py' || (normalizedPath.includes('/api/') && ext === '.py')) {
      result.fileType = 'api_module_py';
      result.isServerCode = true;
      return result;
    }

    // Content-based heuristic fallback if fileContent is provided
    if (fileContent) {
      if (ext === '.py') {
        if (fileContent.includes('from frappe.model.document import Document') || fileContent.includes('(Document):')) {
          result.fileType = 'doctype_controller_py';
        } else if (fileContent.includes('@frappe.whitelist')) {
          result.fileType = 'api_module_py';
        }
      } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
        if (fileContent.includes('frappe.ui.form.on(') || fileContent.includes('refresh(frm)')) {
          result.fileType = 'doctype_form_js';
        }
        if (!result.doctypeName) {
          const formOnMatch = fileContent.match(/frappe\.ui\.form\.on\(\s*['"]([^'"]+)['"]/);
          if (formOnMatch && formOnMatch[1]) {
            result.doctypeName = formOnMatch[1];
          }
        }
      } else if (ext === '.html' || ext === '.htm') {
        const docTypeMatch = fileContent.match(/<!--\s*doctype\s*:\s*([a-zA-Z0-9_ ]+)\s*-->/i) || 
                             fileContent.match(/frappe\.get_doc\(\s*['"]([^'"]+)['"]/);
        if (docTypeMatch && docTypeMatch[1]) {
          result.doctypeName = docTypeMatch[1];
        }
      }
    }

    return result;
  }
}
