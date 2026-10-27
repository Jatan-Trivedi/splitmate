const test = require('node:test');
const assert = require('node:assert/strict');
const { splitEqually, computeNetBalances, simplifyDebts } = require('../utils/balances');

test('splitEqually always adds up to the total', () => {
  const splits = splitEqually(1000, ['a', 'b', 'c']); // Rs 10.00 / 3
  assert.deepEqual(splits.map((s) => s.amount), [334, 333, 333]);
  assert.equal(splits.reduce((sum, s) => sum + s.amount, 0), 1000);
});

test('net balances reflect who paid and who owes', () => {
  const expenses = [
    { paidBy: 'a', amount: 900, splits: [{ user: 'a', amount: 300 }, { user: 'b', amount: 300 }, { user: 'c', amount: 300 }] },
  ];
  assert.deepEqual(computeNetBalances(expenses, []), { a: 600, b: -300, c: -300 });
});

test('settlements reduce what is owed', () => {
  const expenses = [
    { paidBy: 'a', amount: 600, splits: [{ user: 'a', amount: 300 }, { user: 'b', amount: 300 }] },
  ];
  const settlements = [{ from: 'b', to: 'a', amount: 300 }];
  const net = computeNetBalances(expenses, settlements);
  assert.equal(net.a, 0);
  assert.equal(net.b, 0);
});

test('simplifyDebts settles everyone with few transfers', () => {
  // a is owed 500, b owes 200, c owes 300
  const transfers = simplifyDebts({ a: 500, b: -200, c: -300 });
  assert.equal(transfers.length, 2);

  // applying the transfers must bring everyone to zero
  const net = { a: 500, b: -200, c: -300 };
  for (const t of transfers) {
    net[t.from] += t.amount;
    net[t.to] -= t.amount;
  }
  assert.deepEqual(net, { a: 0, b: 0, c: 0 });
});

test('simplifyDebts returns nothing when everyone is settled', () => {
  assert.deepEqual(simplifyDebts({ a: 0, b: 0 }), []);
});
