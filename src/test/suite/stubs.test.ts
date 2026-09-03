import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { PyStubGenerator } from '../../stubs/pyStubGenerator';
import { JsStubGenerator } from '../../stubs/jsStubGenerator';
import { DocTypeSchema } from '../../core/types';

describe('Stub Generators Test Suite', () => {
  const dummySchema: DocTypeSchema = {
    name: 'Employee',
    fields: [
      { fieldname: 'first_name', label: 'First Name', fieldtype: 'Data', reqd: 1 },
      { fieldname: 'salary', label: 'Salary', fieldtype: 'Currency' },
      { fieldname: 'is_active', label: 'Is Active', fieldtype: 'Check' },
      { fieldname: 'skills', label: 'Skills Table', fieldtype: 'Table' },
    ],
  };

  it('should generate valid Python .pyi stubs', () => {
    const stub = PyStubGenerator.generateDocTypeStub(dummySchema);
    assert.ok(stub.includes('class Employee(Document):'));
    assert.ok(stub.includes('first_name: str'));
    assert.ok(stub.includes('salary: float'));
    assert.ok(stub.includes('is_active: int'));
    assert.ok(stub.includes('skills: list[Any]'));
  });

  it('should generate valid ambient JavaScript .d.ts declarations', () => {
    const ambient = JsStubGenerator.generateAmbientDeclarations([dummySchema]);
    assert.ok(ambient.includes('declare namespace frappe'));
    assert.ok(ambient.includes('interface FrappeForm'));
    assert.ok(ambient.includes('declare const frm: FrappeForm;'));
    assert.ok(ambient.includes('declare const cur_frm: FrappeForm;'));
    assert.ok(ambient.includes('declare function __(str: string, replace?: any[]): string;'));
  });

  it('should prevent path traversal when writing workspace stubs with malicious DocType name', () => {
    const maliciousSchema: DocTypeSchema = {
      name: '../../etc/passwd',
      fields: [],
    };
    // Testing writeWorkspaceStubs with a mock temp workspace
    const tempDir = path.join(__dirname, 'temp_stubs_test');
    try {
      PyStubGenerator.writeWorkspaceStubs(tempDir, [maliciousSchema]);
      const targetDir = path.join(tempDir, '.frappe', 'typings');
      assert.ok(fs.existsSync(targetDir));
      assert.ok(fs.existsSync(path.join(targetDir, 'passwd.pyi')));
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
