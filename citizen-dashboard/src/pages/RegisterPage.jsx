import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { analyzeComplaint, registerComplaint } from '../services/complaintService';

const mapContainerStyle = { width: '100%', height: '320px', borderRadius: '12px' };
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

function buildAddressString(result) {
  return result?.formatted_address || 'Selected location';
}

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
  const [status, setStatus] = useState('Ready');
  const [isListening, setIsListening] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Voice input is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setStatus('Listening');
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(res => res[0].transcript).join(' ');
      setForm(prev => ({ ...prev, description: prev.description ? `${prev.description} ${transcript}`.trim() : transcript }));
      setStatus('Processing');
    };
    recognition.onerror = () => setStatus('Error');
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const startVoice = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available in this browser.');
      return;
    }
    setIsListening(true);
    setStatus('Listening');
    recognitionRef.current.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setStatus('Ready');
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
      navigate('/', { state: { registration: response } });
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const mapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapLibraries = useMemo(() => ['places'], []);
  const selectLocation = (nextLocation, nextAddress = 'Selected location') => {
    if (!nextLocation || !Number.isFinite(nextLocation.lat) || !Number.isFinite(nextLocation.lng)) return;
    setLocation(nextLocation);
    setAddress(nextAddress);
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
          <div className="voice-toolbar">
            <button type="button" className="btn secondary" onClick={startVoice}>🎤 Start Voice Input</button>
            <button type="button" className="btn" onClick={stopVoice}>Stop Voice Input</button>
            <span className={`pill ${isListening ? 'listening' : ''}`}>Status: {status}</span>
          </div>

          <label>Upload images (minimum 3, maximum 5)</label>
          <input type="file" multiple accept="image/png,image/jpeg,image/jpg" onChange={onFileChange} />
          {previews.length > 0 && <div className="preview-row">{previews.map((img, index) => <div key={img.name} className="preview-card"><img src={img.preview} alt={img.name} /><button type="button" onClick={() => removeImage(index)}>Remove</button></div>)}</div>}

          <label>Issue Location</label>
          <p className="subtle">Mark the exact location where the issue is occurring.</p>
          {mapApiKey ? (
            <LoadScript googleMapsApiKey={mapApiKey} libraries={mapLibraries}>
              <div className="map-box">
                <Autocomplete onLoad={(ac) => (autocompleteRef.current = ac)} onPlaceChanged={() => {
                  const place = autocompleteRef.current.getPlace();
                  selectLocation(getLatLng(place.geometry?.location), buildAddressString(place));
                }}>
                  <input className="search-box" placeholder="Search for a place" />
                </Autocomplete>
                <GoogleMap mapContainerStyle={mapContainerStyle} center={location} zoom={13} onClick={(e) => {
                  selectLocation(getLatLng(e.latLng));
                }}>
                  <Marker
                    position={location}
                    title="Complaint location"
                    clickable
                    draggable
                    onClick={() => setAddress('Selected location')}
                    onDragEnd={(e) => selectLocation(getLatLng(e.latLng))}
                  />
                </GoogleMap>
              </div>
            </LoadScript>
          ) : (
            <div className="map-box">Google Maps API key is not configured. The form will still submit with the selected coordinates if you provide them manually.</div>
          )}
          <p className="subtle">Selected location: {address || 'Please select a location on the map.'}</p>

          <label className="checkbox-row"><input type="checkbox" checked={form.declaration} onChange={e => setForm({ ...form, declaration: e.target.checked })} /> I confirm the information provided is true to the best of my knowledge.</label>

          {analysis && <div className="analysis-box"><h3>AI Analysis</h3><p>Department: <strong>{analysis.department}</strong></p><p>Priority: <strong>{analysis.priority}</strong></p></div>}
          {error && <div className="error-box">{error}</div>}
          {result && <div className="success-box"><h3>Complaint Registered Successfully</h3><p>Complaint ID: {result.complaint_id}</p><p>Status: {result.status}</p>{result.duplicate ? <p>Similar complaint already exists.</p> : null}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Complaint'}</button>
        </form>
      </section>
    </main>
  );
}
