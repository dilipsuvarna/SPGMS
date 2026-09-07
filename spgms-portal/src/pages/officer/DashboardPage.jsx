import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAssignedComplaints, getStoredOfficer, logoutOfficer } from '../../services/officerService';

const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];

export default function DashboardPage() {
  const [complaints, setComplaints] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const officer = getStoredOfficer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!officer?.id) {
      navigate('/officer/login');
      return;
    }
    getAssignedComplaints(officer.id).then(setComplaints).catch(() => setComplaints([]));
  }, [navigate, officer]);

  const summary = useMemo(() => {
    const counts = { total: complaints.length, critical: 0, high: 0, medium: 0, low: 0, registered: 0, assigned: 0, workStarted: 0, inProgress: 0, resolved: 0, closed: 0 };
    complaints.forEach((item) => {
      counts.total += 0;
      if (item.priority === 'Critical') counts.critical += 1;
      if (item.priority === 'High') counts.high += 1;
      if (item.priority === 'Medium') counts.medium += 1;
      if (item.priority === 'Low') counts.low += 1;
      if (item.status === 'Registered') counts.registered += 1;
      if (item.status === 'Assigned') counts.assigned += 1;
      if (item.status === 'Work Started') counts.workStarted += 1;
      if (['Work In Progress', 'In Progress'].includes(item.status)) counts.inProgress += 1;
      if (item.status === 'Resolved') counts.resolved += 1;
      if (item.status === 'Closed') counts.closed += 1;
    });
    return counts;
  }, [complaints]);

  const filtered = useMemo(() => complaints.filter((item) => {
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    const matchesSearch = !search || (item.complaint_id || '').toLowerCase().includes(search.toLowerCase()) || (item.department || '').toLowerCase().includes(search.toLowerCase());
    return matchesPriority && matchesStatus && matchesSearch;
  }), [complaints, filterPriority, filterStatus, search]);

  return (
    <main className="page">
      <section className="hero-card officer-hero">
        <div>
          <div className="eyebrow">Officer Portal</div>
          <h1>{officer?.name || 'Officer'} • {officer?.department || 'Department'}</h1>
          <p className="subtle">Review complaints assigned to your department and update progress.</p>
        </div>
        <div className="right-actions">
          <button className="btn" onClick={() => { logoutOfficer(); navigate('/'); }}>Logout</button>
        </div>
      </section>

      <section className="card-grid stats-grid">
        <article className="stat-card"><h3>{summary.total}</h3><p>Total Complaints</p></article>
        <article className="stat-card"><h3>{summary.critical}</h3><p>Critical</p></article>
        <article className="stat-card"><h3>{summary.high}</h3><p>High</p></article>
        <article className="stat-card"><h3>{summary.medium}</h3><p>Medium</p></article>
        <article className="stat-card"><h3>{summary.low}</h3><p>Low</p></article>
        <article className="stat-card"><h3>{summary.registered}</h3><p>Registered</p></article>
        <article className="stat-card"><h3>{summary.assigned}</h3><p>Assigned</p></article>
        <article className="stat-card"><h3>{summary.workStarted}</h3><p>Work Started</p></article>
        <article className="stat-card"><h3>{summary.inProgress}</h3><p>Work In Progress</p></article>
        <article className="stat-card"><h3>{summary.resolved}</h3><p>Resolved</p></article>
        <article className="stat-card"><h3>{summary.closed}</h3><p>Closed</p></article>
      </section>

      <section className="card">
        <div className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Complaint ID" />
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All priorities</option>
            {priorityOrder.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Registered">Registered</option>
            <option value="Assigned">Assigned</option>
            <option value="Work Started">Work Started</option>
            <option value="Work In Progress">Work In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="list-stack">
          {filtered.map((item) => (
            <article key={item._id} className="complaint-card">
              <div>
                <div className="row-between">
                  <h3>{item.complaint_id}</h3>
                  <span className={`priority-badge ${String(item.priority || '').toLowerCase()}`}>{item.priority}</span>
                </div>
                <p className="subtle">{item.department} • {item.status}</p>
                <p>{item.description}</p>
              </div>
              <div className="meta-block">
                <p><strong>Location:</strong> {item.address || 'Location provided'}</p>
                <p><strong>Affected Citizens:</strong> {item.affected_citizens || 1}</p>
                <p><strong>Registered:</strong> {new Date(item.created_at).toLocaleString()}</p>
                <Link className="btn secondary" to={`/officer/complaints/${item.complaint_id}`}>Open</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}



