const surroundingsResultLabels = { done: '완료', pending: '미완료', not_needed: '대상 아님', unknown: '미입력' };
const faultResultLabels = { normal: '이상 없음', issue: '이상 발견', not_checked: '미점검', unknown: '미입력' };

export function normalizeWorkResults(values) {
  const result = {};
  for (const key of ['exteriorResultNote', 'interiorResultNote', 'surroundingsNote', 'faultNote']) {
    const value = values[key] ?? '';
    if (typeof value !== 'string' || value.length > 500) return null;
    result[key] = value.trim();
  }
  const surroundings = values.surroundingsStatus ?? 'unknown';
  const fault = values.faultStatus ?? 'unknown';
  if (!Object.hasOwn(surroundingsResultLabels, surroundings) || !Object.hasOwn(faultResultLabels, fault)
    || (fault === 'issue' && !result.faultNote)) return null;
  return { ...result, surroundingsStatus: surroundings, faultStatus: fault };
}

export function displayWorkResults(row) {
  const values = normalizeWorkResults(JSON.parse(row.result_detail || '{}')) ?? normalizeWorkResults({});
  const items = [
    { label: '외함', status: row.exterior ? '완료' : '대상 아님', note: values.exteriorResultNote },
    { label: '내함', status: row.interior ? '완료' : '대상 아님', note: values.interiorResultNote },
    { label: '주변', status: surroundingsResultLabels[values.surroundingsStatus], note: values.surroundingsNote },
    { label: '고장확인', status: faultResultLabels[values.faultStatus], note: values.faultNote },
  ];
  return { values, items };
}
