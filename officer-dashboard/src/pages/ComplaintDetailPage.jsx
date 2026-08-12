import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getComplaintDetails, getStoredOfficer, updateComplaintStatus } from '../services/officerService';

export default function ComplaintDetailPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const officer = getStoredOfficer();
  const [complaint, setComplaint] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Work Started');
  const [remarks, setRemarks] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!officer?.id) {
      navigate('/login');
      return;
    }
    getComplaintDetails(complaintId).then((data) => {
      setComplaint(data.complaint);
      setImages(data.images || []);
      setStatus(data.complaint?.status || 'Work Started');
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [complaintId, navigate, officer]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const formData = new FormData();
    formData.append('status', status);
    formData.append('remarks', remarks);
    formData.append('expected_resolution_date', expectedCompletion);
    files.forEach((file) => formData.append('images', file));
    try {
      await updateComplaintStatus(complaintId, formData);
      setMessage('Complaint update saved.');
    } catch (err) {
      setMessage(err.message || 'Unable to update complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const mapSrc = useMemo(() => {
    if (!complaint?.latitude || !complaint?.longitude) return '';
    return `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=14&output=embed`;
  }, [complaint]);

  if (loading) return <main className="page"><section className="card">Loading...</section></main>;
  if (!complaint) return <main className="page"><section className="card">Complaint not found.</section></main>;

  return (
    <main className="page">
      <section className="card">
        <div className="row-between">
          <div>
            <div className="eyebrow">Complaint Details</div>
            <h2>{complaint.complaint_id}</h2>
          </div>
          <Link className="btn secondary" to="/dashboard">Back to Dashboard</Link>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Complaint Summary</h3>
            <p><strong>Department:</strong> {complaint.department}</p>
            <p><strong>Priority:</strong> {complaint.priority}</p>
            <p><strong>Status:</strong> {complaint.status}</p>
            <p><strong>Citizen:</strong> {complaint.name}</p>
            <p><strong>Email:</strong> {complaint.email}</p>
            <p><strong>Mobile:</strong> {complaint.mobile}</p>
            <p><strong>Description:</strong> {complaint.description}</p>
            <p><strong>Affected Citizens:</strong> {complaint.affected_citizens || 1}</p>
          </div>

          <div className="detail-card">
            <h3>Location</h3>
            <p>{complaint.address || 'Address not provided'}</p>
            {mapSrc ? <iframe title="Location" src={mapSrc} className="map-iframe" /> : <p>No coordinates available.</p>}
          </div>
        </div>

        <div className="detail-card">
          <h3>Images</h3>
          <div className="preview-row">
            {images.map((img) => <img key={img} src={img} alt="Complaint evidence" className="thumb" />)}
          </div>
        </div>

        <div className="detail-card">
          <h3>Timeline</h3>
          <div className="timeline-list">
            {(complaint.timeline || []).map((entry, index) => (
              <div key={`${entry.status}-${index}`} className="timeline-item">
                <strong>{entry.status}</strong>
                <p>{new Date(entry.timestamp).toLocaleString()}</p>
                <p>{entry.remarks || 'No remarks.'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-card">
          <h3>Update Status</h3>
          <form onSubmit={onSubmit} className="form-grid">
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Assigned">Assigned</option>
              <option value="Work Started">Work Started</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Expected Completion">Expected Completion</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select></label>
            <label>Expected Completion<input type="datetime-local" value={expectedCompletion} onChange={(e) => setExpectedCompletion(e.target.value)} /></label>
            <label>Remarks<textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="4" /></label>
            <label>Completion images<input type="file" multiple accept="image/png,image/jpeg,image/jpg" onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>
            {message && <div className="success-box">{message}</div>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Submit Update'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
