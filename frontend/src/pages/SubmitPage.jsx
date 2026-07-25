import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../api/client.js';
import { formatMs } from '../hooks/useTimer.js';
import InfoBar from '../components/InfoBar.jsx';
import './SubmitPage.css';
import { FaArrowLeft } from "react-icons/fa";

export default function SubmitPage() {
  const navigate = useNavigate();
  const { session, clearSession } = useSession();

  const [totalParts, setTotalParts] = useState('');
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState('');

  if (!session) { navigate('/', { replace: true }); return null; }

  const allocatedMs = session.numberOfParts * session.timePerPart * 60_000;

  async function handleSubmit() {
    const n = parseInt(totalParts, 10);
    if (!totalParts || isNaN(n) || n < 0) {
      setError('Please enter a valid number of parts (0 or more).');
      return;
    }
    setError('');
    setBusy(true);

    try {
      await api.submit(session.sessionId, {
        totalParts: n,
        defects: session.defects,
        autoSubmitted: false,
      });
      clearSession();
      navigate('/', { replace: true });
    } catch {
      setError('Submission failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="submit-page">
      <InfoBar session={session} />

      <main className="submit-main">
        <div className="submit-card">
          {/* Header */}
          <div className="submit-card__header">
            
            <div>
              <h1 className="submit-card__title">Final Submission</h1>
              <p className="submit-card__sub">Review your session and enter parts completed.</p>
            </div>
          </div>

          {/* Summary */}
          <div className="summary">
            <h2 className="summary__heading">Session Summary</h2>
            <div className="summary__grid">
              {[
                ['Login Id',         session.loginId],
                ['Build Number',     session.buildNumber],
                ['Allocated Time',   formatMs(allocatedMs)],
                ['Parts Scheduled',  session.numberOfParts],
                ['Defects Recorded', session.defects],
              ].map(([label, value]) => (
                <div key={label} className="summary__row">
                  <span className="summary__label">{label}</span>
                  <span className="summary__value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parts entry */}
          <div className="parts-entry">
            <label htmlFor="totalParts" className="parts-entry__label">
              Total Parts Completed
            </label>
            <input
              id="totalParts"
              className="parts-entry__input"
              type="number"
              min="0"
              value={totalParts}
              onChange={(e) => { setTotalParts(e.target.value); setError(''); }}
              placeholder="Enter count…"
              autoFocus
              disabled={busy}
            />
            {error && <p className="alert alert-error">{error}</p>}
          </div>

          {/* Actions */}
          <div className="submit-actions">
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/timer')}
              disabled={busy}
            >
              <FaArrowLeft/> Back to Timer
            </button>
            <button
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? 'Submitting…' : 'Submit Session'}
            </button> 
          </div>
        </div>
      </main>
    </div>
  );
}
