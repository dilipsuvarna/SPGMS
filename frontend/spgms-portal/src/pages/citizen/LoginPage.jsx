import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <main className="page center-page">
      <section className="card auth-card">
        <div className="eyebrow">Citizen Portal</div>
        <h2>Welcome to SPGMS</h2>
        <p className="subtle">Citizen complaint registration and tracking are available without a separate account.</p>
        <div className="right-actions">
          <Link className="btn primary" to="/citizen/register">Register Complaint</Link>
          <Link className="btn secondary" to="/citizen/track">Track Complaint</Link>
        </div>
      </section>
    </main>
  );
}
