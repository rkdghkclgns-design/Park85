import { esc } from './ui.js';

const officialStats = 'https://www.ev.or.kr/nportal/stats/statsDashboard.do#chargeInfraStatus';
const sourceLink = `<a href="${officialStats}" target="_blank" rel="noopener noreferrer">무공해차 통합누리집</a>`;
const formatNumber = value => value.toLocaleString('ko-KR');
const formatPrice = value => value == null ? '미입력' : formatNumber(value) + '원 / 기';
const priceLabels = { contract: '실제 계약단가', worker: '작업자 청소단가' };

function regionTable(regions, editable, role) {
  const kinds = editable ? ['contract', 'worker'] : role === 'cleaner' ? ['worker'] : [];
  return `<div class="table-scroll"><table class="region-table">
    <thead><tr><th scope="col">구역</th><th scope="col">등록 충전기</th>${kinds.map(kind => `<th scope="col">${priceLabels[kind]}<br><span class="small muted">원 / 기</span></th>`).join('')}</tr></thead>
    <tbody>${regions.map(region => {
      const name = esc(region.name);
      const prices = kinds.map(kind => {
        const price = region[kind + 'Price'];
        const label = priceLabels[kind];
        return editable ? `<td><form class="region-price-form" data-region-price="${name}" data-price-kind="${kind}">
          <input type="number" name="price" min="0" step="1" inputmode="numeric" aria-label="${name} ${label} (원)" placeholder="미입력" value="${price ?? ''}">
          <button class="btn compact" type="submit" aria-label="${name} ${label} 저장">저장</button>
          <span class="small muted" data-price-message role="status"></span>
        </form></td>` : `<td>${formatPrice(price)}</td>`;
      }).join('');
      return `<tr><th scope="row">${name}</th><td data-region-count="${name}">${formatNumber(region.count)}기</td>${prices}</tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

async function readOfficialWorkbook(file) {
  if (!file || !/\.xlsx$/i.test(file.name) || file.size > 2_000_000) {
    throw new Error('누리집에서 내려받은 2MB 이하의 XLSX 파일을 선택해 주세요.');
  }
  const xlsx = globalThis.XLSX;
  if (!xlsx) throw new Error('엑셀을 읽을 수 없습니다. 새로고침한 뒤 다시 시도해 주세요.');
  const book = xlsx.read(await file.arrayBuffer(), { sheetRows: 100 });
  const sheet = book.Sheets[book.SheetNames[0]];
  const [header, ...data] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: false });
  const columns = header?.map(value => String(value).trim().replace(/\s+/g, '').toLowerCase()) ?? [];
  const labels = ['지역', '완속(30kw미만)', '중속(30~49kw)', '급속(50~99kw)', '급속(100~199kw)', '초급속(200kw이상)', '기타', '합계'];
  const indices = labels.map(label => columns.indexOf(label));
  if (indices.some(index => index < 0)) {
    throw new Error('누리집의 ‘우리 지역 급속 충전 여건’ 엑셀인지 확인해 주세요.');
  }
  return data.map(row => {
    const [name, ...numbers] = indices.map(index => row[index]);
    const count = numbers.pop();
    if (typeof name !== 'string' || !name.trim()
      || ![count, ...numbers].every(value => Number.isSafeInteger(value) && value >= 0)
      || numbers.reduce((total, value) => total + value, 0) !== count) {
      throw new Error('구역별 수량과 합계가 일치하는지 확인해 주세요.');
    }
    return { name: name.trim(), count };
  });
}

