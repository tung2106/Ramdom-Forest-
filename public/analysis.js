// Pure data functions shared by the browser and Node tests.
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (!quoted && value !== '') throw new Error('CSV có dấu ngoặc kép không hợp lệ.');
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value); if (row.some(v => v.trim())) rows.push(row); row = []; value = '';
    } else value += c;
  }
  if (quoted) throw new Error('CSV chưa đóng dấu ngoặc kép.');
  row.push(value); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV cần có tiêu đề và ít nhất một dòng dữ liệu.');
  const headers = rows.shift().map(v => v.trim());
  if (new Set(headers).size !== headers.length) throw new Error('Tên cột bị trùng.');
  for (const col of ['dteday', 'hr', 'cnt']) if (!headers.includes(col)) throw new Error(`Thiếu cột ${col}. Hãy nhập dữ liệu theo giờ, không dùng day.csv.`);
  const hasArea = headers.includes('area');
  if (headers.includes('casual') !== headers.includes('registered')) throw new Error('Cần cung cấp cả casual và registered, hoặc bỏ cả hai cột.');
  const hasTypes = headers.includes('casual') && headers.includes('registered');
  const hasWorking = headers.includes('workingday');
  const seen = new Set();
  const data = rows.map((values, index) => {
    const fail = message => { throw new Error(`Dòng ${index + 2}: ${message}`); };
    if (values.length !== headers.length) fail('số cột không khớp tiêu đề.');
    const raw = Object.fromEntries(headers.map((key, i) => [key, values[i].trim()]));
    const date = new Date(`${raw.dteday}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.dteday) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== raw.dteday) fail('ngày phải hợp lệ, dạng YYYY-MM-DD.');
    const integer = (key, max = Number.MAX_SAFE_INTEGER) => {
      const n = Number(raw[key]);
      if (!/^\d+$/.test(raw[key] || '') || !Number.isSafeInteger(n) || n > max) fail(`${key} phải là số nguyên từ 0 đến ${max}.`);
      return n;
    };
    const item = { date: raw.dteday, hour: integer('hr', 23), count: integer('cnt'), weekday: date.getUTCDay(), area: hasArea ? raw.area : null };
    if (hasArea && !item.area) fail('area không được bỏ trống.');
    if (hasTypes) {
      item.casual = integer('casual'); item.registered = integer('registered');
      if (item.casual + item.registered !== item.count) fail('cnt phải bằng casual + registered.');
    }
    if (hasWorking) item.working = integer('workingday', 1);
    const key = JSON.stringify([item.date, item.hour, item.area]);
    if (seen.has(key)) fail('trùng tổ hợp ngày, giờ và khu vực. Hãy gộp các trạm trong cùng khu vực trước khi nhập.');
    seen.add(key);
    return item;
  });
  data.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
  if (!Number.isSafeInteger(data.reduce((s, r) => s + r.count, 0))) throw new Error('Tổng lượt thuê vượt giới hạn số nguyên an toàn.');
  return { data, hasArea, hasTypes, hasWorking };
}

export function analyze(dataset, filters = {}) {
  const { start = '', end = '9999', area = '', working = '', customer = 'count' } = filters;
  if (start > end) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  const rows = dataset.data.filter(r => r.date >= start && r.date <= end && (!area || r.area === area) && (working === '' || r.working === Number(working)));
  const value = r => r[customer] ?? r.count;
  const group = key => {
    const buckets = new Map();
    for (const row of rows) {
      const k = key(row);
      if (!buckets.has(k)) buckets.set(k, { key: k, total: 0, slots: new Set() });
      const b = buckets.get(k); b.total += value(row); b.slots.add(`${row.date}T${row.hour}`);
    }
    return [...buckets.values()].map(b => ({ key: b.key, total: b.total, observations: b.slots.size, average: b.total / b.slots.size })).sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }));
  };
  const hours = group(r => r.hour), days = group(r => r.date), months = group(r => r.date.slice(0, 7));
  const areas = dataset.hasArea ? group(r => r.area).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key)) : [];
  const peak = (groups, metric = 'total') => [...groups].sort((a, b) => b[metric] - a[metric])[0] || null;
  const slots = new Set(rows.map(r => `${r.date}T${r.hour}`));
  const total = rows.reduce((s, r) => s + value(r), 0);
  // Missing observations remain missing, never automatically become zero.
  const first = rows[0]?.date, last = rows.at(-1)?.date;
  const calendarDays = first ? Math.round((Date.parse(last) - Date.parse(first)) / 86400000) + 1 : 0;
  return { rows, total, hours, days, months, areas, weekdays: group(r => r.weekday), heatmap: group(r => `${r.weekday}-${r.hour}`), peakHour: peak(hours, 'average'), peakDay: peak(days), peakMonth: peak(months), peakArea: areas[0] || null, averageDay: days.length ? total / days.length : null, observations: slots.size, missingHours: calendarDays * 24 - slots.size, calendarDays };
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
