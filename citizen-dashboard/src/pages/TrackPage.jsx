import { useState } from 'react';
import { trackComplaint } from '../services/complaintService';

export default function TrackPage() {
  const [complaintId, setComplaintId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await trackComplaint(complaintId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unable to fetch complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h2>Track Complaint</h2>
        <form onSubmit={onSubmit} className="inline-form">
          <input value={complaintId} onChange={e => setComplaintId(e.target.value)} placeholder="Enter Complaint ID" required />
          <button type="submit" className="btn primary">Track</button>
        </form>
        {error && <div className="error-box">{error}</div>}
        {result?.complaint && (
          <div className="detail-card">
            <h3>Complaint ID: {result.complaint.complaint_id}</h3>
            <p><strong>Department:</strong> {result.complaint.department}</p>
            <p><strong>Priority:</strong> {result.complaint.priority}</p>
            <p><strong>Status:</strong> {result.complaint.status}</p>
            <p><strong>Description:</strong> {result.complaint.description}</p>
            <p><strong>Location:</strong> {result.complaint.address}</p>
            <div className="preview-row">
              {result.images?.map(img => <img key={img} src={img} alt="Complaint" className="thumb" />)}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
