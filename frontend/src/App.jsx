import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import LoginPage  from './pages/LoginPage.jsx';
import TimerPage  from './pages/TimerPage.jsx';
import SubmitPage from './pages/SubmitPage.jsx';

function LoginGuard() {
  const { session, loading } = useSession();
  if (loading) return <div className="page-loading">Initialising</div>;
  if (session) return <Navigate to="/timer" replace />;
  return <LoginPage />;
}

function SessionGuard({ children }) {
  const { session, loading } = useSession();
  if (loading) return <div className="page-loading">Restoring session</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"       element={<LoginGuard />} />
          <Route path="/timer"  element={<SessionGuard><TimerPage /></SessionGuard>} />
          <Route path="/submit" element={<SessionGuard><SubmitPage /></SessionGuard>} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
