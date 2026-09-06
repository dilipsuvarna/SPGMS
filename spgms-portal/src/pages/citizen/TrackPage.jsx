import { useState } from 'react';
import { trackComplaint } from '../../services/complaintService';

function formatExpectedCompletion(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hours = date.getHours();
  const meridiem = hours >= 12 ? 'pm' : 'am';
  const hour = hours % 12 || 12;
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${hour}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${meridiem}`;
}

export default function TrackPage() {
  const [complaintId, setComplaintId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timeline = result?.complaint?.timeline || [];
  const latestUpdate = timeline.reduce((latest, entry) => {
    if (!latest) return entry;
    return new Date(entry.timestamp).getTime() > new Date(latest.timestamp).getTime() ? entry : latest;
  }, null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
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
            <div className="tracking-header">
              <div>
                <div className="eyebrow">Complaint Details</div>
                <h3>Complaint ID: {result.complaint.complaint_id}</h3>
              </div>
              <span className={`priority-badge ${String(result.complaint.priority || '').toLowerCase()}`}>
                {result.complaint.priority}
              </span>
            </div>
            <div className="tracking-summary">
              <p><strong>Department</strong><span>{result.complaint.department}</span></p>
              <p><strong>Affected citizens</strong><span>{result.complaint.affected_citizens || 1}</span></p>
            </div>
            {latestUpdate && (
              <div className="latest-update">
                <div className="latest-update-header">
                  <h4>Latest Update</h4>
                  <span className="status-badge">{latestUpdate.status}</span>
                </div>
                <div className="latest-update-details">
                  <p><strong>Updated</strong><span>{new Date(latestUpdate.timestamp).toLocaleString()}</span></p>
                  <p><strong>Expected completion</strong><span>{formatExpectedCompletion(result.complaint.expected_resolution_date)}</span></p>
                  <p><strong>Remarks</strong><span>{latestUpdate.remarks || 'No remarks.'}</span></p>
                  <p><strong>Updated by</strong><span>{latestUpdate.by || 'system'}</span></p>
                </div>
              </div>
            )}
            <div className="tracking-info">
              <div>
                <h4>Description</h4>
                <p>{result.complaint.description}</p>
              </div>
              <div>
                <h4>Location</h4>
                <p>{result.complaint.address || 'Not provided'}</p>
              </div>
            </div>
            <h4>Complaint Images</h4>
            <div className="preview-row">
              {(result.complaintImages || result.images || []).map(img => <a key={img} href={img} target="_blank" rel="noreferrer"><img src={img} alt="Citizen complaint evidence" className="thumb" /></a>)}
            </div>
            {(result.completionImages || []).length > 0 && <>
              <h4>Completion Images</h4>
              <div className="preview-row">
                {result.completionImages.map(img => <a key={img} href={img} target="_blank" rel="noreferrer"><img src={img} alt="Officer completion evidence" className="thumb" /></a>)}
              </div>
            </>}
          </div>
        )}
      </section>
    </main>
  );
}

