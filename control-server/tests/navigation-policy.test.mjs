import assert from 'node:assert/strict';
import test from 'node:test';
import { browserWorkspaceExport, isLegacyRoute, navigationItems, resolveNavigationRoute } from '../../public/control-app/navigation.js';

test('operational administrators see one server workflow and can reach preserved browser data through more', () => {
  const options = { independentPortal:true,verification:false,month:'2026-11' };
  const items = navigationItems({role:'owner',id:'owner'},options);
  assert.deepEqual(items.map(item=>item.key),['control','map','analytics','users','more']);
  for (const key of ['home','days','month','alerts']) assert.equal(items.some(item=>item.key===key),false);
  assert.equal(resolveNavigationRoute('',{role:'admin',nativeLogin:true},options),'control');
  assert.equal(resolveNavigationRoute('home',{role:'admin',nativeLogin:true},options),'home');
  assert.equal(isLegacyRoute('home'),true);
  assert.equal(isLegacyRoute('d-2026-11-12'),true);
  assert.equal(isLegacyRoute('control'),false);
  assert.equal(isLegacyRoute('d-2026-02-31'),false);
});

test('cleaner navigation contains own payment history and keeps help out of primary work links', () => {
  const account={role:'cleaner',id:'verification:worker@example.invalid',nativeLogin:true};
  const options={independentPortal:true,verification:false,month:'2026-11'};
  const items=navigationItems(account,options);
  assert.deepEqual(items.map(item=>item.key),['control','map','payments','history','more']);
  assert.equal(items.find(item=>item.key==='payments').href,'#control-detail/worker/verification%3Aworker%40example.invalid?month=2026-11');
  assert.equal(resolveNavigationRoute('history',account,options),'control');
  assert.equal(resolveNavigationRoute('days',account,options),'control');
  assert.equal(resolveNavigationRoute('more',account,options),'more');
  assert.equal(resolveNavigationRoute('regions',account,options),'regions');
});

test('verification stays isolated and browser-only accounts retain their old navigation', () => {
  const verification={independentPortal:true,verification:true,month:'2026-11'};
  assert.equal(resolveNavigationRoute('home',{role:'owner'},verification),'control');
  assert.equal(resolveNavigationRoute('legacy',{role:'owner'},verification),'control');
  assert.equal(resolveNavigationRoute('about',{role:'cleaner'},verification),'about');
  const browserOnly=navigationItems({role:null},{independentPortal:false,verification:false,month:'2026-11'});
  assert.equal(browserOnly.some(item=>item.key==='home'),true);
  assert.equal(resolveNavigationRoute('unknown',{role:'viewer',nativeLogin:true},{independentPortal:true}),'map');
  assert.equal(resolveNavigationRoute('control-detail/site/site-1?month=2026-11',{role:'cleaner'},verification),'control-detail/site/site-1?month=2026-11');
});

test('browser export preserves original saved reports and embedded photos without changing the workspace', () => {
  const workspace={reports:{'2026-11-12':{notes:'기존 자료',photos:[{before:'data:image/jpeg;base64,test'}]}},months:{'2026-11':{contract:20}},zones:[{name:'기존구역'}]};
  const original=structuredClone(workspace);
  const exported=browserWorkspaceExport(workspace,{workspaceKey:'own-workspace',exportedAt:'2026-11-12T00:00:00Z'});
  assert.deepEqual(exported.workspace,original);
  assert.deepEqual(workspace,original);
  assert.equal(exported.workspaceKey,'own-workspace');
  assert.equal(exported.format,'bonyeon-browser-workspace-v1');
  assert.equal(exported.workspace.reports['2026-11-12'].photos[0].before,'data:image/jpeg;base64,test');
});
