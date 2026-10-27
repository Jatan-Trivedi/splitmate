import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import { formatDate, formatMoney } from '../utils';

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [memberMsg, setMemberMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api(`/groups/${id}`));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const names = useMemo(
    () => Object.fromEntries((data?.group.members || []).map((m) => [m._id, m.name])),
    [data]
  );

  // Expenses and payments merged into one timeline, newest first
  const activity = useMemo(() => {
    if (!data) return [];
    return [
      ...data.expenses.map((item) => ({ kind: 'expense', item, date: new Date(item.date) })),
      ...data.settlements.map((item) => ({ kind: 'payment', item, date: new Date(item.createdAt) })),
    ].sort((a, b) => b.date - a.date);
  }, [data]);

  if (loadError && !data) {
    return (
      <div className="stack">
        <p className="alert alert-error">{loadError}</p>
        <Link to="/">Back to your groups</Link>
      </div>
    );
  }
  if (!data) return <p className="muted">Loading group…</p>;

  const me = user._id;
  const who = (userId) => (userId === me ? 'You' : names[userId] || 'Someone');
  const { group, balances } = data;

  // Run a change, then refresh the group; show any error in one place
  async function act(fn) {
    setActionError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(err.message);
    }
  }

  const deleteExpense = (expense) => {
    if (window.confirm(`Delete "${expense.description}"? Balances will be recalculated.`)) {
      act(() => api(`/groups/${id}/expenses/${expense._id}`, { method: 'DELETE' }));
    }
  };

  const deletePayment = (payment) => {
    if (window.confirm('Remove this payment? Balances will be recalculated.')) {
      act(() => api(`/groups/${id}/settlements/${payment._id}`, { method: 'DELETE' }));
    }
  };

  const recordPayment = (transfer) => {
    const text = `Record that ${who(transfer.from)} paid ${who(transfer.to)} ${formatMoney(transfer.amount)}?`;
    if (window.confirm(text)) {
      act(() => api(`/groups/${id}/settlements`, { method: 'POST', body: transfer }));
    }
  };

  async function addMember(e) {
    e.preventDefault();
    setMemberMsg(null);
    try {
      await api(`/groups/${id}/members`, { method: 'POST', body: { email } });
      setEmail('');
      setMemberMsg({ type: 'success', text: 'Member added.' });
      await load();
    } catch (err) {
      setMemberMsg({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="stack-lg">
      <div>
        <Link to="/" className="small">← All groups</Link>
        <h1>{group.name}</h1>
        <p className="muted">{group.members.map((m) => who(m._id)).join(', ')}</p>
      </div>

      {actionError && <p className="alert alert-error">{actionError}</p>}

      <section className="card stack">
        <h2>Balances</h2>
        <ul className="list">
          {group.members.map((m) => {
            const amount = balances.net[m._id] || 0;
            return (
              <li key={m._id} className="row-between">
                <span>{who(m._id)}</span>
                {amount > 0 && <span className="positive">gets back {formatMoney(amount)}</span>}
                {amount < 0 && <span className="negative">owes {formatMoney(-amount)}</span>}
                {amount === 0 && <span className="muted">settled up</span>}
              </li>
            );
          })}
        </ul>

        {balances.transfers.length > 0 ? (
          <>
            <h3>How to settle up</h3>
            <ul className="list">
              {balances.transfers.map((t) => (
                <li key={`${t.from}-${t.to}`} className="row-between">
                  <span>
                    {who(t.from)} {t.from === me ? 'pay' : 'pays'} {who(t.to)} <strong>{formatMoney(t.amount)}</strong>
                  </span>
                  {(t.from === me || t.to === me) && (
                    <button className="btn btn-small" onClick={() => recordPayment(t)}>Record payment</button>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Everyone is settled up.</p>
        )}
      </section>

      {showForm ? (
        <ExpenseForm
          groupId={id}
          members={group.members}
          meId={me}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      ) : (
        <button className="btn btn-primary btn-wide" onClick={() => setShowForm(true)}>Add an expense</button>
      )}

      <section className="card stack">
        <h2>Activity</h2>
        {activity.length === 0 && (
          <p className="muted">Nothing here yet. Add the first expense to start tracking who owes what.</p>
        )}
        <ul className="list">
          {activity.map(({ kind, item, date }) => {
            if (kind === 'payment') {
              return (
                <li key={item._id} className="activity">
                  <div>
                    <div>{who(item.from)} paid {who(item.to)}</div>
                    <div className="muted small">Payment · {formatDate(date)}</div>
                  </div>
                  <div className="activity-right">
                    <strong>{formatMoney(item.amount)}</strong>
                    {item.createdBy === me && (
                      <button className="link-button" onClick={() => deletePayment(item)}>Remove</button>
                    )}
                  </div>
                </li>
              );
            }

            const myShare = item.splits.find((s) => s.user === me)?.amount || 0;
            const lent = item.paidBy === me ? item.amount - myShare : 0;
            const canDelete = item.createdBy === me || item.paidBy === me;

            return (
              <li key={item._id} className="activity">
                <div>
                  <div>{item.description}</div>
                  <div className="muted small">{who(item.paidBy)} paid · {formatDate(date)}</div>
                </div>
                <div className="activity-right">
                  <strong>{formatMoney(item.amount)}</strong>
                  {lent > 0 && <span className="positive small">you lent {formatMoney(lent)}</span>}
                  {item.paidBy !== me && myShare > 0 && <span className="negative small">you owe {formatMoney(myShare)}</span>}
                  {item.paidBy !== me && myShare === 0 && <span className="muted small">not involved</span>}
                  {canDelete && (
                    <button className="link-button" onClick={() => deleteExpense(item)}>Delete</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card stack">
        <h2>Add a member</h2>
        <form onSubmit={addMember} className="row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Friend's email (they need an account)"
            required
          />
          <button className="btn">Add</button>
        </form>
        {memberMsg && (
          <p className={`alert ${memberMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>{memberMsg.text}</p>
        )}
      </section>
    </div>
  );
}
