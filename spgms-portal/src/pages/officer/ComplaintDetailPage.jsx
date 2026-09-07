import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getComplaintDetails, getStoredOfficer, requestComplaintDeletion, updateComplaintStatus } from '../../services/officerService';

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
  const officer = getStoredOfficer();
  const [complaint, setComplaint] = useState(null);
  const [images, setImages] = useState([]);
  const [complaintImages, setComplaintImages] = useState([]);
  const [completionImages, setCompletionImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Work Started');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteFormOpen, setDeleteFormOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  useEffect(() => {
    if (!officer?.id) {
      navigate('/officer/login');
      return;
    }
    getComplaintDetails(complaintId).then((data) => {
      setComplaint(data.complaint);
      setImages(data.images || []);
      setComplaintImages(data.complaintImages || data.images || []);
      setCompletionImages(data.completionImages || []);
      setStatus(data.complaint?.status || 'Work Started');
      setExpectedCompletion(toDateTimeLocal(data.complaint?.expected_resolution_date));
      setRemarks(data.complaint?.officer_remarks || '');
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [complaintId, navigate, officer?.id]);

  const onRequestDeletion = async (event) => {
    event.preventDefault();
    const reason = deleteReason.trim();
    if (!reason) {
      setDeleteMessage('Please enter a reason for the delete request.');
      return;
    }
    setRequestingDeletion(true);
    setDeleteMessage('');
    try {
      await requestComplaintDeletion(complaintId, reason);
      setDeleteFormOpen(false);
      setDeleteMessage('Delete request sent to the administrator.');
      setDeleteReason('');
    } catch (err) {
      setDeleteMessage(err.message || 'Unable to send delete request.');
    } finally {
      setRequestingDeletion(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const form = event.currentTarget;
    const nextStatus = form.elements.namedItem('complaint-status').value;
    const nextExpectedCompletion = form.elements.namedItem('expected-completion').value;
    const nextRemarks = form.elements.namedItem('officer-remarks').value;
    const payload = {
      status: nextStatus,
      expected_resolution_date: nextExpectedCompletion,
      officer_remarks: nextRemarks
    };

    try {
      const response = await updateComplaintStatus(complaintId, payload, files);
      setComplaint((current) => current ? {
        ...current,
        ...(response.complaint || {}),
        status: nextStatus,
        expected_resolution_date: nextExpectedCompletion,
        officer_remarks: nextRemarks || current.officer_remarks
      } : current);
      setStatus(nextStatus);
      setExpectedCompletion(nextExpectedCompletion);
      setRemarks(nextRemarks);
      if (response.complaint?.completion_images) setCompletionImages(response.complaint.completion_images);
      setMessage('Complaint update saved.');
    } catch (err) {
      setMessage(err.message || 'Unable to update complaint');
    } finally {
      setSubmitting(false);
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
            <div className="eyebrow">Complaint Details</div>
            <h2>{complaint.complaint_id}</h2>
          </div>
          <div className="right-actions">
            <button className="btn danger" type="button" onClick={() => { setDeleteFormOpen((current) => !current); setDeleteMessage(''); }}>Request Delete</button>
            <Link className="btn secondary" to="/officer/dashboard">Back to Dashboard</Link>
          </div>
        </div>
        {deleteMessage && <div className={deleteMessage.startsWith('Delete request sent') ? 'success-box' : 'error-box'}>{deleteMessage}</div>}
        {deleteFormOpen && (
          <form onSubmit={onRequestDeletion} className="delete-request-form">
            <label htmlFor="delete-reason">Reason for delete request</label>
            <textarea id="delete-reason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows="3" required placeholder="Explain why this complaint should be deleted" />
            <div className="right-actions">
              <button className="btn secondary" type="button" onClick={() => { setDeleteFormOpen(false); setDeleteMessage(''); }}>Cancel</button>
              <button className="btn danger" type="submit" disabled={requestingDeletion}>{requestingDeletion ? 'Sending...' : 'Send Request'}</button>
            </div>
          </form>
        )}

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Complaint Summary</h3>
            <p><strong>Department:</strong> {complaint.department}</p>
            <p><strong>Priority:</strong> {complaint.priority}</p>
            <p><strong>Status:</strong> {complaint.status}</p>
            <p><strong>Expected completion:</strong> {formatExpectedCompletion(complaint.expected_resolution_date)}</p>
            <p><strong>Citizen:</strong> {complaint.name}</p>
            <p><strong>Email:</strong> {complaint.email}</p>
            <p><strong>Mobile:</strong> {complaint.mobile}</p>
            <p><strong>Description:</strong> {complaint.description}</p>
            <p><strong>Affected Citizens:</strong> {complaint.affected_citizens || 1}</p>
          </div>

          <div className="detail-card">
            <h3>Location</h3>
            <p>{complaint.location?.address || complaint.address || 'Address not provided'}</p>
            <p><strong>Coordinates:</strong> {complaint.location?.latitude ?? complaint.latitude}, {complaint.location?.longitude ?? complaint.longitude}</p>
            {mapSrc ? <iframe title="Location" src={mapSrc} className="map-iframe" /> : <p>No coordinates available.</p>}
          </div>
        </div>

        <div className="detail-card">
          <h3>Complaint Images</h3>
          <div className="preview-row">
            {(complaintImages.length ? complaintImages : images).map((img) => <a key={img} href={img} target="_blank" rel="noreferrer"><img src={img} alt="Citizen complaint evidence" className="thumb" /></a>)}
          </div>
        </div>
        {(completionImages.length > 0 || (complaint.completion_images || []).length > 0) && (
          <div className="detail-card">
            <h3>Completion Images</h3>
            <div className="preview-row">
              {[...new Set([...completionImages, ...(complaint.completion_images || [])])].map((img) => <a key={img} href={img} target="_blank" rel="noreferrer"><img src={img} alt="Officer completion evidence" className="thumb" /></a>)}
            </div>
          </div>
        )}

        <div className="detail-card">
          <h3>Timeline</h3>
          <div className="timeline-list">
            {(complaint.timeline || []).map((entry, index) => (
              <div key={`${entry.status}-${index}`} className="timeline-item">
                <strong>{entry.status}</strong>
                <p>{new Date(entry.timestamp).toLocaleString()}</p>
                <p>{entry.remarks || 'No remarks.'}</p>
                <p className="subtle">Updated by: {entry.by || 'system'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-card">
          <h3>Update Status</h3>
          <form onSubmit={onSubmit} className="form-grid update-form">
            <label htmlFor="complaint-status">Status</label>
            <select id="complaint-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Assigned">Assigned</option>
              <option value="Work Started">Work Started</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Expected Completion">Expected Completion</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <label htmlFor="expected-completion">Expected Completion</label>
            <input id="expected-completion" name="expected-completion" type="datetime-local" value={expectedCompletion} onChange={(e) => setExpectedCompletion(e.target.value)} />
            <label htmlFor="officer-remarks">Remarks</label>
            <textarea id="officer-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="4" />
            <label htmlFor="completion-images">Completion images</label>
            <input id="completion-images" type="file" multiple accept="image/png,image/jpeg,image/jpg" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {message && <div className={message === 'Complaint update saved.' ? 'success-box' : 'error-box'}>{message}</div>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Submit Update'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}


