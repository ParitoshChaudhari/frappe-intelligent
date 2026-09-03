import * as fs from 'fs';
import * as path from 'path';
import { FrappeVersion } from './types';

/**
 * Detects Frappe framework and app versions from pyproject.toml, __init__.py, or package metadata.
 */
export class VersionDetector {
  public static parseVersionString(versionStr: string): FrappeVersion {
    const clean = versionStr.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const major = parseInt(parts[0], 10);

    if (major <= 13) {
      return 'v13';
    } else if (major === 14) {
      return 'v14';
    } else if (major === 15) {
      return 'v15';
    } else if (major >= 16) {
      return 'v16';
    }

    return 'v15';
  }

  public static detectAppVersion(appPath: string): { version: string; majorVersion: FrappeVersion } {
    const appName = path.basename(appPath);

    // 1. Try pyproject.toml
    const pyprojectPath = path.join(appPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf8');
        const match = content.match(/version\s*=\s*["']([^"']+)["']/);
        if (match && match[1]) {
          return {
            version: match[1],
            majorVersion: this.parseVersionString(match[1]),
          };
        }
      } catch {
        // ignore and fallback
      }
    }

    // 2. Try __init__.py
    const initPaths = [
      path.join(appPath, appName, '__init__.py'),
      path.join(appPath, '__init__.py'),
    ];

    for (const initPath of initPaths) {
      if (fs.existsSync(initPath)) {
        try {
          const content = fs.readFileSync(initPath, 'utf8');
          const match = content.match(/__version__\s*=\s*["']([^"']+)["']/);
          if (match && match[1]) {
            return {
              version: match[1],
              majorVersion: this.parseVersionString(match[1]),
            };
          }
        } catch {
          // ignore and fallback
        }
      }
    }

    // Default fallback
    return {
      version: '15.0.0',
      majorVersion: 'v15',
    };
  }
}
