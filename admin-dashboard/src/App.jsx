import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComplaintsPage from './pages/ComplaintsPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import OfficersPage from './pages/OfficersPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" replace />;
}

function NavBar() {
  const location = useLocation();
  return (
    <nav className="top-nav">
      <Link to="/dashboard" className="brand">SPGMS Admin Portal</Link>
      <div className="nav-links">
        {location.pathname !== '/login' ? <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/complaints">Complaints</Link>
          <Link to="/officers">Officers</Link>
        </> : null}
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
        <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />
        <Route path="/complaints/:complaintId" element={<ProtectedRoute><ComplaintDetailPage /></ProtectedRoute>} />
        <Route path="/officers" element={<ProtectedRoute><OfficersPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
