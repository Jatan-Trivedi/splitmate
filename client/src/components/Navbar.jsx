import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">SplitMate</Link>
        {user && (
          <div className="navbar-user">
            <span>{user.name}</span>
            <button className="btn btn-ghost" onClick={logout}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}
