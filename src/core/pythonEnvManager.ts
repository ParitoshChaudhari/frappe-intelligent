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

    // POSIX path: bench/.venv/bin/python
    const venvPosixPath = path.join(benchRoot, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPosixPath)) {
      return venvPosixPath;
    }

    // Windows path: bench/env/Scripts/python.exe
    const winPath = path.join(benchRoot, 'env', 'Scripts', 'python.exe');
    if (fs.existsSync(winPath)) {
      return winPath;
    }

    // Windows path: bench/.venv/Scripts/python.exe
    const venvWinPath = path.join(benchRoot, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvWinPath)) {
      return venvWinPath;
    }

    return null;
  }

  public static async configureWorkspacePython(benchContext: BenchContext): Promise<boolean> {
    if (!benchContext || !benchContext.benchPath) return false;
    if (!vscode.workspace.isTrusted) {
      return false;
    }

    const pythonPath = this.findBenchPythonInterpreter(benchContext.benchPath);
    if (!pythonPath) {
      return false;
    }

    const pythonConfig = vscode.workspace.getConfiguration('python');
    const existingAnalysisPaths = pythonConfig.get<string[]>('analysis.extraPaths') || [];
    const existingAutoCompletePaths = pythonConfig.get<string[]>('autoComplete.extraPaths') || [];
    const analysisPathsSet = new Set(existingAnalysisPaths);
    const autoCompletePathsSet = new Set(existingAutoCompletePaths);

    // Add all discovered app directories to analysis extra paths
    for (const app of benchContext.apps.values()) {
      analysisPathsSet.add(app.path);
      autoCompletePathsSet.add(app.path);
    }

    // Add generated typings path
    const typingsPath = path.join(benchContext.benchPath, '.frappe', 'typings');
    analysisPathsSet.add(typingsPath);
    autoCompletePathsSet.add(typingsPath);

    const newAnalysisPaths = Array.from(analysisPathsSet);
    const newAutoCompletePaths = Array.from(autoCompletePathsSet);

    try {
      await pythonConfig.update('defaultInterpreterPath', pythonPath, vscode.ConfigurationTarget.Workspace);
      await pythonConfig.update('analysis.extraPaths', newAnalysisPaths, vscode.ConfigurationTarget.Workspace);
      await pythonConfig.update('autoComplete.extraPaths', newAutoCompletePaths, vscode.ConfigurationTarget.Workspace);
      return true;
    } catch {
      return false;
    }
  }
}
