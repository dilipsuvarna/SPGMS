import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (!location.state?.registration) return;
    setRegistration(location.state.registration);
    navigate('/', { replace: true, state: null });
  }, [location.state, navigate]);

  return (
    <main className="page">
      {registration && (
        <div className="modal-backdrop" role="presentation">
          <section className="success-modal" role="alertdialog" aria-modal="true" aria-labelledby="registration-title">
            <h2 id="registration-title">{registration.affected ? 'Complaint Added as Affected Citizen' : 'Complaint Registered'}</h2>
            <p>{registration.affected ? 'Your report was linked to an existing complaint and you have been added as an affected citizen.' : 'Your complaint has been registered successfully.'}</p>
            <p><strong>Complaint ID:</strong> {registration.complaint_id}</p>
            <p><strong>Status:</strong> {registration.status || 'Registered'}</p>
            <p><strong>Priority:</strong> {registration.priority || 'Medium'}</p>
            <p><strong>Affected citizens:</strong> {registration.affected_citizens || 1}</p>
            <button className="btn primary" type="button" onClick={() => setRegistration(null)}>Continue</button>
          </section>
        </div>
      )}
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
