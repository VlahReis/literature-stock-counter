export function parseLocalizedNumber(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return NaN;
  return Number(normalized);
}
export function calculateUnitWeight(weight, count) {
  if (!(weight > 0) || !(count > 0)) throw new RangeError('Weight and count must be positive.');
  return weight / count;
}
export function calculateQuantity(weight, unitWeight) {
  if (!(weight >= 0) || !(unitWeight > 0)) throw new RangeError('Invalid weight or unit weight.');
  return weight / unitWeight;
}
export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
export function formatWeight(value) { return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value)} g`; }
export function formatQuantity(value) { return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(Math.round(value)); }
