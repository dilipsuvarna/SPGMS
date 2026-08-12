import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Smart Public Grievance Management System</p>
          <h1>Report civic issues quickly and track resolution in real time.</h1>
          <p>Citizens can report water, waste, electricity, and road problems through one simple digital portal.</p>
          <div className="actions">
            <Link className="btn primary" to="/register">Register Complaint</Link>
            <Link className="btn secondary" to="/track">Track Complaint</Link>
          </div>
        </div>
      </section>

      <section className="card-grid">
        <div className="card">
          <h3>How it works</h3>
          <ol>
            <li>Citizen reports an issue.</li>
            <li>AI analyses the complaint.</li>
            <li>System identifies the right department and priority.</li>
            <li>Officer is assigned and updates are sent to the citizen.</li>
          </ol>
        </div>
        <div className="card">
          <h3>Departments covered</h3>
          <ul>
            <li>Water</li>
            <li>Waste Management</li>
            <li>Electricity</li>
            <li>Roads</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
