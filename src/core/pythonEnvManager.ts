import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BenchContext } from './types';

/**
 * Manages Python virtual environment detection and VS Code Python extension configuration.
 */
export class PythonEnvManager {
  public static findBenchPythonInterpreter(benchRoot: string): string | null {
    // POSIX path: bench/env/bin/python
    const posixPath = path.join(benchRoot, 'env', 'bin', 'python');
    if (fs.existsSync(posixPath)) {
      return posixPath;
    }

    // Windows path: bench/env/Scripts/python.exe
    const winPath = path.join(benchRoot, 'env', 'Scripts', 'python.exe');
    if (fs.existsSync(winPath)) {
      return winPath;
    }

    return null;
  }

  public static async configureWorkspacePython(benchContext: BenchContext): Promise<boolean> {
    if (!vscode.workspace.isTrusted) {
      return false;
    }

    const pythonPath = this.findBenchPythonInterpreter(benchContext.benchPath);
    if (!pythonPath) {
      return false;
    }

    const pythonConfig = vscode.workspace.getConfiguration('python');
    const extraPaths: string[] = [];

    // Add all discovered app directories to analysis extra paths
    for (const app of benchContext.apps.values()) {
      extraPaths.push(app.path);
    }

    // Add generated typings path
    extraPaths.push(path.join(benchContext.benchPath, '.frappe', 'typings'));

    try {
      await pythonConfig.update('defaultInterpreterPath', pythonPath, vscode.ConfigurationTarget.Workspace);
      await pythonConfig.update('analysis.extraPaths', extraPaths, vscode.ConfigurationTarget.Workspace);
      await pythonConfig.update('autoComplete.extraPaths', extraPaths, vscode.ConfigurationTarget.Workspace);
      return true;
    } catch {
      return false;
    }
  }
}
