const storeName = 'photos';
let database;

function photoDatabase() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('bonyeon-camera-queue', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' }).createIndex('owner', 'owner');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 본연 탭을 닫고 다시 시도해 주세요.'));
  }).catch(error => { database = undefined; throw error; });
  return database;
}

async function access(mode, operation) {
  const db = await photoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || request.error);
    transaction.onerror = () => reject(transaction.error || request.error);
  });
}

export function readPhotoQueue(owner) {
  return access('readonly', store => store.index('owner').getAll(owner));
}

export function writeQueuedPhoto(record) {
  return access('readwrite', store => store.put(record));
}

export function removeQueuedPhoto(id) {
  return access('readwrite', store => store.delete(id));
}
