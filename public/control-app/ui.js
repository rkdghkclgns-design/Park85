export const company = {
  name: '그린숲어린이집test',
  location: 'test',
  term: '12개월',
  lead: '김민수 팀장',
  customer: '이서연 대리',
  phone: '010-0000-0000',
};

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
export const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return date.year + '-' + date.month + '-' + date.day;
};

export const monthName = month => Number(month.slice(0, 4)) + '년 ' + Number(month.slice(5)) + '월';
const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' });
export const dayName = date => weekday.format(new Date(date + 'T00:00:00Z'));
export const reportDate = date => Number(date.slice(5, 7)) + '월 ' + Number(date.slice(8)) + '일(' + dayName(date) + ')';

export const states = { draft: ['작성중', ''], submitted: ['확인 대기', 'warn'], confirmed: ['확인 완료', 'good'], revision: ['보완 요청', 'bad'] };
export function badge(status) {
  const [label, color] = states[status] ?? states.draft;
  return `<span class="pill ${color}">${label}</span>`;
}

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  days: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  month: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
  alerts: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  map: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  regions: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  control: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8m-4-4v4M6 13l3-3 3 2 4-5 2 2"/>',
  analytics: '<path d="M4 3v17h17M8 16v-4m4 4V9m4 7V6m4 10v-5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5a3 3 0 0 1 0 6m1 3a4 4 0 0 1 4 4v2"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  enter: '<path d="M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4"/>',
};

export const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
export const brand = (title, subtitle) => `<div class="brand"><span class="logo" aria-hidden="true">본</span><div class="brand-text"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div></div>`;
export const empty = message => `<div class="card empty">${message}</div>`;

export function section(number, title, body, id = '') {
  return `<section class="card"${id ? ` id="${id}"` : ''}><h2 class="section-title"><span class="section-no">${number}</span>${title}</h2><div class="card-inner stack">${body}</div></section>`;
}

export function input(label, path, value, options = {}) {
  const { type = 'text', disabled = false, placeholder = '', className = '', min, max } = options;
  const bounds = (min === undefined ? '' : ` min="${min}"`) + (max === undefined ? '' : ` max="${max}"`);
  return `<label class="field ${className}"><span>${label}</span><input type="${type}" data-bind="${path}" value="${esc(value)}"${disabled ? ' disabled' : ''}${placeholder ? ` placeholder="${placeholder}"` : ''}${bounds}></label>`;
}

export const area = (label, path, value, className = '') =>
  `<label class="field ${className}"><span>${label}</span><textarea data-bind="${path}">${esc(value)}</textarea></label>`;

export function select(label, path, value, values) {
  return `<label class="field"><span>${label}</span><select data-bind="${path}">${values.map(item => `<option${item === value ? ' selected' : ''}>${esc(item)}</option>`).join('')}</select></label>`;
}

export const facts = rows => `<dl class="facts">${rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${esc(value || '-')}</dd></div>`).join('')}</dl>`;
export function table(headers, rows, emptyMessage) {
  const body = rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td class="table-empty" colspan="${headers.length}">${emptyMessage}</td></tr>`}</tbody></table></div>`;
}

export const blankPair = () => ({ before: '', after: '', zone: '', caption: '' });
export const completePairs = photos => photos.filter(pair => pair.before && pair.after);
export function photoPair(pair, index, editable = false) {
  const number = index + 1;
  const tiles = [['before', '작업 전'], ['after', '작업 후']].map(([side, label]) => {
    const hasPhoto = pair[side]?.startsWith('data:image/jpeg;base64,');
    if (hasPhoto) {
      return `<div class="photo"><img src="${esc(pair[side])}" alt="사진 ${number} ${label}">${editable ? `<button type="button" class="btn compact remove-photo" data-action="remove-photo" data-index="${index}" data-side="${side}" aria-label="사진 ${number} ${label} 삭제">×</button>` : ''}</div>`;
    }
    if (!editable) return '<div></div>';
    return `<div class="photo"><label><strong>＋ ${label}</strong><span class="small muted">사진 올리기</span><input type="file" accept="image/*" aria-label="사진 ${number} ${label}" data-photo="${index}" data-side="${side}"></label></div>`;
  }).join('');
  return `<article class="pair stack">
    <div class="row between"><strong>사진 ${number}</strong><span class="pill${pair.before && pair.after ? ' good' : ''}">${pair.before && pair.after ? '등록 완료' : '비어 있음'}</span></div>
    <div class="picture-grid">${tiles}</div>
    ${editable ? `<div class="fields">${input('구역', `photos.${index}.zone`, pair.zone, { placeholder: '구역 이름' })}${input('설명', `photos.${index}.caption`, pair.caption, { placeholder: '사진 설명' })}</div>` : `<p class="photo-caption">${esc([pair.zone, pair.caption].filter(Boolean).join(' · '))}</p>`}
  </article>`;
}

export function duration(report) {
  if (!report.start || !report.end) return 0;
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return (minutes(report.end) - minutes(report.start) + 1440) % 1440;
}

export const timeText = value => `${Math.floor(value / 60)}시간 ${String(value % 60).padStart(2, '0')}분`;
export const listReports = (workspace, month) => Object.values(workspace.reports)
  .filter(report => report.date.startsWith(month)).sort((left, right) => right.date.localeCompare(left.date));

export function stats(workspace, month) {
  const reports = listReports(workspace, month).filter(report => report.status !== 'draft');
  const contract = workspace.months[month]?.contract ?? 20;
  const total = reports.reduce((sum, report) => sum + duration(report), 0);
  const people = reports.reduce((sum, report) => sum + Number(report.people || 0), 0);
  const average = reports.length ? Math.round(total / reports.length) : 0;
  const rate = contract ? Math.round(reports.length / contract * 100) : 0;
  return { reports, contract, total, people, average, rate };
}

export function metric(label, value, suffix = '', long = false) {
  return `<div class="card metric${long ? ' long' : ''}"><dt>${label}</dt><dd><strong>${value}</strong>${suffix ? `<span>${suffix}</span>` : ''}</dd></div>`;
}
