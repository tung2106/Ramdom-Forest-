import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCSV, analyze, csvCell } from '../public/analysis.js';

const dataset = parseCSV(readFileSync(new URL('../archive/hour.csv', import.meta.url), 'utf8'));
test('original data reconciles with daily totals for every date', () => {
  const report = analyze(dataset);
  assert.equal(dataset.data.length, 17379);
  assert.equal(report.days.length, 731);
  assert.equal(report.total, 3292679);
  assert.equal(report.missingHours, 165);
  const daily = readFileSync(new URL('../archive/day.csv', import.meta.url), 'utf8').trim().split(/\r?\n/);
  const headers = daily.shift().split(',');
  const expected = new Map(daily.map(line => { const r = line.split(','); return [r[headers.indexOf('dteday')], +r[headers.indexOf('cnt')]]; }));
  for (const day of report.days) assert.equal(day.total, expected.get(day.key), day.key);
  assert.equal(report.peakHour.key, 17);
  assert.equal(report.peakDay.key, '2012-09-15');
});
test('inclusive date filters, customer partitions and empty range', () => {
  const f = { start: '2011-01-01', end: '2011-01-01' };
  assert.equal(analyze(dataset, f).total, 985);
  assert.equal(analyze(dataset, { ...f, customer: 'casual' }).total, 331);
  assert.equal(analyze(dataset, { ...f, customer: 'registered' }).total, 654);
  assert.equal(analyze(dataset, { ...f, working: '1' }).rows.length, 0);
  assert.equal(analyze(dataset, { start: '2030-01-01' }).peakHour, null);
  assert.throws(() => analyze(dataset, { start: '2012-01-01', end: '2011-01-01' }));
});
test('areas aggregate per observed time slot; missing hours are not zero', () => {
  const custom = parseCSV('dteday,hr,cnt,area\n2024-01-01,8,10,A\n2024-01-01,8,20,B\n2024-01-02,8,50,A\n2024-01-01,9,42,A');
  const r = analyze(custom);
  assert.equal(r.total, 122); assert.equal(r.peakHour.key, 9);
  assert.equal(r.hours[0].average, 40); assert.equal(r.peakArea.key, 'A');
  assert.equal(analyze(custom, { area: 'B' }).total, 20);
  assert.equal(r.averageDay, 61);
});
test('CSV rejects invalid, duplicate and inconsistent rows', () => {
  for (const line of ['2024-02-30,1,2', '2024-01-01,24,2', '2024-01-01,1,-1', '2024-01-01,1,', '2024-01-01,1,2.5']) assert.throws(() => parseCSV('dteday,hr,cnt\n' + line));
  assert.throws(() => parseCSV('dteday,hr,cnt\n2024-01-01,1,2\n2024-01-01,1,3'));
  assert.throws(() => parseCSV('dteday,hr,cnt,casual,registered\n2024-01-01,1,4,2,3'));
  assert.throws(() => parseCSV('dteday,cnt\n2024-01-01,1'));
});
test('quoted CSV, BOM, zero counts and safe export', () => {
  const d = parseCSV('\uFEFFdteday,hr,cnt,area\r\n2024-01-01,0,0,"A, B"\r\n');
  assert.equal(d.data[0].area, 'A, B'); assert.equal(analyze(d).peakHour.average, 0);
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
});
