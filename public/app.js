import { parseCSV, analyze, csvCell } from './analysis.js';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const fmt = n => n == null ? '—' : nf.format(n);
const dateLabel = d => d ? d.split('-').reverse().join('/') : '—';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
let dataset, result, source = 'hour.csv', sequence = 0;
function error(message = '') { $('error').textContent = message; $('error').hidden = !message; }
function filters() { return Object.fromEntries(['start', 'end', 'working', 'customer', 'area'].map(id => [id, $(id).value])); }
function reset() {
  $('start').value = dataset.data[0].date; $('end').value = dataset.data.at(-1).date;
  for (const id of ['start', 'end']) { $(id).min = dataset.data[0].date; $(id).max = dataset.data.at(-1).date; }
  $('working').value = ''; $('customer').value = 'count'; $('area').value = '';
  render();
}
function install(parsed, name, original = false) {
  dataset = parsed; source = name;
  $('working').disabled = !dataset.hasWorking; $('customer').disabled = !dataset.hasTypes;
  $('area').disabled = !dataset.hasArea;
  $('area').innerHTML = `<option value="">${dataset.hasArea ? 'Tất cả khu vực' : 'Chưa có dữ liệu khu vực'}</option>` + (dataset.hasArea ? [...new Set(dataset.data.map(r => r.area))].sort().map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('') : '');
  $('source-label').textContent = `${original ? 'Capital Bikeshare · Washington, D.C.' : name} · ${dateLabel(dataset.data[0].date)} – ${dateLabel(dataset.data.at(-1).date)} · ${fmt(dataset.data.length)} bản ghi theo giờ`;
  reset();
}
function chart(groups, metric, label, line = false) {
  if (!groups.length) return '<p class="empty">Không có dữ liệu trong bộ lọc này.</p>';
  const width = 610, height = 235, left = 51, right = 12, top = 12, bottom = 37;
  const plotW = width - left - right, plotH = height - top - bottom;
  const max = groups.reduce((m, g) => Math.max(m, g[metric]), 1);
  const y = n => top + plotH * (1 - n / max), step = plotW / groups.length;
  const x = i => left + (i + .5) * step;
  let content = '';
  for (let i = 0; i <= 4; i++) { const n = max * i / 4; content += `<line class="gridline" x1="${left}" x2="${width - right}" y1="${y(n)}" y2="${y(n)}"/><text x="${left - 8}" y="${y(n) + 3}" text-anchor="end">${fmt(Math.round(n))}</text>`; }
  if (line) {
    const points = groups.map((g, i) => `${x(i)},${y(g[metric])}`).join(' ');
    content += `<polygon points="${x(0)},${y(0)} ${points} ${x(groups.length - 1)},${y(0)}" fill="#edf5f0"/><polyline points="${points}" fill="none" stroke="#24815f" stroke-width="2.5"/>`;
  }
  groups.forEach((g, i) => {
    const title = `${label(g.key)}: ${fmt(g[metric])} lượt${metric === 'average' ? ' / giờ ghi nhận' : ''}; tổng ${fmt(g.total)} lượt`;
    content += line ? `<circle cx="${x(i)}" cy="${y(g[metric])}" r="${groups.length > 60 ? 2 : 3.5}" fill="#24815f"><title>${esc(title)}</title></circle>` : `<rect x="${x(i) - step * .34}" y="${y(g[metric])}" width="${step * .68}" height="${plotH * g[metric] / max}" rx="2" fill="${result.peakHour?.key === g.key ? '#d5a358' : '#43987c'}"><title>${esc(title)}</title></rect>`;
    const every = Math.max(1, Math.ceil(groups.length / 8));
    if (i % every === 0) content += `<text x="${x(i)}" y="${height - 12}" text-anchor="middle">${esc(label(g.key))}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${line ? 'Xu hướng tổng lượt thuê' : 'Trung bình lượt thuê theo giờ'}">${content}</svg>`;
}
function heatmap() {
  const max = Math.max(1, ...result.heatmap.map(g => g.average));
  const lookup = new Map(result.heatmap.map(g => [g.key, g]));
  let html = '<div class="heat-grid"><span></span>';
  for (let h = 0; h < 24; h++) html += `<span class="heat-label">${h % 3 === 0 ? `${h}h` : ''}</span>`;
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    html += `<span class="heat-label">${weekdays[d]}</span>`;
    for (let h = 0; h < 24; h++) {
      const group = lookup.get(`${d}-${h}`), strength = group ? group.average / max : null;
      const color = group ? `rgb(${Math.round(232 - 213 * strength)},${Math.round(242 - 124 * strength)},${Math.round(235 - 145 * strength)})` : '#edf0f1';
      const title = `${weekdays[d]}, ${h}:00 · ${group ? `${fmt(group.average)} lượt/giờ; ${fmt(group.total)} lượt; ${group.observations} giờ ghi nhận` : 'Không có dữ liệu'}`;
      html += `<button type="button" class="heat-cell" style="background:${color}" title="${esc(title)}" aria-label="${esc(title)}"></button>`;
    }
  }
  $('heatmap').innerHTML = html + '</div>';
}
function render() {
  if (!dataset) return;
  if (!$('start').value || !$('end').value) { error('Hãy chọn đủ ngày bắt đầu và ngày kết thúc.'); $('results').hidden = true; $('export').disabled = true; return; }
  try { result = analyze(dataset, filters()); } catch (e) { error(e.message); $('results').hidden = true; $('export').disabled = true; return; }
  error(); $('results').hidden = false; $('export').disabled = !result.rows.length;
  const { total, peakHour, peakDay, peakMonth, peakArea, averageDay } = result;
  const hourText = peakHour ? `${String(peakHour.key).padStart(2, '0')}:00` : '—';
  const cards = [
    ['Tổng lượt thuê', fmt(total), `${fmt(result.days.length)} ngày có dữ liệu trong bộ lọc`],
    ['Trung bình mỗi ngày', fmt(averageDay), 'Lượt / ngày có dữ liệu phù hợp'],
    ['Giờ có nhu cầu cao nhất', hourText, peakHour ? `${fmt(peakHour.average)} lượt / giờ ghi nhận` : 'Chưa có dữ liệu phù hợp'],
    ['Ngày có lượt thuê cao nhất', dateLabel(peakDay?.key), peakDay ? `${fmt(peakDay.total)} lượt thuê` : 'Chưa có dữ liệu phù hợp'],
  ];
  $('stats').innerHTML = cards.map(([label, value, note]) => `<article class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`).join('');
  $('insight-text').textContent = result.rows.length ? `Khung ${hourText}–${String(peakHour.key + 1).padStart(2, '0')}:00 có trung bình cao nhất: ${fmt(peakHour.average)} lượt/giờ (${fmt(peakHour.total)} lượt trong toàn khoảng lọc). Tháng ${peakMonth.key.slice(5)}/${peakMonth.key.slice(0, 4)} có tổng lượt cao nhất: ${fmt(peakMonth.total)} lượt.${peakArea ? ` Khu vực dẫn đầu: ${peakArea.key}, ${fmt(peakArea.total)} lượt.` : ' Chưa thể xếp hạng khu vực vì dữ liệu không có địa điểm.'}` : 'Không có bản ghi phù hợp. Hãy điều chỉnh khoảng ngày hoặc bộ lọc.';
  renderTrend();
  $('hour-chart').innerHTML = chart(result.hours, 'average', h => `${h}h`);
  heatmap();
  $('area-result').innerHTML = !dataset.hasArea ? '<div class="area-empty"><div class="pin">◎</div><h3>Chưa có thông tin khu vực</h3><p>Bộ dữ liệu gốc chỉ có số liệu toàn hệ thống Washington, D.C., không có trạm hoặc quận.</p><a href="#data">Nhập CSV có cột area để so sánh →</a></div>' : !result.areas.length ? '<p class="empty">Không có khu vực phù hợp.</p>' : result.areas.slice(0, 10).map((g, i) => `<div class="area-row"><div><span>${i + 1}. ${esc(g.key)}</span><b>${fmt(g.total)} lượt</b></div><progress max="${Math.max(1, peakArea.total)}" value="${g.total}"></progress><small>${fmt(g.average)} lượt/giờ · ${fmt(g.observations)} giờ ghi nhận</small></div>`).join('') + (result.areas.length > 10 ? '<p class="coverage">Hiển thị 10 khu vực đầu. Xuất báo cáo để xem tất cả.</p>' : '');
  $('top-days').innerHTML = [...result.days].sort((a, b) => b.total - a.total).slice(0, 10).map((g, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td>${dateLabel(g.key)}</td><td>${fmt(g.total)}</td><td>${fmt(total ? g.total / total * 100 : 0)}%</td><td>${g.observations} / 24</td></tr>`).join('') || '<tr><td colspan="5">Không có ngày phù hợp.</td></tr>';
  $('coverage').textContent = `${fmt(result.rows.length)} bản ghi phù hợp · ${fmt(result.observations)} mốc ngày–giờ được ghi nhận. ${filters().working === '' ? `${fmt(result.missingHours)} giờ không có bản ghi trong ${fmt(result.calendarDays)} ngày lịch từ ngày đầu đến ngày cuối có dữ liệu phù hợp.` : 'Bộ lọc loại ngày đang bật; các ngày bị loại không được đưa vào trung bình.'} ${dataset.hasArea ? 'Một mốc có thể chỉ ghi nhận một phần khu vực; xem số giờ của từng khu vực khi so sánh.' : ''}`;
}
function renderTrend() { if (result) $('trend').innerHTML = chart(result[$('grain').value], 'total', k => $('grain').value === 'months' ? `${k.slice(5)}/${k.slice(2, 4)}` : dateLabel(k).slice(0, 5), true); }
function download(filename, rows) {
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function original() {
  const ticket = ++sequence;
  try {
    const response = await fetch('/data/hour.csv'); if (!response.ok) throw new Error('Không đọc được archive/hour.csv.');
    const parsed = parseCSV(await response.text()); if (ticket !== sequence) return;
    install(parsed, 'hour.csv', true); $('upload-status').textContent = 'Đang sử dụng dữ liệu gốc hour.csv.';
  } catch (e) { if (ticket === sequence) error(e.message); }
}
$('filters').addEventListener('submit', e => e.preventDefault());
$('filters').addEventListener('change', render);
$('reset').addEventListener('click', () => dataset && reset());
$('grain').addEventListener('change', renderTrend);
$('original').addEventListener('click', original);
$('upload').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const ticket = ++sequence;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('Tệp vượt quá 20 MB.');
    const parsed = parseCSV(await file.text()); if (ticket !== sequence) return;
    install(parsed, file.name); $('upload-status').textContent = `Đã nhập ${fmt(parsed.data.length)} bản ghi từ ${file.name}.`;
  } catch (err) { if (ticket === sequence) { error(err.message); $('upload-status').textContent = 'Không nhập được tệp; bộ dữ liệu trước đó được giữ nguyên.'; } }
  e.target.value = '';
});
$('template').addEventListener('click', () => download('mau-cot-khu-vuc.csv', [['dteday', 'hr', 'cnt', 'area']]));
$('export').addEventListener('click', () => {
  if (!result?.rows.length) return;
  const f = filters();
  const rows = [['BAO CAO PHAN TICH NHU CAU THUE XE'], ['Nguon', source], ...Object.entries(f), ['Tong luot', result.total], ['So ngay co du lieu', result.days.length], ['Trung binh/ngay', result.averageDay], ['Gio cao diem (trung binh)', result.peakHour.key], ['Luu y', 'Thieu gio khong quy ve 0. Khu vuc xep theo tong luot; do phu co the khac nhau.'], [], ['Nhom', 'Moc', 'Tong luot', 'So moc ngay-gio co du lieu', 'Trung binh luot/gio']];
  for (const type of ['hours', 'days', 'months', 'weekdays', 'areas']) for (const g of result[type]) rows.push([type, g.key, g.total, g.observations, g.average]);
  download('bao-cao-nhu-cau-thue-xe.csv', rows);
});
original();
