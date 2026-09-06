import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteComplaint, getComplaints } from '../services/adminService';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getComplaints().then((data) => setComplaints(data.complaints || [])).catch(() => navigate('/login'));
  }, [navigate]);

  const filtered = useMemo(() => complaints.filter((item) => !search || (item.complaint_id || '').toLowerCase().includes(search.toLowerCase()) || (item.department || '').toLowerCase().includes(search.toLowerCase())), [complaints, search]);

  const onDelete = async (complaint) => {
    if (!window.confirm(`Delete complaint ${complaint.complaint_id}? This action cannot be undone.`)) return;
    setDeletingId(complaint.complaint_id);
    setMessage('');
    try {
      await deleteComplaint(complaint.complaint_id);
      setComplaints((current) => current.filter((item) => item.complaint_id !== complaint.complaint_id));
      setMessage(`Complaint ${complaint.complaint_id} deleted.`);
    } catch (err) {
      setMessage(err.message || 'Unable to delete complaint.');
    } finally {
      setDeletingId('');
    }
  };

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
        {message && <div className={message.endsWith('deleted.') ? 'success-box' : 'error-box'}>{message}</div>}
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
                <div className="right-actions">
                  <Link className="btn secondary" to={`/complaints/${item.complaint_id}`}>Review</Link>
                  <button className="btn danger" type="button" onClick={() => onDelete(item)} disabled={deletingId === item.complaint_id}>
                    {deletingId === item.complaint_id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
