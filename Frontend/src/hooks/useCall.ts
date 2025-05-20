import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useCallStatus } from '../context/CallStatusContext';

interface CallData {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export const useCall = (socket: Socket | null) => {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callData, setCallData] = useState<CallData | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const { setStatus, setError } = useCallStatus();

  useEffect(() => {
    if (!socket) return;

    socket.on('call-ended', (data) => {
      console.log('Call ended received');
      endCall();
    });

    return () => {
      socket.off('call-ended');
    };
  }, [socket]);

  // Move endCall declaration before it's used in effects
  const endCall = useCallback(() => {
    console.log('Ending call...');
    
    // Notify the other user if we have their ID
    if (socket && callData?.from) {
      socket.emit('end-call', { to: callData.from });
    }

    // Clean up local resources
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Audio track stopped');
      });
      setLocalStream(null);
    }

    if (peerConnection) {
      peerConnection.close();
      console.log('Peer connection closed');
      setPeerConnection(null);
    }

    setIncomingCall(false);
    setCallData(null);
    setStatus('idle');
  }, [socket, callData, localStream, peerConnection]);

  // Handle ICE candidates with queuing
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection || peerConnection.remoteDescription === null) {
      // Queue the candidate if remote description is not set
      iceCandidatesQueue.current.push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, [peerConnection]);

  // Process queued ICE candidates
  const processIceCandidateQueue = useCallback(async () => {
    if (!peerConnection || peerConnection.remoteDescription === null) return;

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Queued ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding queued ICE candidate:', error);
        }
      }
    }
  }, [peerConnection]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', async (data: CallData) => {
      try {
        setCallData(data);  // Store the call data
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setIncomingCall(true);
      } catch (error) {
        console.error('Error handling incoming call:', error);
      }
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('ice-candidate');
    };
  }, [socket, peerConnection]);

  const startCall = async (targetUserId: string) => {
    try {
      setStatus('calling');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(console.error);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: targetUserId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call-user', {
        to: targetUserId,
        offer,
      });

      setPeerConnection(pc);
    } catch (error) {
      setError('Failed to start call. Please check your microphone permissions.');
      setStatus('error');
    }
  };

  const answerCall = async () => {
    if (!socket || !callData) {
      setError('Invalid call state');
      return;
    }

    try {
      setStatus('connected');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote track
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(console.error);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && callData) {
          socket.emit('ice-candidate', {
            to: callData.from,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer-call', {
        to: callData.from,
        answer,
      });

      setPeerConnection(pc);
      setIncomingCall(false);
      setCallData(null);
    } catch (error) {
      setError('Failed to answer call. Please check your microphone permissions.');
      setStatus('error');
      console.error('Error answering call:', error);
      endCall();
    }
  };

  // Update the status effect with endCall dependency
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (status === 'calling') {
      timeout = setTimeout(() => {
        if (status === 'calling') {
          setError('Call timeout - no answer');
          endCall();
        }
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [status, endCall]);

  return {
    startCall,
    endCall,
    answerCall,
    incomingCall,
    remoteAudioRef,
    peerConnection,
    localStream
  };
};