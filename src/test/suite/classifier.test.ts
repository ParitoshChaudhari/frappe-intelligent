import * as assert from 'assert';
import { FileClassifier } from '../../context/fileClassifier';

describe('FileClassifier Test Suite', () => {
  it('should correctly classify Python DocType controller', () => {
    const res = FileClassifier.classify('/apps/frappe/frappe/doctype/employee/employee.py');
    assert.strictEqual(res.fileType, 'doctype_controller_py');
    assert.strictEqual(res.doctypeName, 'employee');
    assert.strictEqual(res.isServerCode, true);
    assert.strictEqual(res.isClientCode, false);
  });

  it('should correctly classify JavaScript DocType Form script', () => {
    const res = FileClassifier.classify('/apps/frappe/frappe/doctype/employee/employee.js');
    assert.strictEqual(res.fileType, 'doctype_form_js');
    assert.strictEqual(res.doctypeName, 'employee');
    assert.strictEqual(res.isServerCode, false);
    assert.strictEqual(res.isClientCode, true);
  });

  it('should correctly classify DocType schema JSON', () => {
    const res = FileClassifier.classify('/apps/frappe/frappe/doctype/employee/employee.json');
    assert.strictEqual(res.fileType, 'doctype_schema_json');
    assert.strictEqual(res.doctypeName, 'employee');
  });

  it('should correctly classify hooks.py', () => {
    const res = FileClassifier.classify('/apps/my_custom_app/my_custom_app/hooks.py');
    assert.strictEqual(res.fileType, 'hooks_py');
    assert.strictEqual(res.isServerCode, true);
  });

  it('should correctly classify API module', () => {
    const res = FileClassifier.classify('/apps/erpnext/erpnext/api.py');
    assert.strictEqual(res.fileType, 'api_module_py');
    assert.strictEqual(res.isServerCode, true);
  });

  it('should correctly classify test files', () => {
    const res = FileClassifier.classify('/apps/frappe/frappe/doctype/employee/test_employee.py');
    assert.strictEqual(res.fileType, 'test_py');
    assert.strictEqual(res.isServerCode, true);
  });
});
