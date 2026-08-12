import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getComplaints, overrideComplaint } from '../services/adminService';

export default function ComplaintDetailPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getComplaints().then((data) => {
      const found = (data.complaints || []).find((item) => item.complaint_id === complaintId);
      if (found) {
        setComplaint(found);
        setDepartment(found.department || '');
        setPriority(found.priority || '');
        setStatus(found.status || '');
      }
      setLoading(false);
    }).catch(() => navigate('/login'));
  }, [complaintId, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await overrideComplaint(complaintId, { department, priority, status });
      setMessage('Complaint updated successfully.');
    } catch (err) {
      setMessage(err.message || 'Unable to update complaint');
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
            <div className="eyebrow">Admin Review</div>
            <h2>{complaint.complaint_id}</h2>
          </div>
          <Link className="btn secondary" to="/complaints">Back</Link>
        </div>
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Complaint</h3>
            <p><strong>Citizen:</strong> {complaint.name}</p>
            <p><strong>Department:</strong> {complaint.department}</p>
            <p><strong>Priority:</strong> {complaint.priority}</p>
            <p><strong>Status:</strong> {complaint.status}</p>
            <p><strong>Description:</strong> {complaint.description}</p>
            <p><strong>AI Department:</strong> {complaint.ai_department || 'N/A'}</p>
            <p><strong>AI Priority:</strong> {complaint.ai_priority || 'N/A'}</p>
            <p><strong>Keywords:</strong> {(complaint.ai_keywords || []).join(', ')}</p>
          </div>
          <div className="detail-card">
            <h3>Location</h3>
            <p>{complaint.address || 'Address not provided'}</p>
            {mapSrc ? <iframe title="Location" src={mapSrc} className="map-iframe" /> : <p>No coordinates available.</p>}
          </div>
        </div>

        <div className="detail-card">
          <h3>Override AI Determination</h3>
          <form onSubmit={onSubmit} className="form-grid">
            <label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="Water">Water</option>
              <option value="Waste">Waste</option>
              <option value="Electricity">Electricity</option>
              <option value="Road">Road</option>
            </select></label>
            <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select></label>
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Registered">Registered</option>
              <option value="Assigned">Assigned</option>
              <option value="Work Started">Work Started</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select></label>
            {message && <div className="success-box">{message}</div>}
            <button className="btn primary" type="submit">Save Override</button>
          </form>
        </div>
      </section>
    </main>
  );
}
