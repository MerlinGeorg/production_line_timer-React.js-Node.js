import { useState, useEffect, useRef } from 'react';
import './Modal.css';

const TOTAL_SECS = 10 * 60;

export default function TimeExceededModal({ onYes, onNo }) {
  const [secsLeft, setSecsLeft] = useState(TOTAL_SECS);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setSecsLeft((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(intervalRef.current);
  }, []);

  const pct = (secsLeft / TOTAL_SECS) * 100;
  const m   = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const s   = String(secsLeft % 60).padStart(2, '0');

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-box">

        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">Time Exceeded</h2>
        </div>

        <p className="modal-body">
          Allocated build time has elapsed. Do you wish to continue working?
        </p>

        {/* Arc/progress countdown */}
        <div className="modal-countdown">
          
          <div className="countdown-text">
            <span className="countdown-value">{m}:{s}</span>
            <span className="countdown-label">remaining</span>
          </div>
        </div>

        <p className="modal-footnote">
          If no action is taken, the session will be auto-submitted.
        </p>

        <div className="modal-actions">
          <button className="btn btn-danger"  onClick={onNo}>
             No — Finish Now
          </button>
          <button className="btn btn-success" onClick={onYes}>
            Yes — Keep Working
          </button>
        </div>
      </div>
    </div>
  );
}
