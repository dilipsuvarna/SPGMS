import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function FeatureIcon({ type }) {
  if (type === 'water') {
    return <svg className="feature-svg" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1C9.8 5.8 4 10.7 4 17a8 8 0 0 0 16 0c0-6.3-5.8-11.2-8-16Z" /></svg>;
  }

  if (type === 'road') {
    return <svg className="feature-svg road-svg" viewBox="0 0 34 28" aria-hidden="true"><path d="M8 27 14 1h6l6 26H8Z" /><path className="road-marking" d="M16.5 5h1v5h-1zm0 8h1v5h-1zm0 8h1v5h-1z" /></svg>;
  }

  return <span className="feature-symbol" aria-hidden="true">{type === 'clean' ? '♻' : 'ϟ'}</span>;
}

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (!location.state?.registration) return;
    setRegistration(location.state.registration);
    navigate('/citizen', { replace: true, state: null });
  }, [location.state, navigate]);

  return (
    <main className="landing-page">
      <aside className="role-menu">
        <p className="eyebrow">Portal access</p>
        <Link className="portal-option active" to="/admin/login">
          <span className="portal-icon admin">◆</span>
          <span>Admin login</span>
          <span className="portal-arrow">›</span>
        </Link>

        <Link className="portal-option" to="/officer/login">
          <span className="portal-icon officer">●</span>
          <span>Officer login</span>
          <span className="portal-arrow">›</span>
        </Link>

        <Link className="portal-option" to="/citizen/login">
          <span className="portal-icon citizen">♣</span>
          <span>Citizen login</span>
          <span className="portal-arrow">›</span>
        </Link>
      </aside>

      <div className="landing-content">
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
          <div className="hero-copy">
            <p className="eyebrow">SMART PUBLIC GRIEVANCE MANAGEMENT SYSTEM</p>
            <h1>
              Report civic issues quickly and
              <span className="hero-break">track resolution in real time.</span>
            </h1>
            <p className="hero-description">Citizens can report water, waste, electricity, and road problems through one simple digital portal.</p>
            <div className="actions">
              <Link className="btn primary" to="/citizen/register">
                <span className="cta-icon">✎</span> Register Complaint
              </Link>
              <Link className="btn secondary" to="/citizen/track">
                <span className="cta-icon">⌕</span> Track Complaint
              </Link>
            </div>
          </div>

          <div className="float-feature feature-water">
            <div className="feature-icon"><FeatureIcon type="water" /></div>
            <div className="feature-text">Better water supply</div>
          </div>

          <div className="float-feature feature-clean">
            <div className="feature-icon"><FeatureIcon type="clean" /></div>
            <div className="feature-text">Cleaner communities</div>
          </div>

          <div className="float-feature feature-electric">
            <div className="feature-icon"><FeatureIcon type="electric" /></div>
            <div className="feature-text">Reliable electricity</div>
          </div>

          <div className="float-feature feature-road">
            <div className="feature-icon"><FeatureIcon type="road" /></div>
            <div className="feature-text">Safer roads</div>
          </div>
        </section>

        <section className="card-grid">
          <div className="card info-card how-card">
            <div className="info-head">
              <span className="info-icon">⚙</span>
              <h3>How it works</h3>
            </div>
            <ol>
              <li><span className="step-num">1</span><span>Citizen reports an issue.</span></li>
              <li><span className="step-num">2</span><span>AI analyses the complaint.</span></li>
              <li><span className="step-num">3</span><span>System identifies the right department and priority.</span></li>
              <li><span className="step-num">4</span><span>Officer is assigned and updates are sent to the citizen.</span></li>
            </ol>
          </div>

          <div className="card info-card dept-card">
            <div className="info-head">
              <span className="info-icon">▥</span>
              <h3>Departments covered</h3>
            </div>
            <ul>
              <li><span className="dept-icon water">◍</span>Water</li>
              <li><span className="dept-icon waste">◍</span>Waste Management</li>
              <li><span className="dept-icon power">◍</span>Electricity</li>
              <li><span className="dept-icon roads">◍</span>Roads</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
