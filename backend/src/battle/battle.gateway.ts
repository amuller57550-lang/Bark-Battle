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

interface BattleRoom {
  matchId: string;
  player1: { id: string; socket: Socket; volumes: number[]; peak: number };
  player2: { id: string; socket: Socket; volumes: number[]; peak: number };
  startTime: Date;
  roundDuration: number;
  bonuses: unknown[];
  timer: ReturnType<typeof setTimeout> | null;
}

const ROUND_DURATION = 10;

@WebSocketGateway({ namespace: '/battle', cors: { origin: '*' } })
export class BattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private battles = new Map<string, BattleRoom>();
  private playerToBattle = new Map<string, string>();

  constructor(
    private jwt: JwtService,
    private matches: MatchesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const payload = this.jwt.verify(token);
        client.data.userId = payload.sub;
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const matchId = this.playerToBattle.get(userId);
    if (matchId) {
      const battle = this.battles.get(matchId);
      if (battle) {
        const opponentId =
          battle.player1.id === userId ? battle.player2.id : battle.player1.id;
        const opponentSocket =
          battle.player1.id === userId ? battle.player2.socket : battle.player1.socket;

        opponentSocket.emit('battle:opponent-disconnected');
        this.cleanupBattle(matchId);
      }
    }
  }

  @SubscribeMessage('battle:join')
  joinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; userId: string },
  ) {
    const userId = data.userId || client.data.userId;
    const existing = this.battles.get(data.matchId);

    if (!existing) {
      // First player to join
      this.battles.set(data.matchId, {
        matchId: data.matchId,
        player1: { id: userId, socket: client, volumes: [], peak: 0 },
        player2: { id: '', socket: client, volumes: [], peak: 0 },
        startTime: new Date(),
        roundDuration: ROUND_DURATION,
        bonuses: [],
        timer: null,
      });
      this.playerToBattle.set(userId, data.matchId);
      client.join(`battle:${data.matchId}`);
    } else if (!existing.player2.id) {
      // Second player joins
      existing.player2 = { id: userId, socket: client, volumes: [], peak: 0 };
      this.playerToBattle.set(userId, data.matchId);
      client.join(`battle:${data.matchId}`);

      // Both players ready — start countdown
      this.server.to(`battle:${data.matchId}`).emit('battle:start', {
        matchId: data.matchId,
        player1Id: existing.player1.id,
        player2Id: existing.player2.id,
      });

      // Schedule battle end
      existing.timer = setTimeout(
        () => this.endBattle(data.matchId),
        (ROUND_DURATION + 3) * 1000, // +3 for countdown
      );
    } else {
      // Both players already in room (reconnect) — resend battle:start to this client
      client.join(`battle:${data.matchId}`);
      client.emit('battle:start', {
        matchId: data.matchId,
        player1Id: existing.player1.id,
        player2Id: existing.player2.id,
      });
    }
  }

  @SubscribeMessage('battle:volume')
  updateVolume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; volume: number },
  ) {
    const userId = client.data.userId;
    const battle = this.battles.get(data.matchId);
    if (!battle) return;

    const vol = Math.max(0, Math.min(100, data.volume));

    if (battle.player1.id === userId) {
      battle.player1.volumes.push(vol);
      if (vol > battle.player1.peak) battle.player1.peak = vol;
    } else if (battle.player2.id === userId) {
      battle.player2.volumes.push(vol);
      if (vol > battle.player2.peak) battle.player2.peak = vol;
    }

    // Broadcast volume update to opponent
    client.to(`battle:${data.matchId}`).emit('battle:volume-update', {
      playerId: userId,
      volume: vol,
    });
  }

  @SubscribeMessage('battle:bonus')
  broadcastBonus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; bonus: unknown },
  ) {
    const battle = this.battles.get(data.matchId);
    if (!battle) return;
    battle.bonuses.push(data.bonus);
    client.to(`battle:${data.matchId}`).emit('battle:bonus', data.bonus);
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; offer: RTCSessionDescriptionInit },
  ) {
    client.to(`battle:${data.matchId}`).emit('webrtc:offer', data);
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; answer: RTCSessionDescriptionInit },
  ) {
    client.to(`battle:${data.matchId}`).emit('webrtc:answer', data);
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; candidate: RTCIceCandidateInit },
  ) {
    client.to(`battle:${data.matchId}`).emit('webrtc:ice-candidate', data);
  }

  private async endBattle(matchId: string) {
    const battle = this.battles.get(matchId);
    if (!battle) return;

    const avg = (volumes: number[]) =>
      volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;

    const p1Avg = avg(battle.player1.volumes);
    const p2Avg = avg(battle.player2.volumes);

    const p1Consistency =
      battle.player1.volumes.filter((v) => v > 10).length /
      Math.max(1, battle.player1.volumes.length);

    const p2Consistency =
      battle.player2.volumes.filter((v) => v > 10).length /
      Math.max(1, battle.player2.volumes.length);

    try {
      const result = await this.matches.finalizeMatch({
        matchId,
        player1Id: battle.player1.id,
        player2Id: battle.player2.id,
        player1Metrics: {
          avgVolume: p1Avg,
          peakVolume: battle.player1.peak,
          barkDuration: battle.player1.volumes.filter((v) => v > 10).length * 0.1,
          consistency: p1Consistency,
          bonusMultiplier: 1,
        },
        player2Metrics: {
          avgVolume: p2Avg,
          peakVolume: battle.player2.peak,
          barkDuration: battle.player2.volumes.filter((v) => v > 10).length * 0.1,
          consistency: p2Consistency,
          bonusMultiplier: 1,
        },
        bonuses: battle.bonuses,
        duration: ROUND_DURATION,
      });

      this.server.to(`battle:${matchId}`).emit('battle:end', {
        winner: result.winnerId,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        player1RpChange: result.player1RpChange,
        player2RpChange: result.player2RpChange,
      });
    } catch (err) {
      console.error('Error finalizing match:', err);
    }

    this.cleanupBattle(matchId);
  }

  private cleanupBattle(matchId: string) {
    const battle = this.battles.get(matchId);
    if (battle) {
      if (battle.timer) clearTimeout(battle.timer);
      this.playerToBattle.delete(battle.player1.id);
      this.playerToBattle.delete(battle.player2.id);
      this.battles.delete(matchId);
    }
  }
}
