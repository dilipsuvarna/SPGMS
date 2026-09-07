import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, MarkerF } from '@react-google-maps/api';
import { analyzeComplaint, registerComplaint } from '../../services/complaintService';

const mapContainerStyle = { width: '100%', height: '320px', borderRadius: '12px' };
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

function getLatLng(locationData) {
  if (!locationData) return null;
  return {
    lat: typeof locationData.lat === 'function' ? locationData.lat() : locationData.lat,
    lng: typeof locationData.lng === 'function' ? locationData.lng() : locationData.lng
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', age: '', mobile: '', email: '', description: '', address: '', declaration: false });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [location, setLocation] = useState(defaultCenter);
  const [address, setAddress] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const selectLocation = (nextLocation) => {
    if (!nextLocation || !Number.isFinite(nextLocation.lat) || !Number.isFinite(nextLocation.lng)) return;
    setLocation(nextLocation);
    setAddress('Selected location');
    mapRef.current?.panTo(nextLocation);
  };

  const onFileChange = (event) => {
    const incoming = Array.from(event.target.files || []);
    if (files.length + incoming.length > 5) {
      setError('Maximum 5 images allowed.');
      return;
    }
    const valid = incoming.filter(file => ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type));
    if (valid.length !== incoming.length) {
      setError('Only JPG, JPEG, or PNG images are allowed.');
      return;
    }
    const nextFiles = [...files, ...valid];
    setFiles(nextFiles);
    setPreviews(prev => [...prev, ...valid.map(file => ({ name: file.name, preview: URL.createObjectURL(file) }))]);
    setError('');
  };

  const removeImage = (index) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.age || !form.mobile || !form.email || !form.description || !form.declaration) {
      setError('Please fill all required fields and agree to the declaration.');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }
    if (files.length < 3) {
      setError('Please upload at least 3 images.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const aiResult = await analyzeComplaint(form.description);
      setAnalysis(aiResult);
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('age', form.age);
      formData.append('mobile', form.mobile);
      formData.append('email', form.email);
      formData.append('description', form.description);
      formData.append('address', address || form.address);
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      files.forEach((file) => formData.append('images', file));
      const response = await registerComplaint(formData);
      setResult(response);
      setAnalysis(prev => prev ? { ...prev, department: response.department || prev.department, priority: response.priority || prev.priority } : prev);
      navigate('/citizen', { state: { registration: response } });
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h2>Register a Complaint</h2>
        <p className="subtle">Please provide the details of the civic issue. The system will automatically determine the department and priority using AI.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="row">
            <label>Full Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Age<input type="number" min="1" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} required /></label>
          </div>
          <div className="row">
            <label>Mobile Number<input type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} required /></label>
            <label>Email Address<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          </div>

          <label>Complaint Description *</label>
          <textarea rows="7" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail" required />

          <label>Upload images (minimum 3, maximum 5)</label>
          <input type="file" multiple accept="image/png,image/jpeg,image/jpg" onChange={onFileChange} />
          {previews.length > 0 && <div className="preview-row">{previews.map((img, index) => <div key={img.name} className="preview-card"><img src={img.preview} alt={img.name} /><button type="button" onClick={() => removeImage(index)}>Remove</button></div>)}</div>}

          <label>Issue Location</label>
          <p className="subtle">Mark the exact location where the issue is occurring.</p>
          {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
              <div className="map-box">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={location}
                  zoom={13}
                  onLoad={(map) => { mapRef.current = map; }}
                  onUnmount={() => { mapRef.current = null; }}
                  onClick={(event) => selectLocation(getLatLng(event.latLng))}
                >
                  <MarkerF
                    position={location}
                    title="Complaint location"
                    label={{ text: 'Issue', color: '#ffffff', fontWeight: '700' }}
                    clickable
                    draggable
                    zIndex={1000}
                    onClick={() => setAddress('Selected location')}
                    onDragEnd={(event) => selectLocation(getLatLng(event.latLng))}
                  />
                </GoogleMap>
              </div>
            </LoadScript>
          ) : (
            <div className="map-box map-fallback">Google Maps API key is not configured.</div>
          )}
          <p className="subtle">Click the map or drag the <strong>Issue</strong> marker to the exact location.</p>
          <p className="subtle">Selected location: {address || 'Please select a location on the map.'}</p>

          <div className="checkbox-row">
            <input type="checkbox" checked={form.declaration} onChange={e => setForm({ ...form, declaration: e.target.checked })} />
            <span>I confirm the information provided is true to the best of my knowledge.</span>
          </div>

          {analysis && <div className="analysis-box"><h3>AI Analysis</h3><p>Department: <strong>{analysis.department}</strong></p><p>Priority: <strong>{analysis.priority}</strong></p></div>}
          {error && <div className="error-box">{error}</div>}
          {result && <div className="success-box"><h3>Complaint Registered Successfully</h3><p>Complaint ID: {result.complaint_id}</p><p>Status: {result.status}</p>{result.duplicate ? <p>Similar complaint already exists.</p> : null}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Complaint'}</button>
        </form>
      </section>
    </main>
  );
}
