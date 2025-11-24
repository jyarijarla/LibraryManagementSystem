import React from 'react';
import './FeedbackUI.css';

// Loading Overlay Component
export const LoadingOverlay = ({ isLoading, message = "Loading..." }) => {
  if (!isLoading) return null;
  
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

// Success Popup Component
export const SuccessPopup = ({ message, onClose }) => {
  if (!message) return null;
  
  // Auto-hide after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  
  return (
    <div className="popup-overlay">
      <div className="popup-content success-popup">
        <div className="popup-icon">✓</div>
        <p className="popup-message">{message}</p>
      </div>
    </div>
  );
};

// Error Popup Component
export const ErrorPopup = ({ errorMessage, onClose }) => {
  const [visible, setVisible] = React.useState(Boolean(errorMessage));
  const [dismissedFor, setDismissedFor] = React.useState(null);

  React.useEffect(() => {
    // If the incoming errorMessage matches the message we've dismissed, keep it hidden.
    if (errorMessage && errorMessage === dismissedFor) {
      setVisible(false);
      return;
    }
    setVisible(Boolean(errorMessage));
    // Clear dismissed marker when a new/different message arrives
    if (errorMessage && errorMessage !== dismissedFor) setDismissedFor(null);
  }, [errorMessage, dismissedFor]);

  // Auto-hide after 5 seconds. If `onClose` is provided call it, otherwise hide locally.
  React.useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      if (onClose) onClose();
      else {
        setVisible(false);
        setDismissedFor(errorMessage);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible || !errorMessage) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else {
      setVisible(false);
      setDismissedFor(errorMessage);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content error-popup">
        <button className="popup-close" onClick={handleClose} aria-label="Close error">✕</button>
        <div className="popup-icon">⚠️</div>
        <p className="popup-message">{errorMessage}</p>
      </div>
    </div>
  );
};

// Enhanced Delete Blocked Modal
export const DeleteBlockedModal = ({ open, blockers = [], currentBorrowCount = null, totalBorrowCount = null, onClose, onViewUser }) => {
  if (!open) return null;

  const borrowBlock = (blockers || []).find(b => b.type === 'borrows');
  const finesBlock = (blockers || []).find(b => b.type === 'fines');

  const formattedFines = (f) => {
    if (!f) return '$0.00';
    const v = parseFloat(f.totalAmount ?? f.total ?? 0) || 0;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div className="blocked-modal-overlay" onClick={onClose}>
      <div className="blocked-modal-content nice" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="blocked-modal-header">
          <div className="blocked-modal-icon" aria-hidden>🚫</div>
          <div>
            <h3 className="blocked-modal-title">Cannot Delete Member</h3>
            <div className="blocked-modal-sub">The account has activity that prevents deletion.</div>
          </div>
        </div>

        <div className="blocked-modal-body">
          <div className="blocked-stat-grid">
            <div className="blocked-card">
              <div className="card-label">Currently Borrowed</div>
              <div className="card-value">{currentBorrowCount ?? (borrowBlock ? borrowBlock.count : 0)}</div>
            </div>

            <div className="blocked-card">
              <div className="card-label">Borrowing History</div>
              <div className="card-value">{totalBorrowCount !== null ? totalBorrowCount : '-'}</div>
            </div>

            <div className="blocked-card blocked-fines">
              <div className="card-label">Outstanding Fines</div>
              <div className="card-value">{finesBlock ? formattedFines(finesBlock) : '$0.00'}</div>
            </div>
          </div>

          {(!borrowBlock && !finesBlock && currentBorrowCount === null && totalBorrowCount === null) && (
            <div className="blocked-note">No specific details were provided by the server.</div>
          )}
        </div>

        <div className="blocked-modal-actions">
          {onViewUser && <button className="blocked-btn ghost" onClick={onViewUser}>View User</button>}
          <button className="blocked-btn primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};


