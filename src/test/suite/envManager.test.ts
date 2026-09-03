import * as assert from 'assert';
import * as path from 'path';
import { PythonEnvManager } from '../../core/pythonEnvManager';

describe('PythonEnvManager Test Suite', () => {
  it('should return null when virtualenv is not present in mock dir', () => {
    const interpreter = PythonEnvManager.findBenchPythonInterpreter('/non/existent/bench/path');
    assert.strictEqual(interpreter, null);
  });
});
