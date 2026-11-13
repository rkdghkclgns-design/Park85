import assert from 'node:assert/strict';
import test from 'node:test';
import { updatePhotoThumbnails } from '../../public/control-app/photo-thumbnails.js';

test('heartbeat refresh preserves in-flight and loaded thumbnail nodes',()=>{
  let writes=0,markup='';
  const container={get innerHTML(){return markup;},set innerHTML(value){writes++;markup=value;}};
  assert.equal(updatePhotoThumbnails(container,'<img data-private-image="one">'),true);
  const afterFirst=writes;
  markup='<img data-private-image="one" src="blob:loaded">';
  for(let i=0;i<10;i++)assert.equal(updatePhotoThumbnails(container,'<img data-private-image="one">'),false);
  assert.equal(writes,afterFirst);assert.match(container.innerHTML,/blob:loaded/);
  assert.equal(updatePhotoThumbnails(container,'<img data-private-image="two">'),true);
  assert.equal(writes,afterFirst+1);
});

test('different slots and clearing photos update independently',()=>{
  const before={},after={};
  assert.equal(updatePhotoThumbnails(before,'same'),true);
  assert.equal(updatePhotoThumbnails(after,'same'),true);
  assert.equal(updatePhotoThumbnails(before,''),true);
  assert.equal(before.innerHTML,'');assert.equal(after.innerHTML,'same');
  assert.equal(updatePhotoThumbnails(before,''),false);
});
