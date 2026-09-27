const DB_NAME = 'literature-counter';
const DB_VERSION = 1;
let database;
function openDatabase() {
  if (database) return Promise.resolve(database);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const literature = db.createObjectStore('literature', { keyPath: 'id' });
      literature.createIndex('codeKey', 'codeKey', { unique: true });
      db.createObjectStore('records', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => { database = request.result; resolve(database); };
    request.onerror = () => reject(request.error);
  });
}
async function requestStore(name, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode); const request = action(tx.objectStore(name));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
const all = name => requestStore(name, 'readonly', store => store.getAll());
const put = (name, value) => requestStore(name, 'readwrite', store => store.put(value));
const remove = (name, key) => requestStore(name, 'readwrite', store => store.delete(key));
export const getLiteratures = () => all('literature');
export const getRecords = async () => (await all('records')).sort((a, b) => b.timestamp - a.timestamp);
export const getLiterature = id => requestStore('literature', 'readonly', store => store.get(id));
export const findByCode = async code => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('literature', 'readonly').objectStore('literature').index('codeKey').get(code.trim().toLocaleLowerCase());
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
};
export const saveLiterature = item => put('literature', item);
export const saveRecord = record => put('records', record);
export const deleteRecord = id => remove('records', id);
export async function deleteLiterature(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['literature', 'records'], 'readwrite');
    tx.objectStore('literature').delete(id);
    const cursor = tx.objectStore('records').openCursor();
    cursor.onsuccess = () => { const value = cursor.result; if (value) { if (value.value.literatureId === id) value.delete(); value.continue(); } };
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
export async function exportData() {
  const [literature, records] = await Promise.all([getLiteratures(), getRecords()]);
  return { schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), literature, records, settings: { language: 'pt' } };
}
export async function importData(data) {
  if (!data || data.schemaVersion !== DB_VERSION || !Array.isArray(data.literature) || !Array.isArray(data.records)) throw new Error('Invalid backup');
  const ids = new Set(); const codes = new Set();
  for (const item of data.literature) {
    if (!item || typeof item.id !== 'string' || typeof item.code !== 'string' || !item.code.trim() || !Number.isFinite(item.unitWeight) || item.unitWeight <= 0 || ids.has(item.id)) throw new Error('Invalid literature');
    const key = item.code.trim().toLocaleLowerCase(); if (codes.has(key)) throw new Error('Duplicate code');
    ids.add(item.id); codes.add(key);
  }
  const recordIds = new Set();
  for (const record of data.records) {
    if (!record || typeof record.id !== 'string' || recordIds.has(record.id) || !ids.has(record.literatureId) || !['estante', 'karinhu', 'armazem'].includes(record.location) || !Number.isFinite(record.weight) || record.weight < 0 || !Number.isFinite(record.quantity) || record.quantity < 0 || !Number.isFinite(record.unitWeightUsed) || record.unitWeightUsed <= 0 || !Number.isFinite(record.timestamp)) throw new Error('Invalid record');
    recordIds.add(record.id);
  }
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['literature', 'records', 'settings'], 'readwrite');
    for (const name of ['literature', 'records', 'settings']) tx.objectStore(name).clear();
    data.literature.forEach(item => tx.objectStore('literature').put(item)); data.records.forEach(item => tx.objectStore('records').put(item));
    tx.objectStore('settings').put({ key: 'language', value: 'pt' });
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
