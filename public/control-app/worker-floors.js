import { esc } from './ui.js';

export const floorOptions = {
  chargerType: {slow:'완속 충전기',fast:'급속 충전기'},
  housing: {standalone:'단독형',canopy:'캐노피형',enclosure:'함체형',box:'박스형',other:'기타'},
  canopy: {included:'캐노피 청소 포함',excluded:'캐노피 청소 미포함'},
  scope: {exterior:'외부 청소',interior:'내부 청소',both:'외부·내부 청소'},
};

export function floorDescription(floor) {
  return [floorOptions.chargerType[floor.chargerType],floorOptions.housing[floor.housing],
    floorOptions.canopy[floor.canopy],floorOptions.scope[floor.scope],floor.repair?'수리 포함':''].filter(Boolean).join(' · ');
}

export function floorRows(floors=[], progress, currentZone) {
  if (!floors.length) return '';
  return `<ul class="stack worker-floors">${floors.map(floor=>{
    const count=progress?.find(row=>row.zoneId===floor.id)?.completed || 0;
    return `<li class="report-control-row"><div class="row between"><strong>${esc(floor.name)}</strong>
      <span>${progress ? (count>=floor.units?'완료 · ':'저장 ') + count + ' / ' : ''}${floor.units}기</span></div>
      <p class="small muted">${esc(floorDescription(floor))}</p>
      ${floor.id===currentZone?'<p class="small">현재 작업 구역</p>':''}</li>`;
  }).join('')}</ul>`;
}

export function adminFloorFields() {
  const captions={chargerType:'충전기 유형',housing:'설치 형태',canopy:'캐노피 청소 범위',scope:'배정 작업 범위'};
  return Object.entries(floorOptions).map(([key, options])=>`<label class="field"><span>${captions[key]}</span>
    <select name="${key}" required><option value="">선택</option>${Object.entries(options).map(([value,label])=>
      `<option value="${value}">${label}</option>`).join('')}</select></label>`).join('');
}
