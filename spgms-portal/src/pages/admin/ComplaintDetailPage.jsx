import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteComplaint, getComplaints, overrideComplaint } from '../../services/adminService';

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

export default function ComplaintDetailPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getComplaints().then((data) => {
      const found = (data.complaints || []).find((item) => item.complaint_id === complaintId);
      if (found) {
        setComplaint(found);
        setDepartment(found.department || '');
        setPriority(found.priority || '');
        setStatus(found.status || '');
        setExpectedCompletion(toDateTimeLocal(found.expected_resolution_date));
        setRemarks(found.officer_remarks || '');
      }
      setLoading(false);
    }).catch(() => navigate('/admin/login'));
  }, [complaintId, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const response = await overrideComplaint(complaintId, { department, priority, status, expected_resolution_date: expectedCompletion, officer_remarks: remarks });
      const updatedComplaint = response.complaint || { ...complaint, department, priority, status, expected_resolution_date: expectedCompletion, officer_remarks: remarks };
      setComplaint(updatedComplaint);
      if (updatedComplaint.complaint_id && updatedComplaint.complaint_id !== complaintId) {
        navigate(`/admin/complaints/${updatedComplaint.complaint_id}`, { replace: true });
      }
      setMessage(response.transferred
        ? `Complaint transferred: ${response.previous_complaint_id} -> ${updatedComplaint.complaint_id} (${updatedComplaint.department}).`
        : 'Complaint updated successfully.');
    } catch (err) {
      setMessage(err.message || 'Unable to update complaint');
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete complaint ${complaint.complaint_id}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteComplaint(complaint.complaint_id);
      navigate('/admin/complaints');
    } catch (err) {
      setMessage(err.message || 'Unable to delete complaint.');
      setDeleting(false);
    }
  };

  const mapSrc = useMemo(() => {
    const location = complaint?.location || complaint;
    if (location?.latitude == null || location?.longitude == null) return '';
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=14&output=embed`;
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
          <div className="right-actions">
            <Link className="btn secondary" to="/admin/complaints">Back</Link>
            <button className="btn danger" type="button" onClick={onDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete Complaint'}</button>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Complaint</h3>
            <p><strong>Citizen:</strong> {complaint.name}</p>
            <p><strong>Department:</strong> {complaint.department}</p>
            <p><strong>Assigned officer:</strong> {complaint.assignedOfficerName || 'Assigned automatically'}</p>
            <p><strong>Priority:</strong> {complaint.priority}</p>
            <p><strong>Status:</strong> {complaint.status}</p>
            <p><strong>Description:</strong> {complaint.description}</p>
            <p><strong>Original AI department:</strong> {complaint.ai_department || 'N/A'}</p>
            <p><strong>AI Priority:</strong> {complaint.ai_priority || 'N/A'}</p>
            <p><strong>Keywords:</strong> {(complaint.ai_keywords || []).join(', ')}</p>
            <p><strong>Expected completion:</strong> {formatExpectedCompletion(complaint.expected_resolution_date)}</p>
            <p><strong>Officer remarks:</strong> {complaint.officer_remarks || 'Not provided'}</p>
          </div>
          <div className="detail-card">
            <h3>Location</h3>
            <p>{complaint.location?.address || complaint.address || 'Address not provided'}</p>
            <p><strong>Coordinates:</strong> {complaint.location?.latitude ?? complaint.latitude}, {complaint.location?.longitude ?? complaint.longitude}</p>
            {mapSrc ? <iframe title="Location" src={mapSrc} className="map-iframe" /> : <p>No coordinates available.</p>}
          </div>
        </div>

        {(complaint.complaint_images || []).length > 0 && (
          <div className="detail-card">
            <h3>Complaint Images</h3>
            <div className="preview-row">
              {complaint.complaint_images.map((image) => (
                <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="Citizen complaint evidence" className="thumb" /></a>
              ))}
            </div>
          </div>
        )}
        {(complaint.completion_images || []).length > 0 && (
          <div className="detail-card">
            <h3>Completion Images</h3>
            <div className="preview-row">
              {complaint.completion_images.map((image) => (
                <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="Officer completion evidence" className="thumb" /></a>
              ))}
            </div>
          </div>
        )}

        <div className="detail-card">
          <h3>Timeline</h3>
          <div className="timeline-list">
            {(complaint.timeline || []).map((entry, index) => (
              <div key={`${entry.status}-${entry.timestamp}-${index}`} className="timeline-item">
                <strong>{entry.status}</strong>
                <p>{new Date(entry.timestamp).toLocaleString()}</p>
                <p>{entry.remarks || 'No remarks.'}</p>
                <p className="subtle">Updated by: {entry.by || 'system'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-card">
          <h3>Override Department Assignment</h3>
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
              <option value="Assigned">Assigned</option>
              <option value="Work Started">Work Started</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Expected Completion">Expected Completion</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select></label>
            <label>Expected Completion<input type="datetime-local" value={expectedCompletion} onChange={(e) => setExpectedCompletion(e.target.value)} /></label>
            <label>Officer Remarks<textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="4" /></label>
            {message && <div className="success-box">{message}</div>}
            <button className="btn primary" type="submit">Save Override</button>
          </form>
        </div>
      </section>
    </main>
  );
}



