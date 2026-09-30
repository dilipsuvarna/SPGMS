import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginOfficer } from '../../services/officerService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginOfficer(email, password);
      if (result.officer?.id) navigate('/officer/dashboard');
      else navigate('/officer/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page center-page">
      <section className="card auth-card">
        <h2>Officer Login</h2>
        <p className="subtle">Use your department credentials to access assigned complaints.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
        </form>
      </section>
    </main>
  );
}


