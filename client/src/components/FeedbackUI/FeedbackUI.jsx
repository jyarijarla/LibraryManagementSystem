import React from 'react';
import './FeedbackUI.css';

// Loading Overlay Component
export const LoadingOverlay = ({ isLoading, message = 'Loading...' }) => {
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
  if (!errorMessage) return null;
  
  // Auto-hide after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMessage, onClose]);
  
  return (
    <div className="popup-overlay">
      <div className="popup-content error-popup">
        <div className="popup-icon">✕</div>
        <p className="popup-message">{errorMessage}</p>
      </div>
    </div>
  );
};
