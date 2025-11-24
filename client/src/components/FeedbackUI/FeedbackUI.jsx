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
