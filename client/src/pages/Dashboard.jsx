import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import BalanceTag from '../components/BalanceTag';

export default function Dashboard() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api('/groups')
      .then(setGroups)
      .catch((err) => setError(err.message));
  }, []);

  async function createGroup(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const group = await api('/groups', { method: 'POST', body: { name } });
      navigate(`/groups/${group._id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="stack-lg">
      <h1>Your groups</h1>

      <form onSubmit={createGroup} className="card row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New group name, e.g. Flat 4B or Goa trip"
          maxLength={60}
          required
        />
        <button className="btn btn-primary" disabled={creating}>
          {creating ? 'Creating…' : 'Create group'}
        </button>
      </form>

      {error && <p className="alert alert-error">{error}</p>}

      {!groups && !error && <p className="muted">Loading groups…</p>}

      {groups && groups.length === 0 && (
        <div className="card empty">
          <p><strong>No groups yet.</strong></p>
          <p className="muted">Create a group above, then add friends by their email to start splitting.</p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <ul className="list card">
          {groups.map((group) => (
            <li key={group._id}>
              <Link to={`/groups/${group._id}`} className="list-link">
                <div>
                  <strong>{group.name}</strong>
                  <div className="muted small">{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</div>
                </div>
                <BalanceTag amount={group.myBalance} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
