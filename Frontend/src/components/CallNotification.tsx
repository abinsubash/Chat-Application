import { useCallStatus } from '../context/CallStatusContext';
import { AlertCircle, CheckCircle, Phone, PhoneOff } from 'lucide-react';

const CallNotification = () => {
  const { status, error } = useCallStatus();

  if (!status || status === 'idle') return null;

  const notifications = {
    calling: { message: 'Calling...', icon: Phone, color: 'text-blue-400' },
    incoming: { message: 'Incoming call', icon: Phone, color: 'text-green-400' },
    connected: { message: 'Call connected', icon: CheckCircle, color: 'text-green-400' },
    ended: { message: 'Call ended', icon: PhoneOff, color: 'text-gray-400' },
    error: { message: error || 'Call failed', icon: AlertCircle, color: 'text-red-400' }
  };

  const notification = notifications[status];

  return (
    <div className="fixed top-4 right-4 bg-gray-800 p-3 rounded-lg shadow-lg flex items-center gap-2">
      <notification.icon className={`${notification.color}`} size={20} />
      <span className="text-white">{notification.message}</span>
    </div>
  );
};

export default CallNotification;