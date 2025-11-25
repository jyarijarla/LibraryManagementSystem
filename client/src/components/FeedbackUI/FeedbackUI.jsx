import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';

// Loading Overlay Component
export const LoadingOverlay = ({ isLoading, message = "Loading..." }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4"
      >
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-gray-700 font-medium">{message}</p>
      </motion.div>
    </div>
  );
};

// Toast Notification Component (Base)
const Toast = ({ message, type, onClose, icon: Icon }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[10000] pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[320px] max-w-md ${type === 'success'
                ? 'bg-green-50/90 border-green-200 text-green-800'
                : 'bg-red-50/90 border-red-200 text-red-800'
              }`}
          >
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Icon className={`w-5 h-5 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
              onClick={onClose}
              className={`p-1 rounded-full transition-colors ${type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Success Popup Component
export const SuccessPopup = ({ message, onClose }) => {
  return <Toast message={message} type="success" onClose={onClose} icon={CheckCircle} />;
};

// Error Popup Component
export const ErrorPopup = ({ errorMessage, onClose }) => {
  let displayMessage = errorMessage;
  if (typeof errorMessage === 'object') {
    displayMessage = errorMessage.message || errorMessage.error || JSON.stringify(errorMessage);
  }
  return <Toast message={displayMessage} type="error" onClose={onClose} icon={XCircle} />;
};
