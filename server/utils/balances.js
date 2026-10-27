/**
 * Money is always stored as integer paise (1 rupee = 100 paise) so we never
 * run into floating point errors like 0.1 + 0.2 !== 0.3.
 */

// Split `amount` between users as evenly as possible. Any leftover paise
// are handed out one each to the first users, so the total always matches.
function splitEqually(amount, userIds) {
  const count = userIds.length;
  const base = Math.floor(amount / count);
  let remainder = amount - base * count;

  return userIds.map((user) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { user, amount: base + extra };
  });
}

// Net balance per user: positive = is owed money, negative = owes money.
function computeNetBalances(expenses, settlements) {
  const net = {};
  const add = (id, value) => {
    const key = String(id);
    net[key] = (net[key] || 0) + value;
  };

  for (const expense of expenses) {
    add(expense.paidBy, expense.amount); // payer fronted the money
    for (const split of expense.splits) add(split.user, -split.amount); // everyone owes their share
  }

  for (const payment of settlements) {
    add(payment.from, payment.amount); // payer's debt shrinks
    add(payment.to, -payment.amount); // receiver is owed less
  }

  return net;
}

// Turn net balances into a short list of "A pays B" transfers
// by repeatedly matching the biggest debtor with the biggest creditor.
function simplifyDebts(net) {
  const creditors = [];
  const debtors = [];

  for (const [user, balance] of Object.entries(net)) {
    if (balance > 0) creditors.push({ user, amount: balance });
    if (balance < 0) debtors.push({ user, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({ from: debtors[i].user, to: creditors[j].user, amount: pay });

    debtors[i].amount -= pay;
    creditors[j].amount -= pay;

    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }

  return transfers;
}

module.exports = { splitEqually, computeNetBalances, simplifyDebts };
