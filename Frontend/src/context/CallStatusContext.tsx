import { createContext, useContext, useState } from 'react';

type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended' | 'error';

interface CallStatusContextType {
  status: CallStatus;
  setStatus: (status: CallStatus) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const CallStatusContext = createContext<CallStatusContextType | null>(null);

export const CallStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  return (
    <CallStatusContext.Provider value={{ status, setStatus, error, setError }}>
      {children}
    </CallStatusContext.Provider>
  );
};

export const useCallStatus = () => {
  const context = useContext(CallStatusContext);
  if (!context) {
    throw new Error('useCallStatus must be used within CallStatusProvider');
  }
  return context;
};