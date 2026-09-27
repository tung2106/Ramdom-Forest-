import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('app renders original data, filters, empty state, import, reset and export', async () => {
  // DOM contract smoke test; does not replace visual browser inspection.
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    value: id === 'grain' ? 'months' : '', innerHTML: '', textContent: '', hidden: false,
    handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; },
  }]));
  let downloaded;
  globalThis.document = { getElementById: id => { assert.ok(elements.has(id), id); return elements.get(id); }, createElement: () => ({ click() { downloaded = this.download; } }) };
  globalThis.fetch = async () => ({ ok: true, text: async () => readFileSync(new URL('../archive/hour.csv', import.meta.url), 'utf8') });
  await import('../public/app.js');
  await new Promise(resolve => setImmediate(resolve));
  const el = id => elements.get(id);
  assert.match(el('stats').innerHTML, /3\.292\.679/);
  assert.match(el('trend').innerHTML, /<svg/);
  assert.match(el('area-result').innerHTML, /Chưa có thông tin khu vực/);
  el('end').value = '2011-01-01'; el('filters').handlers.change();
  assert.match(el('stats').innerHTML, />985</);
  el('working').value = '1'; el('filters').handlers.change();
  assert.match(el('insight-text').textContent, /Không có bản ghi/);
  assert.equal(el('export').disabled, true);
  el('start').value = ''; el('filters').handlers.change();
  assert.equal(el('results').hidden, true);
  el('reset').handlers.click();
  assert.equal(el('results').hidden, false);
  await el('upload').handlers.change({ target: { files: [{ name: 'areas.csv', size: 100, text: async () => 'dteday,hr,cnt,area\n2024-01-01,8,10,A\n2024-01-01,8,20,B' }], value: '' } });
  assert.match(el('area-result').innerHTML, /1\. B/);
  assert.equal(el('area').disabled, false);
  el('area').value = 'A'; el('filters').handlers.change();
  assert.match(el('insight-text').textContent, /A, 10 lượt/);
  el('export').handlers.click();
  assert.equal(downloaded, 'bao-cao-nhu-cau-thue-xe.csv');
  await el('original').handlers.click();
  assert.match(el('stats').innerHTML, /3\.292\.679/);
  delete globalThis.document; delete globalThis.fetch;
});
