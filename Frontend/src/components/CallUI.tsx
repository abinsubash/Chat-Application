import { useState } from 'react';
import { Phone, X, Mic, MicOff } from 'lucide-react';

interface CallUIProps {
  isIncoming: boolean;
  callerName?: string;
  onAccept: () => void;
  onDecline: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  callDuration: number;
}

const CallUI = ({
  isIncoming,
  callerName,
  onAccept,
  onDecline,
  onToggleMute,
  isMuted,
  callDuration
}: CallUIProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-white" />
          </div>
          
          <h3 className="text-xl text-white font-semibold mb-2">
            {isIncoming ? 'Incoming Call' : 'Ongoing Call'}
          </h3>
          
          <p className="text-gray-300 mb-4">
            {callerName || 'Unknown Caller'}
          </p>
          
          {!isIncoming && (
            <p className="text-gray-400 mb-4">
              {formatDuration(callDuration)}
            </p>
          )}

          <div className="flex justify-center gap-6">
            {isIncoming ? (
              <>
                <button
                  onClick={onAccept}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 transition-colors"
                >
                  <Phone size={24} />
                </button>
                <button
                  onClick={onDecline}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors"
                >
                  <X size={24} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onToggleMute}
                  className={`${
                    isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                  } text-white rounded-full p-4 transition-colors`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={onDecline}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors"
                >
                  <X size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallUI;