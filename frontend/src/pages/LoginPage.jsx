import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSession } from '../context/SessionContext.jsx';
import './LoginPage.css';
import { FaArrowLeft } from "react-icons/fa";

export default function LoginPage() {
  const navigate = useNavigate();
  const { startSession } = useSession();

  const [loginId,     setLoginId]     = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [buildInfo,   setBuildInfo]   = useState(null);
  const [error,       setError]       = useState('');
  const [busy,        setBusy]        = useState(false);

  const abortRef = useRef(null);

  // fetch build info and show confirmation
  async function handleFetch(e) {
    e.preventDefault();
    if (!loginId.trim() || !buildNumber.trim()) {
      setError('Both fields are required.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setError('');
    setBuildInfo(null);
    setBusy(true);

    try {
      const data = await api.getBuild(buildNumber.trim(), abortRef.current.signal);
      setBuildInfo(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(
        err.status === 404
          ? `Build "${buildNumber.trim()}" was not found. Check the build number and try again.`
          : 'Unable to reach the server. Make sure the backend is running.'
      );
    } finally {
      setBusy(false);
    }
  }

  // create session and navigate to timer
  async function handleStart() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setError('');
    setBusy(true);

    try {
      const { sessionId, startTime } = await api.createSession(
        {
          loginId:       loginId.trim(),
          buildNumber:   buildInfo.buildNumber,
          numberOfParts: buildInfo.numberOfParts,
          timePerPart:   buildInfo.timePerPart,
        },
        abortRef.current.signal
      );

      startSession({
        sessionId,
        loginId:       loginId.trim(),
        buildNumber:   buildInfo.buildNumber,
        numberOfParts: buildInfo.numberOfParts,
        timePerPart:   buildInfo.timePerPart,
        startTime,
        totalPausedMs: 0,
        defects:       0,
        isPaused:      false,
        pausedAt:      null,
      });

      navigate('/timer');
    } catch (err) {
      if (err.name === 'AbortError') return;

      // 409 = active session already exists → restore it
      if (err.status === 409) {
        // Reload full state from backend
        try {
          const session = await api.getActiveSession(loginId.trim());
          startSession(session);
          navigate('/timer');
          return;
        } catch {
          /* fall through to generic error */
        }
      }
      setError('Failed to start session. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const totalMin = buildInfo ? buildInfo.numberOfParts * buildInfo.timePerPart : null;

  return (
    <div className="login-page">
      <div className="login-panel--form">
        <div className="login-card">
          <h2 className="login-card__title">
            {buildInfo ? 'Confirm Build' : 'Start Session'}
          </h2>

          {!buildInfo ? (
            <form onSubmit={handleFetch} noValidate>
              <div className="field">
                <label htmlFor="loginId" className="field__label">Login ID</label>
                <input
                  id="loginId"
                  className="field__input"
                  type="text"
                  value={loginId}
                  onChange={(e) => { setLoginId(e.target.value); setError(''); }}
                  placeholder="e.g. john.doe"
                  autoComplete="username"
                  autoFocus
                  disabled={busy}
                />
              </div>

              <div className="field">
                <label htmlFor="buildNumber" className="field__label">Build Number</label>
                <input
                  id="buildNumber"
                  className="field__input"
                  type="text"
                  value={buildNumber}
                  onChange={(e) => { setBuildNumber(e.target.value); setError(''); }}
                  placeholder="e.g. BLD-002"
                  disabled={busy}
                />
              </div>

              {error && <p className="alert alert-error">{error}</p>}

              <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
                {busy ? 'Searching…' : 'LOGIN'}
              </button>
            </form>
          ) : (
            <div className="build-confirm">
              <div className="build-confirm__grid">
                {[
                  ['Build Number',    buildInfo.buildNumber],
                  ['Number of Parts', buildInfo.numberOfParts],
                  ['Time / Part',      `${buildInfo.timePerPart} min`],
                ].map(([label, value]) => (
                  <div key={label} className="build-confirm__row">
                    <span className="build-confirm__label">{label}</span>
                    <span className="build-confirm__value">{value}</span>
                  </div>
                ))}
              </div>

              {error && <p className="alert alert-error">{error}</p>}

              <div className="build-confirm__actions">
                <button className="btn btn-ghost" onClick={() => setBuildInfo(null)} disabled={busy}>
                 <FaArrowLeft/> Change
                </button>
                <button className="btn btn-success" onClick={handleStart} disabled={busy}>
                  {busy ? 'Starting…' : 'Start Build'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
