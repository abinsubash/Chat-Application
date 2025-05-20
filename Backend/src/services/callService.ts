import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

interface CallPayload {
  to: string;
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class CallService {
  private userSockets: Map<string, Socket<DefaultEventsMap>>;

  constructor() {
    this.userSockets = new Map();
  }

  registerSocket(userId: string, socket: Socket) {
    this.userSockets.set(userId, socket);
  }

  removeSocket(userId: string) {
    this.userSockets.delete(userId);
  }

  handleCall(socket: Socket) {
    socket.on('call-user', (data: CallPayload) => {
      const targetSocket = this.userSockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('incoming-call', {
          from: socket.id,
          offer: data.offer,
        });
      }
    });

    socket.on('answer-call', (data: CallPayload) => {
      const callerSocket = this.userSockets.get(data.to);
      if (callerSocket) {
        callerSocket.emit('call-answered', {
          from: socket.id,
          answer: data.answer,
        });
      }
    });

    socket.on('ice-candidate', (data: CallPayload) => {
      const targetSocket = this.userSockets.get(data.to);
      if (targetSocket) {
        targetSocket.emit('ice-candidate', {
          from: socket.id,
          candidate: data.candidate,
        });
      }
    });
  }
}