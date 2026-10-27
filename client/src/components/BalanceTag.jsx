import { formatMoney } from '../utils';

// Shows a balance from the logged-in user's point of view
export default function BalanceTag({ amount }) {
  if (amount > 0) return <span className="positive">you are owed {formatMoney(amount)}</span>;
  if (amount < 0) return <span className="negative">you owe {formatMoney(-amount)}</span>;
  return <span className="muted">settled up</span>;
}
