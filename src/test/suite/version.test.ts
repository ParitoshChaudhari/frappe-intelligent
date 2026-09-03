import * as assert from 'assert';
import { VersionDetector } from '../../core/versionDetector';
import { ScopeAnalyzer } from '../../context/scopeAnalyzer';
import { FileClassificationResult } from '../../core/types';

describe('VersionDetector Test Suite', () => {
  it('should parse v13 version string', () => {
    assert.strictEqual(VersionDetector.parseVersionString('13.12.0'), 'v13');
  });

  it('should parse v14 version string', () => {
    assert.strictEqual(VersionDetector.parseVersionString('14.2.1'), 'v14');
  });

  it('should parse v15 version string', () => {
    assert.strictEqual(VersionDetector.parseVersionString('15.10.0-beta.1'), 'v15');
  });

  it('should parse v16 version string', () => {
    assert.strictEqual(VersionDetector.parseVersionString('16.0.0.dev0'), 'v16');
  });
});

describe('ScopeAnalyzer Test Suite', () => {
  const dummyPyFile: FileClassificationResult = {
    fileType: 'doctype_controller_py',
    doctypeName: 'Employee',
    isServerCode: true,
    isClientCode: false,
  };

  const dummyJsFile: FileClassificationResult = {
    fileType: 'doctype_form_js',
    doctypeName: 'Employee',
    isServerCode: false,
    isClientCode: true,
  };

  it('should detect frappe.db. target', () => {
    const line = 'frappe.db.';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyPyFile);
    assert.strictEqual(scope.targetObject, 'frappe.db');
  });

  it('should detect frm. target in JavaScript', () => {
    const line = 'frm.';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyJsFile);
    assert.strictEqual(scope.targetObject, 'frm');
    assert.strictEqual(scope.currentDocType, 'Employee');
  });

  it('should detect doc. target in Python controller', () => {
    const line = 'doc.';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyPyFile);
    assert.strictEqual(scope.targetObject, 'doc');
    assert.strictEqual(scope.currentDocType, 'Employee');
  });

  it('should detect frappe.call object literal call context', () => {
    const line = 'frappe.call({';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyJsFile);
    assert.strictEqual(scope.callContext?.callee, 'frappe.call');
    assert.strictEqual(scope.callContext?.isObjectLiteral, true);
  });

  it('should detect function parameter argument index', () => {
    const line = 'frappe.db.get_value("Employee", "EMP-001", ';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyPyFile);
    assert.strictEqual(scope.callContext?.callee, 'frappe.db.get_value');
    assert.strictEqual(scope.callContext?.argIndex, 2);
  });

  it('should correctly count argument index when strings or structures contain commas', () => {
    const line = 'frappe.db.get_value("Employee, with, commas", {"nested, key": "value, with, comma"}, ';
    const scope = ScopeAnalyzer.analyze(line, line.length, dummyPyFile);
    assert.strictEqual(scope.callContext?.callee, 'frappe.db.get_value');
    assert.strictEqual(scope.callContext?.argIndex, 2);
  });
});
