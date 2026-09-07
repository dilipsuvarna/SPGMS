import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import CitizenHome from './pages/citizen/HomePage';
import AboutPage from './pages/citizen/AboutPage';
import RegisterPage from './pages/citizen/RegisterPage';
import TrackPage from './pages/citizen/TrackPage';
import ContactPage from './pages/citizen/ContactPage';
import CitizenLogin from './pages/citizen/LoginPage';
import AdminLogin from './pages/admin/LoginPage';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminComplaints from './pages/admin/ComplaintsPage';
import AdminComplaintDetail from './pages/admin/ComplaintDetailPage';
import AdminOfficers from './pages/admin/OfficersPage';
import AdminOfficerManage from './pages/admin/OfficerManagePage';
import OfficerLogin from './pages/officer/LoginPage';
import OfficerDashboard from './pages/officer/DashboardPage';
import OfficerComplaintDetail from './pages/officer/ComplaintDetailPage';
import { getStoredOfficer } from './services/officerService';

function RoleGuard({ role, children }) {
  const valid = role === 'admin' ? localStorage.getItem('adminToken') : getStoredOfficer();
  return valid ? children : <Navigate to={`/${role}/login`} replace />;
}

function PublicNav() {
  const location = useLocation();
  if (!location.pathname.startsWith('/citizen') && location.pathname !== '/') return null;
  const links = [['/citizen', 'Home'], ['/citizen/about', 'About'], ['/citizen/register', 'Register Complaint'], ['/citizen/track', 'Track Complaint'], ['/citizen/contact', 'Contact']];
  return <nav className="top-nav public-nav">
    <Link to="/citizen" className="brand">
      <span className="brand-mark" aria-hidden="true"><span className="brand-building" /><span className="brand-leaf" /></span>
      <span><strong>SPGMS</strong></span>
    </Link>
    <div className="nav-links">{links.map(([to, label]) => <Link key={to} className={location.pathname === to ? 'active' : ''} to={to}>{label}</Link>)}</div>
  </nav>;
}

function RoleNav() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
    return <nav className="top-nav"><Link to="/admin/dashboard" className="brand">SPGMS Admin Portal</Link><div className="nav-links"><Link to="/admin/dashboard">Dashboard</Link><Link to="/admin/complaints">Complaints</Link><Link to="/admin/officers">Officers</Link></div></nav>;
  }
  if (location.pathname.startsWith('/officer') && location.pathname !== '/officer/login') {
    return <nav className="top-nav"><Link to="/officer/dashboard" className="brand">SPGMS Officer Portal</Link></nav>;
  }
  return null;
}

export default function App() {
  return <div className="app-shell">
    <PublicNav />
    <RoleNav />
    <Routes>
      <Route path="/" element={<Navigate to="/citizen" replace />} />
      <Route path="/citizen" element={<CitizenHome />} />
      <Route path="/citizen/login" element={<CitizenLogin />} />
      <Route path="/citizen/about" element={<AboutPage />} />
      <Route path="/citizen/register" element={<RegisterPage />} />
      <Route path="/citizen/track" element={<TrackPage />} />
      <Route path="/citizen/contact" element={<ContactPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<RoleGuard role="admin"><AdminDashboard /></RoleGuard>} />
      <Route path="/admin/complaints" element={<RoleGuard role="admin"><AdminComplaints /></RoleGuard>} />
      <Route path="/admin/complaints/:complaintId" element={<RoleGuard role="admin"><AdminComplaintDetail /></RoleGuard>} />
      <Route path="/admin/officers" element={<RoleGuard role="admin"><AdminOfficers /></RoleGuard>} />
      <Route path="/admin/officers/:officerId/manage" element={<RoleGuard role="admin"><AdminOfficerManage /></RoleGuard>} />
      <Route path="/officer/login" element={<OfficerLogin />} />
      <Route path="/officer/dashboard" element={<RoleGuard role="officer"><OfficerDashboard /></RoleGuard>} />
      <Route path="/officer/complaints/:complaintId" element={<RoleGuard role="officer"><OfficerComplaintDetail /></RoleGuard>} />
      <Route path="*" element={<Navigate to="/citizen" replace />} />
    </Routes>
  </div>;
}
