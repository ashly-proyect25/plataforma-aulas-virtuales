// frontend/src/components/Toast.jsx

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({
  isOpen,
  onClose,
  message,
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 3000
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-500',
          textColor: 'text-white'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500',
          textColor: 'text-white'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500',
          textColor: 'text-white'
        };
      default: // success
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500',
          textColor: 'text-white'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${styles.bgColor} ${styles.textColor} rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[300px] max-w-md`}>
        <Icon size={24} className="flex-shrink-0" />
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="hover:bg-white hover:bg-opacity-20 p-1 rounded-full transition flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Toast;