export function mountRegions(root, account, api, signal) {
  const editable = ['owner', 'admin'].includes(account.role);
  root.innerHTML = `<section class="card ops-upload stack">
    <div class="row between"><h2>구역별 등록 충전기</h2><strong data-region-total></strong></div>
    <p class="small muted">${sourceLink} · <span data-region-date>집계 기준일을 불러오는 중입니다.</span></p>
    <div data-region-table role="region" aria-label="구역별 충전기 수량 및 청소단가"></div>
  </section>
  ${editable ? `<details class="card ops-upload"><summary><strong>공식 집계 갱신</strong></summary>
    <div class="stack region-refresh">
      <p class="small muted">${sourceLink}의 ‘우리 지역 급속 충전 여건’에서 엑셀을 내려받고, 표에 표시된 집계 기준일을 입력해 주세요.</p>
      <form class="row" data-region-refresh>
        <label class="field"><span>집계 기준일</span><input type="date" name="sourceDate" required></label>
        <label class="field"><span>공식 집계 엑셀</span><input type="file" name="workbook" accept=".xlsx" required></label>
        <button class="btn" type="submit">수량 갱신</button>
      </form>
      <p class="small" data-region-message role="status"></p>
    </div>
  </details>` : ''}`;
  const rates = new Map();
  const table = root.querySelector('[data-region-table]');
  table.textContent = '구역별 수량을 불러오는 중입니다.';

  function showCounts(regions, sourceDate) {
    const sum = regions.reduce((total, region) => total + region.count, 0);
    root.querySelector('[data-region-total]').textContent = '전국 ' + formatNumber(sum) + '기';
    root.querySelector('[data-region-date]').textContent = sourceDate + ' 기준 · 전체 충전기';
    const counts = new Map(regions.map(region => [region.name, region.count]));
    for (const cell of table.querySelectorAll('[data-region-count]')) {
      cell.textContent = formatNumber(counts.get(cell.dataset.regionCount)) + '기';
    }
  }

  api('charger-regions', { signal }).then(({ regions, sourceDate }) => {
    if (signal.aborted) return;
    for (const region of regions) rates.set(region.name, region);
    table.innerHTML = regionTable(regions, editable, account.role);
    showCounts(regions, sourceDate);
  }).catch(error => {
    if (!signal.aborted) table.textContent = error.message;
  });

  table.addEventListener('submit', async event => {
    const form = event.target;
    const region = form.dataset.regionPrice;
    const kind = form.dataset.priceKind;
    if (!region) return;
    event.preventDefault();
    const input = form.elements.price;
    const button = form.querySelector('button');
    const notice = form.querySelector('[data-price-message]');
    if (button.disabled) return;
    const price = input.value === '' ? null : input.valueAsNumber;
    if (price !== null && (!Number.isSafeInteger(price) || price < 0)) {
      notice.textContent = '0원 이상의 정수를 입력해 주세요.';
      return;
    }
    input.disabled = button.disabled = true;
    try {
      const key = kind + 'Price';
      await api('charger-regions/price', { method: 'PATCH', body: { region, kind, price, previousPrice: rates.get(region)[key] } });
      rates.get(region)[key] = price;
      notice.classList.remove('error');
      notice.textContent = '저장됨';
    } catch (error) {
      notice.classList.add('error');
      notice.textContent = error.message;
    } finally {
      input.disabled = button.disabled = false;
    }
  }, { signal });

  const refresh = root.querySelector('[data-region-refresh]');
  refresh?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = refresh.querySelector('button');
    const notice = root.querySelector('[data-region-message]');
    if (button.disabled) return;
    const data = new FormData(refresh);
    button.disabled = true;
    try {
      const sourceDate = data.get('sourceDate');
      const regions = await readOfficialWorkbook(data.get('workbook'));
      await api('charger-regions/counts', { method: 'PUT', body: { sourceDate, regions } });
      const updated = await api('charger-regions', { signal });
      if (signal.aborted) return;
      showCounts(updated.regions, updated.sourceDate);
      refresh.reset();
      notice.classList.remove('error');
      notice.textContent = '공식 등록 충전기 수량을 갱신했습니다.';
    } catch (error) {
      if (signal.aborted) return;
      notice.classList.add('error');
      notice.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }, { signal });
}

export function mountRegionPreview(root, api, signal) {
  root.innerHTML = `<div class="row between"><h2>구역별 등록 충전기</h2><a class="btn compact" href="#regions">구역별 현황 보기</a></div>
    <div class="row"><label class="field"><span>구역 선택</span><select data-region-select disabled><option value="">전국</option></select></label>
    <p class="small muted" data-region-summary>등록 충전기 수량을 불러오는 중입니다.</p></div>`;
  const select = root.querySelector('[data-region-select]');
  const summary = root.querySelector('[data-region-summary]');
  api('charger-regions', { signal }).then(({ regions, sourceDate }) => {
    if (signal.aborted) return;
    for (const region of regions) select.append(new Option(region.name, region.name));
    select.disabled = false;
    const total = regions.reduce((sum, region) => sum + region.count, 0);
    const show = () => {
      const region = regions.find(item => item.name === select.value);
      const items = [`${formatNumber(region?.count ?? total)}기`, `${sourceDate} 기준`];
      if (region) for (const [kind, label] of Object.entries(priceLabels)) {
        const key = kind + 'Price';
        if (Object.hasOwn(region, key)) items.push(`${label} ${formatPrice(region[key])}`);
      }
      summary.textContent = items.join(' · ');
    };
    select.addEventListener('change', show, { signal });
    show();
  }).catch(error => {
    if (!signal.aborted) summary.textContent = error.message;
  });
}
