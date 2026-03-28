import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  // 3秒后自动关闭
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl p-6 w-11/12 max-w-md ${type === 'success' ? 'border-t-4 border-green-500' : 'border-t-4 border-red-500'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          {type === 'success' ? (
            <svg className="w-8 h-8 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.233-1.732.73-1.732 1.732V16a2.25 2.25 0 01-2.25 2.25z" />
            </svg>
          )}
          <h3 className={`text-lg font-semibold ${type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {type === 'success' ? '成功' : '错误'}
          </h3>
        </div>
        <p className="text-gray-700 mb-4">{message}</p>
        <button
          className={`w-full py-2 rounded-lg transition-all duration-300 ${type === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          onClick={onClose}
        >
          确定
        </button>
      </div>
    </div>
  );
};

export default Notification;