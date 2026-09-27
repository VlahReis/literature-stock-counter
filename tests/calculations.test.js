import assert from 'node:assert/strict';
import { calculateUnitWeight, calculateQuantity, parseLocalizedNumber, formatQuantity } from '../js/calculations.js';

assert.equal(calculateUnitWeight(820, 100), 8.2);
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is close to ${expected}`);
closeTo(calculateQuantity(410, 8.2), 50);
closeTo(calculateQuantity(1230, 8.2), 150);
closeTo(calculateQuantity(820, 8.2), 100);
assert.ok(Math.abs(calculateQuantity(1250, 7.5) - 166.6666666667) < 1e-8);
assert.equal(formatQuantity(calculateQuantity(1250, 7.5)), '167');
assert.equal(parseLocalizedNumber('8,20'), 8.2);
assert.ok(Number.isNaN(parseLocalizedNumber('abc')));
assert.throws(() => calculateUnitWeight(820, 0), RangeError);
assert.throws(() => calculateQuantity(-1, 8.2), RangeError);
console.log('Calculation checks passed.');
