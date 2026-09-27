import { t, applyTranslations } from './i18n.js';
import { parseLocalizedNumber, calculateUnitWeight, calculateQuantity, formatNumber, formatWeight, formatQuantity } from './calculations.js';
import * as db from './db.js';
import { scanQr } from './scanner.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const locations = ['estante', 'karinhu', 'armazem'];
let page = 'count';
let selectedItem;
let selectedLocation;
let pendingCount;
let scanner;
let installPrompt;
const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
function notify(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function codeKey(code) { return code.trim().toLocaleLowerCase(); }
function byCode(items) { return items.sort((a,b) => a.code.localeCompare(b.code, 'pt')); }
function getLatest(records, literatureId, location) { return records.find(record => record.literatureId === literatureId && record.location === location); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function locationLabel(location) { return t(location); }
document.title = t('appTitle');
function header(title, subtitle = '') { return `<h2>${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}`; }
function button(label, action, style = 'button', extra = '') { return `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`; }
async function render() {
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  if (page === 'count') await renderCountHome();
  else if (page === 'literature') await renderLiterature();
  else if (page === 'stock') await renderStock();
  else if (page === 'history') await renderHistory();
  else if (page === 'new') renderNewLiterature();
  else if (page === 'details') await renderDetails();
  else if (page === 'weigh') renderWeigh();
  else if (page === 'result') renderResult();
  else if (page === 'scan') renderScan();
  applyTranslations(app);
}
async function renderCountHome() {
  const items = byCode(await db.getLiteratures());
  app.innerHTML = `<section class="card hero"><h2>${t('countHeading')}</h2><p>${t('countIntro')}</p></section>
    <div class="stack">${button(`▧ &nbsp; ${t('scan')}`, 'scan')} ${button(`⌕ &nbsp; ${t('enterCode')}`, 'manual','button secondary')}
    ${button(`▤ &nbsp; ${t('browseLiterature')}`, 'literatures','button outline')}</div>
    <p class="caption" style="margin:14px 4px">${t('cameraHelp')}</p>`;
  if (items.length) app.innerHTML += `<h3 class="section-title">${t('literatureHeading').toLocaleUpperCase()}</h3><div class="list">${items.slice(0,5).map(item => `<button class="list-item" data-action="select" data-id="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.code)}</strong><span class="muted">${formatNumber(item.unitWeight)} ${t('unitSuffix')}</span></span><span class="arrow">›</span></button>`).join('')}</div>`;
}
async function renderLiterature() {
  const items = byCode(await db.getLiteratures());
  app.innerHTML = `${header(t('literatureHeading'))}<label class="field"><input id="search" type="search" placeholder="${t('search')}" data-i18n-placeholder="search"></label>
    <div id="literatureList" class="list">${literatureRows(items)}</div><div class="actions">${button(`＋ ${t('enterCode')}`, 'manual','button')}</div>`;
  document.querySelector('#search').addEventListener('input', event => {
    const query = event.target.value.toLocaleLowerCase();
    const matches = items.filter(item => `${item.code} ${item.codename ?? ''}`.toLocaleLowerCase().includes(query));
    document.querySelector('#literatureList').innerHTML = matches.length ? literatureRows(matches) : `<p class="card empty">${t('searchNoResults')}</p>`;
  });
}
function literatureRows(items) {
  if (!items.length) return `<section class="card empty"><p>${t('noLiterature')}</p></section>`;
  return items.map(item => `<button class="list-item" data-action="details" data-id="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.code)}</strong>${item.codename ? `<span class="muted">${escapeHtml(item.codename)}</span>` : ''}<span class="muted">${formatNumber(item.unitWeight)} ${t('unitSuffix')}</span></span><span class="arrow">›</span></button>`).join('');
}
async function renderDetails() {
  const item = await db.getLiterature(selectedItem.id); if (!item) { page='literature'; return render(); } selectedItem=item;
  app.innerHTML = `<section class="card"><div class="code-heading">${escapeHtml(item.code)}</div>${item.codename ? `<p class="muted">${escapeHtml(item.codename)}</p>` : ''}<p class="section-title">${t('unitWeight')}</p><div class="stat">${formatNumber(item.unitWeight)} g</div><p class="caption">${t('calibrationSummary',{count:formatQuantity(item.calibrationCount),weight:formatWeight(item.calibrationWeight)})}</p>
  <div class="actions">${button(t('recalibrate'),'recalibrate','button secondary')}${button(t('editCodename'),'codename','button outline')}</div></section>
  <p class="section-title">${t('chooseLocation').toLocaleUpperCase()}</p><div class="location-grid">${locations.map(location => button(locationLabel(location),`location-${location}`,'button location-button')).join('')}</div>
  <div class="actions">${button(t('deleteLiterature'),'delete-literature','button danger')}</div>`;
}
function renderNewLiterature(code = '', item = null) {
  page = 'new';
  app.innerHTML = `${header(item ? t('recalibrate') : t('newLiterature'))}<form id="literatureForm" class="card">
  <label class="field">${t('code')}<input name="code" required value="${escapeHtml(item?.code ?? code)}" ${item ? 'readonly' : ''} autocomplete="off"></label>
  <label class="field">${t('codename')}<input name="codename" value="${escapeHtml(item?.codename ?? '')}" autocomplete="off"></label>
  <p class="section-title">${t('calibration').toLocaleUpperCase()}</p>
  <label class="field">${t('calibrationCount')}<input name="count" type="number" inputmode="decimal" min="0.01" step="any" required value="${item?.calibrationCount ?? 100}"></label>
  <label class="field">${t('weight')} <span class="unit">(${t('grams')})</span><input name="weight" type="text" inputmode="decimal" required value="${item?.calibrationWeight ?? ''}"></label>
  <div class="stack">${button(t('save'),'submit','button','type="submit"')}${button(t('cancel'),'back','button outline','type="button"')}</div></form>`;
  document.querySelector('#literatureForm').addEventListener('submit', saveLiteratureForm);
}
async function saveLiteratureForm(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const code = String(form.get('code')).trim(); const count = parseLocalizedNumber(form.get('count')); const weight = parseLocalizedNumber(form.get('weight'));
  if (!code) return notify(t('invalidCode')); if (!(count > 0)) return notify(t('invalidCount')); if (!(weight > 0)) return notify(t('invalidWeight'));
  const existing = await db.findByCode(code);
  if (existing && (!selectedItem || existing.id !== selectedItem.id)) { selectedItem=existing; return renderDetails(); }
  const item = selectedItem && page === 'new' ? selectedItem : existing;
  await db.saveLiterature({ id: item?.id ?? id(), code: item?.code ?? code, codeKey: item?.codeKey ?? codeKey(code), codename: String(form.get('codename')).trim(), unitWeight: calculateUnitWeight(weight,count), calibrationCount: count, calibrationWeight: weight,
    calibrationHistory: [...(item?.calibrationHistory ?? []), ...(item ? [{ unitWeight:item.unitWeight, count:item.calibrationCount, weight:item.calibrationWeight, timestamp:Date.now() }] : [])], createdAt:item?.createdAt ?? Date.now(), updatedAt:Date.now() });
  notify(t('saved')); page='literature'; selectedItem=undefined; await render();
}
function renderWeigh() {
  app.innerHTML = `<section class="card"><div class="code-heading">${escapeHtml(selectedItem.code)}</div><p class="muted">${locationLabel(selectedLocation)}</p><p class="caption">${t('unitWeight')}: ${formatNumber(selectedItem.unitWeight)} g</p></section>
  <form id="weightForm" class="card"><label class="field">${t('pileWeight')} <span class="unit">(${t('grams')})</span><input name="weight" type="text" inputmode="decimal" min="0" required autofocus></label><div class="stack">${button(t('calculate'),'submit','button','type="submit"')}${button(t('cancel'),'back','button outline','type="button"')}</div></form>`;
  document.querySelector('#weightForm').addEventListener('submit', event => { event.preventDefault(); const weight = parseLocalizedNumber(new FormData(event.currentTarget).get('weight')); if (!(weight >= 0)) return notify(t('invalidStockWeight')); pendingCount={weight, quantity:calculateQuantity(weight,selectedItem.unitWeight)}; page='result'; render(); });
}
function renderResult() {
  const rounded=Math.round(pendingCount.quantity); const approximate=Math.abs(pendingCount.quantity-rounded) > 1e-9;
  app.innerHTML = `<section class="card"><div class="code-heading">${escapeHtml(selectedItem.code)}</div><p class="muted">${locationLabel(selectedLocation)}</p><p>${t('weight').toLocaleUpperCase()}: <strong>${formatWeight(pendingCount.weight)}</strong></p></section>
  <section class="card result"><div class="result-label">${t('estimatedQuantity')}</div><div class="result-number">${approximate ? '≈ ' : ''}${formatQuantity(pendingCount.quantity)}</div><div class="result-label">${t('copies').toLocaleUpperCase()}</div><p class="caption">${t('calculation')}: ${formatNumber(pendingCount.quantity)}</p></section>
  <div class="stack">${button(t('saveCount'),'save-count','button')}${button(t('cancel'),'back','button outline')}</div>`;
}
async function saveCount() {
  const record={id:id(),literatureId:selectedItem.id,code:selectedItem.code,location:selectedLocation,weight:pendingCount.weight,quantity:pendingCount.quantity,unitWeightUsed:selectedItem.unitWeight,timestamp:Date.now()};
  await db.saveRecord(record); notify(t('saved')); page='stock'; await render();
}
async function renderStock() {
  const [items,records]=await Promise.all([db.getLiteratures(),db.getRecords()]);
  app.innerHTML = `${header(t('stockHeading'))}${items.length ? `<div class="list">${byCode(items).map(item => stockCard(item,records)).join('')}</div><p class="caption" style="margin-top:14px">${t('includesCounted')}</p>` : `<section class="card empty"><p>${t('noLiterature')}</p></section>`}`;
}
function stockCard(item,records) {
  const rows=locations.map(location=>{const record=getLatest(records,item.id,location);return `<div class="stock-row"><span>${locationLabel(location)}</span><strong class="${record?'':'stock-unknown'}">${record?formatQuantity(record.quantity):t('notCounted')}</strong></div>`;});
  const counted=locations.map(location=>getLatest(records,item.id,location)).filter(Boolean); const total=counted.reduce((sum,record)=>sum+record.quantity,0);
  return `<section class="card"><div class="code-heading">${escapeHtml(item.code)}</div><div style="margin-top:12px">${rows.join('')}<div class="bar"></div><div class="stock-row stock-total"><span>${t('total')}${counted.length<3?'*':''}</span><strong>${formatQuantity(total)}</strong></div></div></section>`;
}
async function renderHistory() {
  const records=await db.getRecords();
  if (!records.length) { app.innerHTML=`${header(t('historyHeading'))}<section class="card empty"><p>${t('noHistory')}</p></section>${backupCard()}`;bindBackup();return; }
  const groups=new Map(); for(const record of records){const key=new Date(record.timestamp).toLocaleDateString('pt-PT');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
  app.innerHTML=`${header(t('historyHeading'))}<div>${[...groups].map(([date,group])=>`<div class="record-date">${date}</div><div class="list">${group.map(record=>`<section class="card"><div class="code-heading">${escapeHtml(record.code)}</div><p class="muted">${locationLabel(record.location)}</p><p style="margin-bottom:0">${formatWeight(record.weight)} · ≈ ${formatQuantity(record.quantity)} ${t('copies')}</p><div class="actions">${button(t('deleteRecord'),`delete-record-${record.id}`,'button danger small')}</div></section>`).join('')}</div>`).join('')}</div>
  ${backupCard()}`;
  bindBackup();
}
function backupCard() { return `<section class="card"><h3>${t('backup')}</h3><div class="stack" style="margin-top:13px">${button(t('exportData'),'export','button secondary')}<label class="button outline">${t('importData')}<input id="importFile" type="file" accept="application/json,.json" hidden></label></div></section>`; }
function bindBackup() { document.querySelector('#importFile').addEventListener('change',importFile); }
async function importFile(event) { const file=event.target.files[0];if(!file)return;if(!confirm(t('importConfirm')))return;try{await db.importData(JSON.parse(await file.text()));notify(t('imported'));await render();}catch{notify(t('invalidBackup'));} }
function renderScan() {
  app.innerHTML=`${header(t('qrHeading'),t('cameraHelp'))}<section class="card"><video class="video" id="camera" playsinline muted></video><p id="scanStatus" class="muted" style="margin-top:12px"></p><div class="stack" style="margin-top:14px">${button(t('continueManual'),'manual','button secondary')}${button(t('stopCamera'),'back','button outline')}</div></section>`;
  const video=document.querySelector('#camera');const status=document.querySelector('#scanStatus');
  scanQr(video,value=>{document.querySelector('#app').dataset.qr=value;page='manual-qr';renderManual(value);}).then(result=>{scanner=result;if(!result.supported)status.textContent=t('qrUnsupported');else if(result.error)status.textContent=t('qrDenied');else status.textContent=t('cameraHelp');});
}
function renderManual(qrValue='') {
  scanner?.stop?.();page='manual';
  app.innerHTML=`${header(t('enterCode'))}${qrValue?`<section class="card"><p class="section-title">${t('qrDecoded').toLocaleUpperCase()}</p><p style="overflow-wrap:anywhere">${escapeHtml(qrValue)}</p></section>`:''}<form id="codeForm" class="card"><label class="field">${t('code')}<input name="code" required autocomplete="off" autocapitalize="off" value="${escapeHtml(qrValue && !/^https?:\/\//i.test(qrValue) ? qrValue : '')}"></label>${qrValue?`<p class="caption">Se o QR contém uma ligação ou outro texto, introduza aqui o código impresso por baixo do QR.</p>`:''}<div class="stack">${button(t('continueManual'),'submit','button','type="submit"')}${button(t('cancel'),'back','button outline','type="button"')}</div></form>`;
  document.querySelector('#codeForm').addEventListener('submit',async event=>{event.preventDefault();const code=new FormData(event.currentTarget).get('code').trim();if(!code)return notify(t('invalidCode'));const item=await db.findByCode(code);if(item){selectedItem=item;page='details';render();}else{selectedItem=undefined;renderNewLiterature(code);}});
}
async function createBackup() { const data=await db.exportData();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`literature-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(link.href);notify(t('exported')); }
app.addEventListener('click',async event=>{
  const control=event.target.closest('[data-action]');if(!control)return;const action=control.dataset.action;
  if(action==='manual')return renderManual(); if(action==='scan'){page='scan';return render();} if(action==='literatures'){page='literature';return render();} if(action==='back'){scanner?.stop?.();page=selectedItem?'details':'count';return render();}
  if(action==='submit')return;
  if(action==='save-count')return saveCount(); if(action==='export')return createBackup();
  if(action.startsWith('select')||action==='details'){selectedItem=await db.getLiterature(control.dataset.id);page='details';return render();}
  if(action.startsWith('location-')){selectedLocation=action.slice(9);if(!(selectedItem.unitWeight>0))return notify(t('notCalibrated'));page='weigh';return render();}
  if(action==='recalibrate'){renderNewLiterature('',selectedItem);return;}
  if(action==='codename'){const name=prompt(t('editCodename'),selectedItem.codename??'');if(name!==null){selectedItem.codename=name.trim();selectedItem.updatedAt=Date.now();await db.saveLiterature(selectedItem);notify(t('saved'));return render();}return;}
  if(action==='delete-literature'){if(confirm(t('confirmDelete'))){await db.deleteLiterature(selectedItem.id);selectedItem=undefined;page='literature';notify(t('deleted'));return render();}return;}
  if(action.startsWith('delete-record-')){await db.deleteRecord(action.slice('delete-record-'.length));notify(t('deleted'));return render();}
  if(locations.includes(action)){selectedLocation=action;page='weigh';return render();}
});
document.querySelectorAll('.nav-button').forEach(button=>button.addEventListener('click',()=>{scanner?.stop?.();page=button.dataset.page;selectedItem=undefined;render();}));
applyTranslations();render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;const button=document.querySelector('#installButton');button.classList.remove('hidden');button.addEventListener('click',async()=>{installPrompt.prompt();await installPrompt.userChoice;button.classList.add('hidden');});});
