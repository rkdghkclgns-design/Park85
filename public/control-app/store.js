const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('cleanreport-demo', 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('accounts');
    request.result.createObjectStore('workspaces');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function access(storeName, mode, operation) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let request;
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onabort = () => reject(transaction.error ?? new Error('저장 작업을 완료하지 못했습니다.'));
    try {
      request = operation(transaction.objectStore(storeName));
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

const defaultZoneRows = [
  ['내부 바닥 (매장·사무실)', '진공청소 후 물걸레, 얼룩 제거'],
  ['테이블·의자', '표면 먼지·얼룩 제거, 의자 정돈'],
  ['탕비실', '싱크대 세척·물때 제거, 바닥 청소'],
  ['화장실', '변기·세면대·거울·바닥 청소, 소모품 보충'],
  ['계단', '계단·난간 먼지 제거, 물걸레'],
  ['건물 입구·주변', '출입구 바닥·유리문 청소, 주변 쓰레기 수거'],
  ['쓰레기 배출', '일반·재활용 분리배출, 봉투 교체'],
  ['유리창·유리선반', '유리세정제로 손자국·먼지 제거'],
];

export const makeZone = (name = '', work = '') => ({ name, work, contract: true, done: true, result: '' });
export const defaultZones = () => defaultZoneRows.map(([name, work]) => makeZone(name, work));
export const emptyWorkspace = () => ({ reports: {}, months: {}, zones: defaultZones() });
export const getAccount = email => access('accounts', 'readonly', store => store.get(email));
export const addAccount = (email, account) => access('accounts', 'readwrite', store => store.add(account, email));
export const putAccount = (email, account) => access('accounts', 'readwrite', store => store.put(account, email));
export async function getWorkspace(user) {
  return (await access('workspaces', 'readonly', store => store.get(user))) ?? emptyWorkspace();
}

export async function updateWorkspace(user, mutate) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspaces', 'readwrite');
    const store = transaction.objectStore('workspaces');
    const read = store.get(user);
    let updated;
    let failure;
    read.onsuccess = () => {
      try {
        updated = read.result ?? emptyWorkspace();
        mutate(updated);
        store.put(updated, user);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(updated);
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('보고서를 저장하지 못했습니다.'));
  });
}

export function randomHex(length) {
  return [...crypto.getRandomValues(new Uint8Array(length))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function deriveSecret(value, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 210_000,
  }, key, 256);
  return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function readPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'].includes(file.type)) {
    throw new Error('JPG, PNG, WebP 등 지원되는 이미지 파일을 선택해 주세요.');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('사진 한 장은 25MB 이하여야 합니다.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    bitmap.close();
  }
}
