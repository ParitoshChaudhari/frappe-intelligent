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

  it('should reject command-line flag injection site names', () => {
    assert.strictEqual(BenchCommands.sanitizeSiteName('-flag'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('--with-files'), null);
    assert.strictEqual(BenchCommands.sanitizeSiteName('-o'), null);
  });
});
