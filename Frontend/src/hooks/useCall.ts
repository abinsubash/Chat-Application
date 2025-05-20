import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export const useCall = (socket: Socket | null) => {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callData, setCallData] = useState<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  const startCall = async (targetUserId: string) => {
    try {
      console.log('Starting call to:', targetUserId);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Got local stream:', stream.getAudioTracks());
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added track to PC:', track.kind);
      });

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', {
            to: targetUserId,
            candidate: event.candidate
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Created and set local description');

      setPeerConnection(pc);

      socket?.emit('call-user', {
        to: targetUserId,
        offer: pc.localDescription
      });

    } catch (error) {
      console.error('Error in startCall:', error);
    }
  };

  const answerCall = async () => {
    if (!socket || !callData) return;

    try {
      console.log('Answering call from:', callData.from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('Added local track:', track.kind);
      });

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(err => 
            console.error('Error playing audio:', err)
          );
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', {
            to: callData.from,
            candidate: event.candidate
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Created and set local description');

      socket.emit('answer-call', {
        to: callData.from,
        answer: pc.localDescription
      });

      setPeerConnection(pc);
      setIncomingCall(false);

    } catch (error) {
      console.error('Error in answerCall:', error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data) => {
      console.log('Incoming call:', data);
      setCallData(data);
      setIncomingCall(true);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE candidate');
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidatesQueue.current.push(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call-answered', async (data) => {
      console.log('Call answered:', data);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        
        // Process queued candidates
        while (iceCandidatesQueue.current.length) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            await peerConnection.addIceCandidate(candidate);
          }
        }
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('ice-candidate');
      socket.off('call-answered');
    };
  }, [socket, peerConnection]);

  return {
    startCall,
    answerCall,
    endCall: useCallback(() => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      setLocalStream(null);
      setPeerConnection(null);
      setIncomingCall(false);
      setCallData(null);
    }, [localStream, peerConnection]),
    incomingCall,
    remoteAudioRef,
    peerConnection,
    localStream
  };
};