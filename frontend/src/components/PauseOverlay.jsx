import './PauseOverlay.css';

export default function PauseOverlay({ onResume }) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Session paused">
      <div className="pause-overlay__inner">
        
        <p className="pause-overlay__title">Session Paused</p>
        <p className="pause-overlay__sub">Paused time is excluded from your build total.</p>
        <button className="btn btn-amber btn-lg" onClick={onResume}>
           Resume Session
        </button>
      </div>
    </div>
  );
}
