import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOfficers } from '../services/adminService';

export default function OfficersPage() {
  const [officers, setOfficers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getOfficers().then((data) => setOfficers(data.officers || [])).catch(() => navigate('/login'));
  }, [navigate]);

  return (
    <main className="page">
      <section className="card">
        <div className="row-between">
          <div>
            <div className="eyebrow">Officer Management</div>
            <h2>Department Officers</h2>
          </div>
          <Link className="btn secondary" to="/dashboard">Back</Link>
        </div>
        <div className="list-stack">
          {officers.map((officer) => (
            <div key={officer._id} className="row-between pill-row">
              <div>
                <strong>{officer.name}</strong>
                <p className="subtle">{officer.email}</p>
              </div>
              <div>{officer.department}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
