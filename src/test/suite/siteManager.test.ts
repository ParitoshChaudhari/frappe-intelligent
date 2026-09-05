import * as assert from 'assert';
import { SiteManager } from '../../core/siteManager';
import { BenchCommands } from '../../commands/benchCommands';

describe('SiteManager & Security Test Suite', () => {
  const siteMgr = SiteManager.getInstance();

  it('should discover sites and set active site', () => {
    siteMgr.setActiveSite('test.localhost');
    assert.strictEqual(siteMgr.getActiveSite(), 'test.localhost');
  });

  it('should handle non-existent directory gracefully', () => {
    const sites = siteMgr.discoverSites('/non/existent/bench');
    assert.strictEqual(Array.isArray(sites), true);
  });

  it('should sanitize valid site names', () => {
    assert.strictEqual(BenchCommands.sanitizeSiteName('erp.mysite.com'), 'erp.mysite.com');
    assert.strictEqual(BenchCommands.sanitizeSiteName('site_1-test.local'), 'site_1-test.local');
  });

  it('should reject malicious shell injection site names', () => {
    assert.strictEqual(BenchCommands.sanitizeSiteName('site1; rm -rf /'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('site && echo 1'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('site`id`'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('site$(whoami)'), null);
  });

  it('should discover sites from an app subfolder and respect currentsite.txt', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { BenchDetector } = require('../../core/benchDetector');

    const tempBench = fs.mkdtempSync(path.join(os.tmpdir(), 'frappe_mock_bench_'));
    const sitesDir = path.join(tempBench, 'sites');
    const appDir = path.join(tempBench, 'apps', 'custom_app');
    const site1 = path.join(sitesDir, 'site1.local');
    const site2 = path.join(sitesDir, 'devsite');

    fs.mkdirSync(sitesDir, { recursive: true });
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(site1, { recursive: true });
    fs.mkdirSync(site2, { recursive: true });

    // Put hooks.py in app and currentsite.txt in sites
    fs.writeFileSync(path.join(appDir, 'hooks.py'), 'app_name = "custom_app"');
    fs.writeFileSync(path.join(sitesDir, 'currentsite.txt'), 'devsite\n');
    fs.writeFileSync(path.join(site1, 'site_config.json'), '{"db_name": "db1"}');

    // Test BenchDetector from app subfolder
    const detectedBench = BenchDetector.findBenchRoot(appDir);
    assert.strictEqual(detectedBench, tempBench);

    // Test SiteManager discovering sites from app subfolder
    const discovered = siteMgr.discoverSites(appDir);
    assert.ok(discovered.includes('site1.local'));
    assert.ok(discovered.includes('devsite'));
    assert.strictEqual(siteMgr.getActiveSite(), 'devsite');

    // Cleanup
    fs.rmSync(tempBench, { recursive: true, force: true });
  });

  it('should reject command-line flag injection site names', () => {
    assert.strictEqual(BenchCommands.sanitizeSiteName('-flag'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('--with-files'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('-o'), null);
  });
});
