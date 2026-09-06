import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboard, logoutAdmin } from '../../services/adminService';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard().then(setData).catch(() => navigate('/admin/login'));
  }, [navigate]);

  return (
    <main className="page">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Admin Portal</div>
          <h1>SPGMS Overview</h1>
          <p className="subtle">Monitor complaints, AI decisions, and officer workload.</p>
        </div>
        <button className="btn" onClick={() => { logoutAdmin(); navigate('/admin/login'); }}>Logout</button>
      </section>
      {!data ? <section className="card">Loading...</section> : (
        <>
          <section className="card-grid stats-grid">
            <article className="stat-card"><h3>{data.counts.total}</h3><p>Total Complaints</p></article>
            <article className="stat-card"><h3>{data.counts.registered}</h3><p>Registered</p></article>
            <article className="stat-card"><h3>{data.counts.assigned}</h3><p>Assigned</p></article>
            <article className="stat-card"><h3>{data.counts.workStarted}</h3><p>Work Started</p></article>
            <article className="stat-card"><h3>{data.counts.inProgress}</h3><p>Work In Progress</p></article>
            <article className="stat-card"><h3>{data.counts.resolved}</h3><p>Resolved</p></article>
            <article className="stat-card"><h3>{data.counts.closed}</h3><p>Closed</p></article>
            <article className="stat-card"><h3>{data.counts.critical}</h3><p>Critical</p></article>
            <article className="stat-card"><h3>{data.counts.high}</h3><p>High</p></article>
            <article className="stat-card"><h3>{data.counts.medium}</h3><p>Medium</p></article>
            <article className="stat-card"><h3>{data.counts.low}</h3><p>Low</p></article>
          </section>

          <section className="card">
            <h3>Department Breakdown</h3>
            <div className="list-stack">
              {Object.entries(data.byDepartment || {}).map(([department, count]) => (
                <div key={department} className="row-between pill-row"><span>{department}</span><strong>{count}</strong></div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="row-between">
              <h3>Officers</h3>
              <Link className="btn secondary" to="/admin/officers">Manage Officers</Link>
            </div>
            <div className="list-stack">
              {(data.officers || []).slice(0, 6).map((officer) => (
                <div key={officer._id} className="row-between pill-row">
                  <span>{officer.name} • {officer.department}</span>
                  <span>{officer.email}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="row-between">
              <h3>Complaints</h3>
              <Link className="btn secondary" to="/admin/complaints">View All</Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}


