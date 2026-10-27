import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page-message">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/groups/:id" element={<Protected><GroupPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
