import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/adminService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page center-page">
      <section className="card auth-card">
        <h2>Admin Login</h2>
        <p className="subtle">Access analytics, complaint oversight, and officer management.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <label>Username<input value={username} onChange={e => setUsername(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
        </form>
      </section>
    </main>
  );
}
