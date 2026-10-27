import { useState } from 'react';
import { api } from '../api';
import { formatMoney, toPaise } from '../utils';

export default function ExpenseForm({ groupId, members, meId, onSaved, onCancel }) {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidBy, setPaidBy] = useState(meId);
  const [splitType, setSplitType] = useState('equal');
  const [participants, setParticipants] = useState(members.map((m) => m._id));
  const [exact, setExact] = useState({}); // userId -> text typed in the box
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const amount = toPaise(amountText);
  const assigned = members.reduce((sum, m) => sum + (toPaise(exact[m._id] || '0') || 0), 0);

  const toggleParticipant = (id) =>
    setParticipants((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) return setError('Add a short description, e.g. "Dinner"');
    if (amount === null || amount <= 0) return setError('Enter a valid amount, e.g. 450 or 450.50');

    const body = { description: description.trim(), amount, paidBy, splitType };

    if (splitType === 'equal') {
      if (participants.length === 0) return setError('Select at least one person to split with');
      body.participants = participants;
    } else {
      if (assigned !== amount) {
        return setError(`Amounts add up to ${formatMoney(assigned)}, but the total is ${formatMoney(amount)}`);
      }
      body.splits = members
        .map((m) => ({ user: m._id, amount: toPaise(exact[m._id] || '0') || 0 }))
        .filter((s) => s.amount > 0);
    }

    setSaving(true);
    try {
      await api(`/groups/${groupId}/expenses`, { method: 'POST', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const perPerson =
    amount && participants.length > 0 ? Math.floor(amount / participants.length) : null;

  return (
    <form onSubmit={handleSubmit} className="card stack">
      <h2>Add an expense</h2>

      <div className="grid-2">
        <label>
          What was it for?
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} placeholder="Dinner" />
        </label>
        <label>
          Amount (₹)
          <input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="decimal" placeholder="0.00" />
        </label>
      </div>

      <label>
        Paid by
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {members.map((m) => (
            <option key={m._id} value={m._id}>{m._id === meId ? 'You' : m.name}</option>
          ))}
        </select>
      </label>

      <div className="segmented" role="group" aria-label="How to split">
        <button type="button" className={splitType === 'equal' ? 'active' : ''} onClick={() => setSplitType('equal')}>
          Split equally
        </button>
        <button type="button" className={splitType === 'exact' ? 'active' : ''} onClick={() => setSplitType('exact')}>
          Exact amounts
        </button>
      </div>

      {splitType === 'equal' ? (
        <div className="stack-sm">
          {members.map((m) => (
            <label key={m._id} className="check">
              <input type="checkbox" checked={participants.includes(m._id)} onChange={() => toggleParticipant(m._id)} />
              {m._id === meId ? 'You' : m.name}
            </label>
          ))}
          {perPerson !== null && <p className="muted small">About {formatMoney(perPerson)} each</p>}
        </div>
      ) : (
        <div className="stack-sm">
          {members.map((m) => (
            <label key={m._id} className="row-between">
              <span>{m._id === meId ? 'You' : m.name}</span>
              <input
                className="narrow"
                value={exact[m._id] || ''}
                onChange={(e) => setExact({ ...exact, [m._id]: e.target.value })}
                inputMode="decimal"
                placeholder="0.00"
              />
            </label>
          ))}
          <p className={`small ${amount !== null && assigned === amount ? 'positive' : 'muted'}`}>
            Assigned {formatMoney(assigned)} of {amount !== null ? formatMoney(amount) : '₹0.00'}
          </p>
        </div>
      )}

      {error && <p className="alert alert-error">{error}</p>}

      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</button>
      </div>
    </form>
  );
}
