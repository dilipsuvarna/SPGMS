import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getComplaints } from '../services/adminService';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getComplaints().then((data) => setComplaints(data.complaints || [])).catch(() => navigate('/login'));
  }, [navigate]);

  const filtered = useMemo(() => complaints.filter((item) => !search || (item.complaint_id || '').toLowerCase().includes(search.toLowerCase()) || (item.department || '').toLowerCase().includes(search.toLowerCase())), [complaints, search]);

  return (
    <main className="page">
      <section className="card">
        <div className="row-between">
          <div>
            <div className="eyebrow">Complaint Management</div>
            <h2>All Complaints</h2>
          </div>
          <Link className="btn secondary" to="/dashboard">Back</Link>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by complaint ID or department" />
        <div className="list-stack">
          {filtered.map((item) => (
            <article key={item._id} className="complaint-card">
              <div>
                <h3>{item.complaint_id}</h3>
                <p className="subtle">{item.department} • {item.priority} • {item.status}</p>
                <p>{item.description}</p>
              </div>
              <div className="meta-block">
                <p><strong>Citizen:</strong> {item.name}</p>
                <p><strong>Location:</strong> {item.address || 'N/A'}</p>
                <Link className="btn secondary" to={`/complaints/${item.complaint_id}`}>Review</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
