import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import { getStoredOfficer } from './services/officerService';

function ProtectedRoute({ children }) {
  const officer = getStoredOfficer();
  return officer ? children : <Navigate to="/login" replace />;
}

function NavBar() {
  const location = useLocation();
  const officer = getStoredOfficer();
  return (
    <nav className="top-nav">
      <Link to="/dashboard" className="brand">SPGMS Officer Portal</Link>
      <div className="nav-links">
        {officer ? <span className="nav-user">{officer.name}</span> : null}
        {location.pathname !== '/login' ? <Link to="/dashboard">Dashboard</Link> : null}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/complaints/:complaintId" element={<ProtectedRoute><ComplaintDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
