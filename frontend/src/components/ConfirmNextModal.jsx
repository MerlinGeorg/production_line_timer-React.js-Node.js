import './Modal.css';
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";

export default function ConfirmNextModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-box">

        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">Finish Build?</h2>
        </div>

        <p className="modal-body">
          You'll be taken to the submission page to record parts completed.
          The timer will continue running until you submit.
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost"   onClick={onCancel}>
            <FaArrowLeft /> Stay on Timer
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Proceed <FaArrowRight/>
          </button>
        </div>
      </div>
    </div>
  );
}
