import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getOfficers, reviewDeleteRequest } from '../services/adminService';

export default function OfficerManagePage() {
  const { officerId } = useParams();
  const navigate = useNavigate();
  const [officer, setOfficer] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfficers().then((data) => {
      const found = (data.officers || []).find((item) => item._id === officerId);
      setOfficer(found || null);
      setLoading(false);
    }).catch(() => navigate('/login'));
  }, [officerId, navigate]);

  const onReviewRequest = async (request, action) => {
    try {
      await reviewDeleteRequest(request._id, action);
      setOfficer((current) => current ? {
        ...current,
        delete_requests: (current.delete_requests || []).filter((item) => item._id !== request._id)
      } : current);
      setMessage(action === 'accept' ? `Complaint ${request.complaint_id} deleted.` : `Delete request for ${request.complaint_id} rejected.`);
    } catch (err) {
      setMessage(err.message || 'Unable to review delete request.');
    }
  };

  if (loading) return <main className="page"><section className="card">Loading...</section></main>;
  if (!officer) return <main className="page"><section className="card">Officer not found.</section></main>;

  const requests = officer.delete_requests || [];
  return (
    <main className="page">
      <section className="card">
        <div className="row-between">
          <div>
            <div className="eyebrow">Officer Management</div>
            <h2>{officer.name}</h2>
            <p className="subtle">{officer.email} • {officer.department}</p>
          </div>
          <Link className="btn secondary" to="/officers">Back to Officers</Link>
        </div>
        {message && <div className="success-box">{message}</div>}
        <div className="delete-requests manage-page">
          <h3>Delete Requests</h3>
          {requests.length === 0 ? (
            <p className="subtle">No requests made.</p>
          ) : requests.map((request) => (
            <div key={request._id} className="delete-request-card">
              <p><strong>Complaint:</strong> {request.complaint_id}</p>
              <p><strong>Reason:</strong> {request.reason}</p>
              <p className="subtle"><strong>Requested:</strong> {new Date(request.created_at).toLocaleString()}</p>
              <div className="right-actions">
                <button className="btn danger" type="button" onClick={() => onReviewRequest(request, 'accept')}>Accept &amp; Delete</button>
                <button className="btn secondary" type="button" onClick={() => onReviewRequest(request, 'reject')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
