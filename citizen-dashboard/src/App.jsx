import { Link, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import RegisterPage from './pages/RegisterPage';
import TrackPage from './pages/TrackPage';
import ContactPage from './pages/ContactPage';

function NavBar() {
  const location = useLocation();
  const links = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/register', label: 'Register Complaint' },
    { to: '/track', label: 'Track Complaint' },
    { to: '/contact', label: 'Contact' }
  ];
  return (
    <nav className="top-nav">
      <Link to="/" className="brand">SPGMS</Link>
      <div className="nav-links">
        {links.map(link => (
          <Link key={link.to} to={link.to} className={location.pathname === link.to ? 'active' : ''}>{link.label}</Link>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </div>
  );
}
