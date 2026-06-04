import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchesService } from '../matches/matches.service';

interface QueueEntry {
  socket: Socket;
  userId: string;
  rp: number;
  joinedAt: Date;
}

interface PrivateRoom {
  code: string;
  creatorId: string;
  creatorSocket: Socket;
  createdAt: Date;
}

@WebSocketGateway({ namespace: '/matchmaking', cors: { origin: '*' } })
export class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private queue: QueueEntry[] = [];
  private privateRooms = new Map<string, PrivateRoom>();
  private readonly MAX_RP_DIFF = 500;
  private readonly MAX_WAIT_S = 60;

  constructor(
    private jwt: JwtService,
    private matches: MatchesService,
  ) {
    // Run matchmaking loop every 2s
    setInterval(() => this.processQueue(), 2000);
    // Clean stale rooms every 30s
    setInterval(() => this.cleanRooms(), 30000);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const payload = this.jwt.verify(token);
        client.data.userId = payload.sub;
        client.data.username = payload.username;
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.queue = this.queue.filter((e) => e.socket.id !== client.id);
  }

  @SubscribeMessage('matchmaking:join')
  async joinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; rp?: number },
  ) {
    // Remove if already in queue
    this.queue = this.queue.filter((e) => e.userId !== data.userId);

    this.queue.push({
      socket: client,
      userId: data.userId || client.data.userId,
      rp: data.rp || 500,
      joinedAt: new Date(),
    });

    client.emit('matchmaking:queued', { position: this.queue.length });
  }

  @SubscribeMessage('matchmaking:leave')
  leaveQueue(@ConnectedSocket() client: Socket) {
    this.queue = this.queue.filter((e) => e.socket.id !== client.id);
  }

  @SubscribeMessage('matchmaking:create-room')
  createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; userId: string },
  ) {
    this.privateRooms.set(data.code, {
      code: data.code,
      creatorId: data.userId || client.data.userId,
      creatorSocket: client,
      createdAt: new Date(),
    });
    client.join(`room:${data.code}`);
    client.emit('room:created', { code: data.code });
  }

  @SubscribeMessage('matchmaking:join-room')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; userId: string },
  ) {
    const room = this.privateRooms.get(data.code);
    if (!room) {
      client.emit('match:error', { message: 'Salon introuvable ou expiré.' });
      return;
    }

    const match = await this.matches.createMatch(
      room.creatorId,
      data.userId || client.data.userId,
    );

    client.join(`room:${data.code}`);
    this.server.to(`room:${data.code}`).emit('match:found', { matchId: match.id });
    this.privateRooms.delete(data.code);
  }

  private async processQueue() {
    if (this.queue.length < 2) return;

    const now = new Date();

    for (let i = 0; i < this.queue.length; i++) {
      const player = this.queue[i];
      const waitSecs = (now.getTime() - player.joinedAt.getTime()) / 1000;

      // Expand RP range the longer you wait
      const rpRange = this.MAX_RP_DIFF + waitSecs * 10;

      for (let j = i + 1; j < this.queue.length; j++) {
        const opponent = this.queue[j];
        if (Math.abs(player.rp - opponent.rp) <= rpRange) {
          // Match found!
          this.queue.splice(j, 1);
          this.queue.splice(i, 1);

          const match = await this.matches.createMatch(player.userId, opponent.userId);

          player.socket.emit('match:found', { matchId: match.id, isInitiator: true });
          opponent.socket.emit('match:found', { matchId: match.id, isInitiator: false });
          return;
        }
      }
    }

    // Timeout old entries
    this.queue = this.queue.filter((e) => {
      const waitSecs = (now.getTime() - e.joinedAt.getTime()) / 1000;
      if (waitSecs > this.MAX_WAIT_S) {
        e.socket.emit('match:error', { message: 'Aucun adversaire trouvé. Réessaie !' });
        return false;
      }
      return true;
    });
  }

  private cleanRooms() {
    const now = new Date();
    this.privateRooms.forEach((room, code) => {
      if (now.getTime() - room.createdAt.getTime() > 5 * 60 * 1000) {
        this.privateRooms.delete(code);
      }
    });
  }
}
