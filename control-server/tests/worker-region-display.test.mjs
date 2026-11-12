import assert from 'node:assert/strict';
import test from 'node:test';
import { regionTable } from '../../public/control-app/regions.js';

test('cleaner region reference distinguishes assigned missing rates from unassigned regions', () => {
  const html=regionTable([{name:'배정 지역',count:10,workerPrice:null},{name:'미배정 지역',count:20,contractPrice:987654}],false,'cleaner');
  assert.match(html,/미입력/);
  assert.match(html,/내 배정 지역만 표시/);
  assert.doesNotMatch(html,/987654|987,654|실제 계약단가|<input/);
  assert.match(html,/10기/);
  assert.match(html,/20기/);
});

test('administrator rates remain editable and viewer regions contain only public counts', () => {
  const rows=[{name:'서울특별시',count:100,workerPrice:20000,contractPrice:50000}];
  const admin=regionTable(rows,true,'admin');
  assert.match(admin,/실제 계약단가/);
  assert.match(admin,/작업자 청소단가/);
  assert.match(admin,/value="50000"/);
  assert.match(admin,/value="20000"/);
  const viewer=regionTable(rows,false,'viewer');
  assert.doesNotMatch(viewer,/계약단가|청소단가|20000|50000/);
  assert.match(viewer,/100기/);
});
