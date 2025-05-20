import { Socket } from 'socket.io-client';

interface PeerConnection extends RTCPeerConnection {
  sendChannel?: RTCDataChannel;
  receiveChannel?: RTCDataChannel;
}

export class WebRTCService {
  private peerConnection: PeerConnection | null = null;
  private localStream: MediaStream | null = null;

  constructor(private socket: Socket) {
    this.initializeSocketListeners();
  }

  private initializeSocketListeners() {
    this.socket.on('incoming-call', async ({ from, offer }) => {
      await this.handleIncomingCall(from, offer);
    });

    this.socket.on('call-answered', async ({ from, answer }) => {
      await this.handleCallAnswered(answer);
    });

    this.socket.on('ice-candidate', ({ candidate }) => {
      this.handleNewICECandidate(candidate);
    });
  }

  async startCall(userId: string) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.peerConnection = this.createPeerConnection();
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('call-user', {
        to: userId,
        offer: offer
      });
    } catch (error) {
      console.error('Error starting call:', error);
      this.handleCallEnd();
    }
  }

  private createPeerConnection(): PeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }) as PeerConnection;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      // Handle remote stream
      const remoteStream = event.streams[0];
      // You can emit an event or use a callback here
    };

    return pc;
  }

  private async handleIncomingCall(from: string, offer: RTCSessionDescriptionInit) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.peerConnection = this.createPeerConnection();
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('answer-call', {
        to: from,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling incoming call:', error);
      this.handleCallEnd();
    }
  }

  private async handleCallAnswered(answer: RTCSessionDescriptionInit) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling call answer:', error);
      this.handleCallEnd();
    }
  }

  private async handleNewICECandidate(candidate: RTCIceCandidateInit) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  handleCallEnd() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}