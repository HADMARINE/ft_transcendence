import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserQueue } from './entities/user-queue.entity';
import { Lobby, LobbyPlayer } from './entities/lobby.entity';
import { Tournament, TournamentMatch, TournamentPlayer } from './entities/tournament.entity';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { JwtTokenInvalidException } from 'src/errors/exceptions/jwt-token-invalid.exception';
import { TokenType } from 'src/auth/enum/token-type.enum';
import { User } from 'src/users/user.entity';
import { HttpExceptionFactory } from 'src/errors/http-exception-factory.class';
import { RegisterQueueDto } from './dto/register-queue.dto';
import { UsersService } from 'src/users/users.service';
import { RegisterQueueStatus } from './enum/register-queue-status.enum';
import { GametypeEnum } from './enum/game-type.enum';
import ms, { StringValue } from 'ms';
import { GameHistoryService } from 'src/game-history/game-history.service';
import { IngameStatus } from './enum/ingame-status.enum';
import { ActiveGameSession } from './entities/active-game-session.entity';
import { PongData } from './interface/pong-data.interface';
import { v4 as uuidv4 } from 'uuid';
import { AccessNotGrantedException } from 'src/errors/exceptions/access-not-granted.exception';
import { GameConfigDto } from './dto/game-config.dto';
import { ShootData } from './interface/shoot-data.interface';
import { OrientationEnum } from './enum/orientation.enum';
import { GamedataPongDto } from './dto/gamedata-pong.dto';
import { GamedataShootDto } from './dto/gamedata-shoot.dto';
import { GamedataWinnerDto } from './dto/gamedata-winner.dto';
import { ConfigService } from '@nestjs/config';
import { InternalServerException } from 'src/errors/exceptions/internal-server.excecption';

@Injectable()
export class GameSessionService {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(GameHistoryService)
    private readonly gameHistoryService: GameHistoryService,
    private readonly configService: ConfigService,
  ) {}
  readonly userQueue: UserQueue[] = [];
  readonly activeGameSessions: Record<string, ActiveGameSession<unknown>> = {};
  readonly lobbies: Record<string, Lobby> = {}; 
  readonly activeTournaments: Record<string, Tournament> = {}; 
  private readonly logger = new Logger(GameSessionService.name);
  private _server: Server | null = null;

  set server(server: Server) {
    this._server = server;
  }

  get server(): Server {
    if (!this._server) {
      throw new Error(
        'Critical server error : Socket.io server instance is not initialized.',
      );
    }
    return this._server;
  }

  private getQueueRoom(gametype: GametypeEnum): string {
    return `queue-${gametype}`;
  }

  async handleConnection(client: Socket) {
    try {
      const authFromPayload = client.handshake.auth
        ? (client.handshake.auth.Authorization || client.handshake.auth.token)
        : undefined;
      const authFromCookie = (() => {
        const cookieHeader = client.handshake.headers.cookie;
        if (!cookieHeader || typeof cookieHeader !== 'string') return undefined;
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [k, ...v] = c.trim().split('=');
            return [k, v.join('=')];
          }),
        );
        return cookies['Authorization'];
      })();

      const token = authFromPayload || authFromCookie;

      if (!token || typeof token !== 'string') {
        throw new JwtTokenInvalidException();
      }
      const tokenValue = this.authService.verifyToken<Record<string, any>>(
        token,
        TokenType.ACCESS,
      );

      const user = await this.usersService.findOne(tokenValue.user);

      this.logger.debug(`User connected : ${user.id} - ${user.email}`);

      client.handshake.auth.user = user;

      
      await this.usersService.updateUserStatus(user.id, 'online');

      for (const activeGameSession of Object.values(this.activeGameSessions)) {
        if (
          activeGameSession.players
            .map((user) => user.user.id)
            .includes(user.id)
        ) {
          
          client.emit('game-session', this.omitSensitives(activeGameSession));
          await client.join(activeGameSession.id);
          return;
        }
      }
    } catch (error: unknown) {
      if (error instanceof HttpExceptionFactory) {
        client.send(error.errorDetails.code);
        client.disconnect();
        return;
      } else {
        client.send('UNKNOWN_ERROR');
        client.disconnect();
        return;
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.handshake.auth.user as User;

    this.logger.debug(`User disconnected : ${user?.id} - ${user?.email}`);

    
    const queueIndex = this.userQueue.findIndex(
      (userQueue) => userQueue.user?.id === user?.id,
    );

    if (queueIndex !== -1) {
      const gametype = this.userQueue[queueIndex].gametype;
      this.userQueue.splice(queueIndex, 1);
      
      
      const queueRoom = this.getQueueRoom(gametype);
      const separated = this.getSeperatedUserQueue();
      const waitingPlayers = separated[gametype].map((p) => ({
        id: p.user.id,
        email: p.user.email,
        nickname: p.user.nickname,
      }));
      
      this.server.to(queueRoom).emit('lobby-update', {
        id: queueRoom,
        playerCount: waitingPlayers.length,
        maxSize: Number.MAX_SAFE_INTEGER,
        players: waitingPlayers,
      });
      
      this.logger.debug(
        `Removed ${user?.email} from userQueue on disconnect. Remaining: ${this.userQueue.length}`,
      );
    }

    for (const [lobbyId, lobby] of this.waitingLobbies.entries()) {
      const playerIdx = lobby.players.findIndex((p) => p.user.id === user?.id);
      if (playerIdx !== -1) {
        lobby.players.splice(playerIdx, 1);
        client.leave(`lobby-${lobby.id}`);

        this.logger.debug(`Player ${user?.email} disconnected from waiting lobby ${lobby.id}. Remaining: ${lobby.players.length}`);

        if (lobby.players.length === 0) {
          this.logger.debug(`Waiting lobby ${lobby.id} is now empty, deleting...`);
          if (lobby.timer) clearInterval(lobby.timer);
          this.waitingLobbies.delete(lobbyId);
        } else {
          const playersInfo = lobby.players.map((p) => ({
            id: p.user.id,
            email: p.user.email,
            nickname: p.user.nickname,
          }));

          this.server.to(`lobby-${lobby.id}`).emit('lobby-updated', {
            roomId: lobby.id,
            gametype: lobby.gametype,
            players: playersInfo,
            timeRemaining: lobby.timeRemaining,
            maxPlayers: 4,
          });

          this.server.to(`lobby-${lobby.id}`).emit('player-disconnected', {
            odisconnectedPlayer: {
              id: user?.id,
              nickname: user?.nickname,
            },
            remainingPlayers: lobby.players.length,
          });
        }
        break;
      }
    }

    
    for (const [key, lobby] of Object.entries(this.lobbies)) {
      const playerIdx = lobby.players.findIndex((p) => p.user.id === user?.id);
      if (playerIdx !== -1) {
        lobby.players.splice(playerIdx, 1);
        client.leave(lobby.id);
        client.leave(this.getQueueRoom(lobby.gametype));

        if (lobby.players.length === 0) {
          if (lobby.waitTimer) clearTimeout(lobby.waitTimer);
          delete this.lobbies[key];
        } else {
          this.server.to(this.getQueueRoom(lobby.gametype)).emit('lobby-update', {
            id: lobby.id,
            playerCount: lobby.players.length,
            maxSize: lobby.maxSize,
            players: lobby.players.map((p) => ({
              id: p.user.id,
              email: p.user.email,
              nickname: p.user.nickname,
            })),
          });
        }
        break;
      }
    }

    for (const [tournamentId, tournament] of Object.entries(this.activeTournaments)) {
      const isPlayerInTournament = tournament.players.some(p => p.user.id === user?.id);
      
      if (isPlayerInTournament) {
        this.logger.warn(`️ Player ${user?.nickname} disconnected from active tournament ${tournamentId}. Cancelling tournament...`);
        
        this.cancelTournament(tournamentId, `Le joueur ${user?.nickname} a quitté le tournoi`);
        break;
      }
    }

    if (user?.id) {
      await this.usersService.updateUserStatus(user.id, 'offline');
    }
  }

  async registerQueue(client: Socket, registerQueueDto: RegisterQueueDto) {
    const user = client.handshake.auth.user as User;

    if (!user) {
      this.logger.error('registerQueue called but user is not authenticated');
      client.emit('register-queue', 'NOT_AUTHENTICATED');
      return;
    }

    if (!client.connected) {
      this.logger.warn(`User ${user.email} tried to register but socket is not connected`);
      client.emit('register-queue', RegisterQueueStatus.NOT_REGISTERED);
      return;
    }

    const gametype = registerQueueDto.gametype;
    const queueRoom = this.getQueueRoom(gametype);

    this.logger.debug(
      `User ${user.email} (ID: ${user.id}) registering for queue: ${gametype}`,
    );
    this.logger.debug(`Current userQueue length before: ${this.userQueue.length}`);

    
    const alreadyInQueue = this.userQueue.some(
      (uq) => uq.user.id === user.id && uq.gametype === gametype,
    );
    if (alreadyInQueue) {
      this.logger.debug(`User ${user.email} already in queue for ${gametype}`);
      client.emit('register-queue', RegisterQueueStatus.ALREADY_REGISTERED);
      return;
    }

    
    const entry: UserQueue = {
      user,
      client,
      gametype,
      entryTimestamp: new Date(),
    };
    this.userQueue.push(entry);
    this.logger.debug(`Added ${user.email} to userQueue. Total now: ${this.userQueue.length}`);

    
    await client.join(queueRoom);
    this.logger.debug(`${user.email} joined room: ${queueRoom}`);

    
    const separated = this.getSeperatedUserQueue();
    const waitingPlayers = separated[gametype].map((p) => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.logger.debug(
      `Broadcasting lobby-update for ${gametype}: ${waitingPlayers.length} players in queue`,
    );

    this.server.to(queueRoom).emit('lobby-update', {
      id: queueRoom,
      playerCount: waitingPlayers.length,
      maxSize: Number.MAX_SAFE_INTEGER,
      players: waitingPlayers,
    });

    this.logger.debug(`Successfully sent lobby-update to room ${queueRoom}`);

    client.emit('register-queue', RegisterQueueStatus.REGISTERED);
    this.logger.debug(`Sent REGISTERED status to ${user.email}`);

    const gameId = gametype.toLowerCase();
    await this.usersService.updateUserStatus(user.id, 'in_game', gameId);
  }

  private async processLobby(lobby: Lobby) {
    const playerCount = lobby.players.length;
    const queueRoom = this.getQueueRoom(lobby.gametype);

    if (playerCount >= 2) {
      await Promise.all(
        lobby.players.map(async (p) => {
          await p.client.leave(queueRoom);
        }),
      );

      this.handleGameQueueEntry(
        lobby.players as [LobbyPlayer, ...LobbyPlayer[]],
        lobby.gametype,
      );
      delete this.lobbies[`${lobby.gametype}`];
    } else {
      lobby.waitTimer = setTimeout(() => {
        this.processLobby(lobby);
      }, 30000);
    }
  }

  async unregisterQueue(client: Socket) {
    const user = client.handshake.auth.user as User;
    const queueIdx = this.userQueue.findIndex(
      (uq) => uq.user.id === user.id,
    );
    if (queueIdx !== -1) {
      const gametype = this.userQueue[queueIdx].gametype;
      const queueRoom = this.getQueueRoom(gametype);
      this.userQueue.splice(queueIdx, 1);
      await client.leave(queueRoom);

      this.logger.debug(
        `Removed ${user.email} from userQueue. Total: ${this.userQueue.length}`,
      );

      const separated = this.getSeperatedUserQueue();
      const waitingPlayers = separated[gametype].map((p) => ({
        id: p.user.id,
        email: p.user.email,
        nickname: p.user.nickname,
      }));

      this.server.to(queueRoom).emit('lobby-update', {
        id: queueRoom,
        playerCount: waitingPlayers.length,
        maxSize: Number.MAX_SAFE_INTEGER,
        players: waitingPlayers,
      });

      client.emit('register-queue', RegisterQueueStatus.UNREGISTERED);
      await this.usersService.updateUserStatus(user.id, 'online');
      return;
    }

    for (const [key, lobby] of Object.entries(this.lobbies)) {
      const playerIndex = lobby.players.findIndex(
        (p) => p.user.id === user.id,
      );
      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1);
        await client.leave(lobby.id);
        await client.leave(this.getQueueRoom(lobby.gametype));

        if (lobby.players.length === 0) {
          if (lobby.waitTimer) clearTimeout(lobby.waitTimer);
          delete this.lobbies[key];
        } else {
          this.server
            .to(this.getQueueRoom(lobby.gametype))
            .emit('lobby-update', {
              id: lobby.id,
              playerCount: lobby.players.length,
              maxSize: lobby.maxSize,
              players: lobby.players.map((p) => ({
                id: p.user.id,
                email: p.user.email,
                nickname: p.user.nickname,
              })),
            });
        }

        client.emit('register-queue', RegisterQueueStatus.UNREGISTERED);
        await this.usersService.updateUserStatus(user.id, 'online');
        return;
      }
    }

    client.emit('register-queue', RegisterQueueStatus.NOT_REGISTERED);
  }

  getSeperatedUserQueue(): {
    [GametypeEnum.PONG]: UserQueue[];
    [GametypeEnum.SHOOT]: UserQueue[];
  } {
    const queue: {
      [GametypeEnum.PONG]: UserQueue[];
      [GametypeEnum.SHOOT]: UserQueue[];
    } = {
      [GametypeEnum.PONG]: [],
      [GametypeEnum.SHOOT]: [],
    };

    this.userQueue.forEach((userQueue) => {
      if (
        userQueue.gametype === GametypeEnum.PONG &&
        queue[GametypeEnum.PONG].length < 4
      ) {
        queue[GametypeEnum.PONG].push(userQueue);
      } else if (
        userQueue.gametype === GametypeEnum.SHOOT &&
        queue[GametypeEnum.SHOOT].length < 4
      ) {
        queue[GametypeEnum.SHOOT].push(userQueue);
      }
    });

    return queue;
  }

  readonly waitingLobbies: Map<string, {
    id: string;
    gametype: GametypeEnum;
    players: UserQueue[];
    createdAt: Date;
    timer: NodeJS.Timeout | null;
    timeRemaining: number;
  }> = new Map();

  handleGameQueue() {
    this.logger.debug('=== handleGameQueue START ===');

    const queue = this.getSeperatedUserQueue();

    this.logger.debug(
      `Current queue status - PONG : ${queue[GametypeEnum.PONG].length}, SHOOT : ${queue[GametypeEnum.SHOOT].length}`,
    );

    for (const gametype of [GametypeEnum.PONG, GametypeEnum.SHOOT]) {
      const playersInQueue = queue[gametype];
      
      if (playersInQueue.length === 0) continue;

      this.logger.debug(`Processing ${playersInQueue.length} players in queue for ${gametype}`);

      let remainingPlayers = [...playersInQueue];

      for (const [lobbyId, lobby] of this.waitingLobbies.entries()) {
        if (lobby.gametype !== gametype || lobby.players.length >= 4) continue;
        
        const availableSlots = 4 - lobby.players.length;
        const playersToAdd = remainingPlayers.slice(0, availableSlots);
        
        if (playersToAdd.length > 0) {
          this.logger.debug(`Adding ${playersToAdd.length} players to existing lobby ${lobbyId}`);
          this.addPlayersToWaitingLobby(lobbyId, playersToAdd);
          
          remainingPlayers = remainingPlayers.filter(p => 
            !playersToAdd.some(added => added.user.id === p.user.id)
          );
        }
      }
      
      while (remainingPlayers.length >= 2) {
        const playersForNewLobby = remainingPlayers.slice(0, 4);
        this.logger.debug(`Creating new lobby for ${playersForNewLobby.length} players`);
        this.createWaitingLobby(gametype, playersForNewLobby);
        
        remainingPlayers = remainingPlayers.filter(p => 
          !playersForNewLobby.some(np => np.user.id === p.user.id)
        );
      }
      
      this.logger.debug(`${remainingPlayers.length} players remaining in queue for ${gametype}`);
    }

    this.logger.debug('=== handleGameQueue END ===');
  }

  private createWaitingLobby(gametype: GametypeEnum, players: UserQueue[]) {
    const roomId = uuidv4();
    const lobbyRoom = `lobby-${roomId}`;
    
    this.logger.debug(`Creating waiting lobby ${roomId} for ${gametype} with ${players.length} players`);

    for (const player of players) {
      const idx = this.userQueue.findIndex(uq => uq.user.id === player.user.id);
      if (idx !== -1) {
        this.userQueue.splice(idx, 1);
      }
      player.client.leave(this.getQueueRoom(gametype));
      player.client.join(lobbyRoom);
    }

    const lobby = {
      id: roomId,
      gametype,
      players: [...players],
      createdAt: new Date(),
      timer: null as NodeJS.Timeout | null,
      timeRemaining: 60,
    };

    this.waitingLobbies.set(roomId, lobby);

    const playersInfo = players.map(p => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.server.to(lobbyRoom).emit('lobby-created', {
      roomId,
      gametype,
      players: playersInfo,
      timeRemaining: 60,
      maxPlayers: 4,
    });

    this.logger.debug(`Emitted lobby-created to ${players.length} players`);

    this.startLobbyCountdown(roomId);
  }

  private addPlayersToWaitingLobby(lobbyId: string, newPlayers: UserQueue[]) {
    const lobby = this.waitingLobbies.get(lobbyId);
    if (!lobby) return;

    const lobbyRoom = `lobby-${lobby.id}`;
    const maxPlayers = 4;
    const gametype = lobby.gametype;

    for (const player of newPlayers) {
      if (lobby.players.length >= maxPlayers) break;
      
      if (lobby.players.some(p => p.user.id === player.user.id)) continue;

      const idx = this.userQueue.findIndex(uq => uq.user.id === player.user.id);
      if (idx !== -1) {
        this.userQueue.splice(idx, 1);
      }

      player.client.leave(this.getQueueRoom(gametype));
      player.client.join(lobbyRoom);
      lobby.players.push(player);

      this.logger.debug(`Added player ${player.user.email} to lobby ${lobby.id}. Total: ${lobby.players.length}`);
    }

    const playersInfo = lobby.players.map(p => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.server.to(lobbyRoom).emit('lobby-updated', {
      roomId: lobby.id,
      gametype: lobby.gametype,
      players: playersInfo,
      timeRemaining: lobby.timeRemaining,
      maxPlayers: 4,
    });
  }

  private startLobbyCountdown(lobbyId: string) {
    const lobby = this.waitingLobbies.get(lobbyId);
    if (!lobby) return;

    const lobbyRoom = `lobby-${lobby.id}`;

    lobby.timer = setInterval(() => {
      lobby.timeRemaining--;

      this.server.to(lobbyRoom).emit('lobby-countdown', {
        roomId: lobby.id,
        timeRemaining: lobby.timeRemaining,
        playerCount: lobby.players.length,
      });

      if (lobby.timeRemaining <= 0) {
        this.launchTournamentFromLobby(lobbyId);
      }
    }, 1000);
  }

  private launchTournamentFromLobby(lobbyId: string) {
    const lobby = this.waitingLobbies.get(lobbyId);
    if (!lobby) return;

    if (lobby.timer) {
      clearInterval(lobby.timer);
      lobby.timer = null;
    }

    const lobbyRoom = `lobby-${lobby.id}`;
    const playerCount = lobby.players.length;

    this.logger.debug(`Launching tournament from lobby ${lobby.id} with ${playerCount} players`);

    if (playerCount < 2) {
      this.server.to(lobbyRoom).emit('lobby-cancelled', {
        reason: 'NOT_ENOUGH_PLAYERS',
      });
      
      for (const player of lobby.players) {
        player.client.leave(lobbyRoom);
        player.client.join(this.getQueueRoom(lobby.gametype));
        this.userQueue.push(player);
      }
      
      this.waitingLobbies.delete(lobbyId);
      return;
    }

    const playerCountForFormat = lobby.players.length;

    if (playerCountForFormat === 2) {
      this.logger.debug(`Creating 1v1 match for lobby ${lobby.id}`);
      
      const roomId = lobby.id;
      const players = lobby.players;

      const activeGameSession: ActiveGameSession<any> = {
        id: roomId,
        gametype: lobby.gametype,
        status: IngameStatus.LOBBY,
        players: players,
        data: null as any,
        lobbyData: {},
        createdAt: Date.now(),
        tournamentHistory: [],
        classNumber: 0,
        winners: [],
        room: this.server.to(roomId),
        currentClass: 0,
        mapVoteData: [],
      };

      activeGameSession.lobbyData[players[0].user.id] = {
        ready: false,
        color: '#4cc9f0',
        map: 'classic',
      };
      activeGameSession.lobbyData[players[1].user.id] = {
        ready: false,
        color: '#f72585',
        map: 'classic',
      };

      this.activeGameSessions[roomId] = activeGameSession;

      for (const player of players) {
        player.client.leave(lobbyRoom);
        player.client.join(roomId);
      }

      const matchConfigData = {
        roomId,
        gametype: lobby.gametype,
        player1: { id: players[0].user.id, nickname: players[0].user.nickname },
        player2: { id: players[1].user.id, nickname: players[1].user.nickname },
      };

      this.logger.log(`Sending match-config for 1v1 lobby match to ${players[0].user.nickname} and ${players[1].user.nickname}`);
      
      for (const player of players) {
        player.client.emit('match-config', matchConfigData);
      }

      this.waitingLobbies.delete(lobbyId);
      return;
    }

    const format = playerCountForFormat <= 4 ? 'TOURNAMENT_4' : 'TOURNAMENT_8';

    this.server.to(lobbyRoom).emit('tournament-starting', {
      format,
      tournamentId: lobby.id,
      players: lobby.players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
      })),
      brackets: [],
    });

    const tournament = this.createTournament(lobby.gametype, lobby.players, lobby.id);
    
    this.waitingLobbies.delete(lobbyId);

    setTimeout(() => {
      this.logger.log(` Starting first tournament match for tournament ${tournament.id}...`);
      this.startNextTournamentMatch(tournament.id);
    }, 5000);
  }

  private createTournament(gametype: GametypeEnum, lobbyPlayers: UserQueue[], lobbyId: string): Tournament {
    const tournamentId = lobbyId;
    const tournamentRoom = `tournament-${tournamentId}`;

    const players: TournamentPlayer[] = lobbyPlayers.map(p => ({
      user: p.user,
      client: p.client,
      odisconnected: false,
    }));

    this.logger.error(`Creating tournament ${tournamentId}, joining players to room ${tournamentRoom}`);
    for (const player of players) {
      player.client.join(tournamentRoom);
      this.logger.error(` ${player.user.nickname} (socket ${player.client.id}) joined room ${tournamentRoom}`);
    }

    const matches = this.createTournamentBracket(players);

    const tournament: Tournament = {
      id: tournamentId,
      gametype,
      players,
      matches,
      currentMatch: null,
      currentMatchIndex: 0,
      status: 'waiting',
      winner: null,
      createdAt: new Date(),
      spectators: [],
    };

    this.activeTournaments[tournamentId] = tournament;

    this.broadcastTournamentState(tournament);

    this.logger.debug(`Tournament ${tournamentId} created with ${players.length} players and ${matches.length} matches`);

    return tournament;
  }

  private createTournamentBracket(players: TournamentPlayer[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    const playerCount = players.length;

    if (playerCount === 2) {
      matches.push({
        id: uuidv4(),
        player1: players[0],
        player2: players[1],
        winner: null,
        status: 'pending',
        round: 0,
        matchIndex: 0,
      });
    } else if (playerCount >= 3 && playerCount <= 4) {
      matches.push({
        id: uuidv4(),
        player1: players[0],
        player2: players[1],
        winner: null,
        status: 'pending',
        round: 0,
        matchIndex: 0,
      });
      matches.push({
        id: uuidv4(),
        player1: players[2],
        player2: players[3] || null,
        winner: players[3] ? null : players[2],
        status: players[3] ? 'pending' : 'completed',
        round: 0,
        matchIndex: 1,
      });
      matches.push({
        id: uuidv4(),
        player1: null,
        player2: null,
        winner: null,
        status: 'pending',
        round: 1,
        matchIndex: 0,
      });
    }

    return matches;
  }

  private broadcastTournamentState(tournament: Tournament) {
    const tournamentRoom = `tournament-${tournament.id}`;

    const state = {
      tournamentId: tournament.id,
      gametype: tournament.gametype,
      status: tournament.status,
      players: tournament.players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
        email: p.user.email,
      })),
      matches: tournament.matches.map(m => ({
        id: m.id,
        player1: m.player1 ? { id: m.player1.user.id, nickname: m.player1.user.nickname } : null,
        player2: m.player2 ? { id: m.player2.user.id, nickname: m.player2.user.nickname } : null,
        winner: m.winner ? { id: m.winner.user.id, nickname: m.winner.user.nickname } : null,
        status: m.status,
        round: m.round,
        matchIndex: m.matchIndex,
      })),
      currentMatch: tournament.currentMatch ? {
        id: tournament.currentMatch.id,
        player1: tournament.currentMatch.player1 ? { id: tournament.currentMatch.player1.user.id, nickname: tournament.currentMatch.player1.user.nickname } : null,
        player2: tournament.currentMatch.player2 ? { id: tournament.currentMatch.player2.user.id, nickname: tournament.currentMatch.player2.user.nickname } : null,
        round: tournament.currentMatch.round,
        matchIndex: tournament.currentMatch.matchIndex,
      } : null,
      winner: tournament.winner ? { id: tournament.winner.user.id, nickname: tournament.winner.user.nickname } : null,
    };

    const cleanState = JSON.parse(JSON.stringify(state));
    
    this.server.to(tournamentRoom).emit('tournament-bracket', cleanState);
  }

  private startNextTournamentMatch(tournamentId: string) {
    this.logger.log(`== START NEXT TOURNAMENT MATCH === tournamentId: ${tournamentId}`);
    const tournament = this.activeTournaments[tournamentId];
    if (!tournament) {
      this.logger.error(` ERROR: Tournament ${tournamentId} not found!`);
      return;
    }

    this.logger.log(`Tournament matches status:`);
    tournament.matches.forEach(m => {
      this.logger.log(`  Match ${m.id}: ${m.status} - ${m.player1?.user.nickname || 'TBD'} vs ${m.player2?.user.nickname || 'TBD'} (round ${m.round}, index ${m.matchIndex})`);
    });

    this.fillNextRoundMatches(tournament);

    const nextMatch = tournament.matches.find(m => m.status === 'pending' && m.player1 && m.player2);
    this.logger.log(`Found ${tournament.matches.length} total matches. Looking for pending match...`);
    if (nextMatch) {
      this.logger.log(`Found pending match: ${nextMatch.id} - ${nextMatch.player1?.user.nickname} vs ${nextMatch.player2?.user.nickname}`);
    } else {
      this.logger.log(`No pending match found with both players`);
    }

    if (!nextMatch) {
      const allCompleted = tournament.matches.every(m => m.status === 'completed');
      if (allCompleted) {
        this.logger.log(`All matches completed! Tournament is over!`);
        this.endTournament(tournament);
      } else {
        this.logger.log(`Waiting for more matches to complete. Pending: ${tournament.matches.filter(m => m.status === 'pending').length}`);
      }
      return;
    }

    this.startMatch(tournament, nextMatch);
  }

  private fillNextRoundMatches(tournament: Tournament) {
    this.logger.log(`Filling next round matches...`);
    const completedMatches = tournament.matches.filter(m => m.status === 'completed');
    this.logger.log(`Found ${completedMatches.length} completed matches`);
    
    for (const match of tournament.matches) {
      if (match.status !== 'pending') continue;
      if (match.player1 && match.player2) {
        this.logger.log(`  Match ${match.id} already has both players`);
        continue;
      }

      this.logger.log(`  Trying to fill match ${match.id} (round ${match.round}, index ${match.matchIndex})`);

      const previousRound = match.round - 1;
      if (previousRound < 0) {
        this.logger.log(`    Previous round is ${previousRound}, skipping`);
        continue;
      }

      const feedingMatches = completedMatches.filter(m => m.round === previousRound);
      this.logger.log(`    Found ${feedingMatches.length} feeding matches from round ${previousRound}`);
      
      if (match.round === 1 && tournament.matches.length >= 3) {
        if (match.matchIndex === 0) {
          const match0 = feedingMatches.find(m => m.matchIndex === 0);
          const match1 = feedingMatches.find(m => m.matchIndex === 1);
          this.logger.log(`    Semi 0: Looking for winners of matches 0 and 1`);
          if (match0?.winner) {
            match.player1 = match0.winner;
            this.logger.log(`      Set player1 = ${match0.winner.user.nickname}`);
          }
          if (match1?.winner) {
            match.player2 = match1.winner;
            this.logger.log(`      Set player2 = ${match1.winner.user.nickname}`);
          }
        } else if (match.matchIndex === 1) {
          const match2 = feedingMatches.find(m => m.matchIndex === 2);
          const match3 = feedingMatches.find(m => m.matchIndex === 3);
          this.logger.log(`    Semi 1: Looking for winners of matches 2 and 3`);
          if (match2?.winner) {
            match.player1 = match2.winner;
            this.logger.log(`      Set player1 = ${match2.winner.user.nickname}`);
          }
          if (match3?.winner) {
            match.player2 = match3.winner;
            this.logger.log(`      Set player2 = ${match3.winner.user.nickname}`);
          }
        }
      } else if (match.round === 1 && tournament.players.length <= 4) {
        const match0 = feedingMatches.find(m => m.matchIndex === 0);
        const match1 = feedingMatches.find(m => m.matchIndex === 1);
        this.logger.log(`    Final (4-player): Looking for winners of semis 0 and 1`);
        if (match0?.winner) {
          match.player1 = match0.winner;
          this.logger.log(`      Set player1 = ${match0.winner.user.nickname}`);
        }
        if (match1?.winner) {
          match.player2 = match1.winner;
          this.logger.log(`      Set player2 = ${match1.winner.user.nickname}`);
        }
      } else if (match.round === 2) {
        const semi0 = feedingMatches.find(m => m.matchIndex === 0);
        const semi1 = feedingMatches.find(m => m.matchIndex === 1);
        this.logger.log(`    Final (8-player): Looking for winners of semis 0 and 1`);
        if (semi0?.winner) {
          match.player1 = semi0.winner;
          this.logger.log(`      Set player1 = ${semi0.winner.user.nickname}`);
        }
        if (semi1?.winner) {
          match.player2 = semi1.winner;
          this.logger.log(`      Set player2 = ${semi1.winner.user.nickname}`);
        }
      }
    }
    this.logger.log(`Finished filling next round matches`);
  }

  private startMatch(tournament: Tournament, match: TournamentMatch) {
    const tournamentRoom = `tournament-${tournament.id}`;
    
    this.logger.log(` === STARTING MATCH === tournamentId: ${tournament.id}, matchId: ${match.id}`);
    this.logger.log(` Match players: ${match.player1?.user.nickname} (${match.player1?.user.id}) vs ${match.player2?.user.nickname} (${match.player2?.user.id})`);
    
    tournament.currentMatch = match;
    tournament.status = 'in_progress';
    match.status = 'in_progress';

    tournament.spectators = tournament.players.filter(
      p => p.user.id !== match.player1?.user.id && p.user.id !== match.player2?.user.id
    );

    this.logger.debug(
      `Starting match ${match.id}: ${match.player1?.user.nickname} vs ${match.player2?.user.nickname}`
    );

    this.server.to(tournamentRoom).emit('tournament-match-starting', {
      tournamentId: tournament.id,
      match: {
        id: match.id,
        player1: { id: match.player1?.user.id, nickname: match.player1?.user.nickname },
        player2: { id: match.player2?.user.id, nickname: match.player2?.user.nickname },
        round: match.round,
        matchIndex: match.matchIndex,
      },
      spectators: tournament.spectators.map(s => ({ id: s.user.id, nickname: s.user.nickname })),
    });

    if (match.player1 && match.player2) {
      const playersForGame: UserQueue[] = [
        { user: match.player1.user, client: match.player1.client, gametype: tournament.gametype, entryTimestamp: new Date() },
        { user: match.player2.user, client: match.player2.client, gametype: tournament.gametype, entryTimestamp: new Date() },
      ];
      
      this.logger.log(`Calling handleTournamentGame for match ${match.id}`);
      this.handleTournamentGame(tournament.id, match.id, playersForGame, tournament.spectators);
    } else {
      this.logger.error(`ERROR: Match players not properly set! player1: ${match.player1}, player2: ${match.player2}`);
    }

    this.broadcastTournamentState(tournament);
  }

  private async handleTournamentGame(tournamentId: string, matchId: string, players: UserQueue[], spectators: TournamentPlayer[]) {
    const roomId = uuidv4();
    const room = this.server.of('/').in(roomId);
    const gametype = players[0].gametype;

    for (const player of players) {
      await player.client.join(roomId);
      this.logger.debug(`Player ${player.user.nickname} joined room ${roomId} (socket: ${player.client.id})`);
    }

    for (const spectator of spectators) {
      await spectator.client.join(roomId);
      this.logger.debug(`Spectator ${spectator.user.nickname} joined room ${roomId}`);
    }

    const activeGameSession: ActiveGameSession<PongData> = {
      id: roomId,
      gametype,
      tournamentId,
      matchId,
      players: players,
      status: IngameStatus.LOBBY,
      createdAt: Date.now(),
      tournamentHistory: [],
      room,
      data: {
        gameWidth: 1200,
        gameHeight: 800,
        paddleWidth: 10,
        paddleHeight: 100,
        maxScore: 5,
        ball: {
          x: 600,
          y: 400,
          vx: 0,
          vy: 0,
          radius: 8,
        },
        player1: {
          user: players[0].user,
          score: 0,
          y: 350,
          color: '#4cc9f0',
          speed: 20,
        },
        player2: {
          user: players[1].user,
          score: 0,
          y: 350,
          color: '#f72585',
          speed: 20,
        },
      },
      lobbyData: {},
      winners: [],
      classNumber: 0,
      currentClass: 1,
      mapVoteData: [],
    };

    activeGameSession.lobbyData[players[0].user.id] = {
      ready: false,
      color: '#4cc9f0',
      map: 'classic',
    };
    activeGameSession.lobbyData[players[1].user.id] = {
      ready: false,
      color: '#f72585',
      map: 'classic',
    };

    this.activeGameSessions[roomId] = activeGameSession;

    this.logger.debug(`Tournament game ${roomId} created for match ${matchId}, waiting for player config`);
    this.logger.log(`SENDING match-config to player 1: ${players[0].user.nickname} and player 2: ${players[1].user.nickname}`);

    const matchConfigData = {
      roomId,
      tournamentId,
      matchId,
      gametype,
      player1: { id: players[0].user.id, nickname: players[0].user.nickname },
      player2: { id: players[1].user.id, nickname: players[1].user.nickname },
    };

    this.logger.log(`EMITTING MATCH-CONFIG:\n  Tournament: ${tournamentId}\n  Match: ${matchId}\n  Room: ${roomId}\n  Player1: ${players[0].user.nickname} (${players[0].user.id})\n  Player2: ${players[1].user.nickname} (${players[1].user.id})\n`);

    for (const player of players) {
      this.logger.log(`  → Sending match-config to ${player.user.nickname} (socket ${player.client.id})`);
      player.client.emit('match-config', matchConfigData);
    }

    for (const spectator of spectators) {
      this.logger.log(`  → Sending spectator-mode to ${spectator.user.nickname} (socket ${spectator.client.id})`);
      spectator.client.emit('spectator-mode', {
        roomId,
        tournamentId,
        matchId,
        player1: { id: players[0].user.id, nickname: players[0].user.nickname },
        player2: { id: players[1].user.id, nickname: players[1].user.nickname },
      });
    }
  }

  async handlePlayerConfig(client: Socket, data: { roomId: string; tournamentId?: string; matchId?: string; color: string; paddleSpeed?: number; mapId?: string; ready: boolean }) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session) {
      this.logger.warn(`handlePlayerConfig: Session ${data.roomId} not found`);
      return;
    }

    const isPlayer = session.players.some(p => p.user.id === user.id);
    if (!isPlayer) {
      this.logger.warn(`handlePlayerConfig: User ${user.id} is not part of session ${data.roomId}`);
      return;
    }

    session.lobbyData[user.id] = {
      ready: data.ready,
      color: data.color,
      paddleSpeed: data.paddleSpeed || 20,
      map: data.mapId || 'classic',
    };

    this.logger.debug(`Player ${user.nickname} config: ready=${data.ready}, color=${data.color}, speed=${data.paddleSpeed}`);

    this.logger.debug(`Broadcasting config-update to other players in room ${data.roomId}`);
    
    const configUpdateData = {
      roomId: data.roomId,
      userId: user.id,
      nickname: user.nickname,
      ready: data.ready,
      color: data.color,
      paddleSpeed: data.paddleSpeed,
      mapId: data.mapId,
    };
    
    for (const player of session.players) {
      if (player.user.id !== user.id) {
        this.logger.debug(`  → Sending config-update to ${player.user.nickname} (socket ${player.client.id})`);
        player.client.emit('config-update', configUpdateData);
      }
    }
    
    if (session.tournamentId) {
      const tournament = this.activeTournaments[session.tournamentId];
      if (tournament?.spectators) {
        for (const spectator of tournament.spectators) {
          spectator.client.emit('config-update', configUpdateData);
        }
      }
    }

    const allReady = session.players.every(p => session.lobbyData[p.user.id]?.ready === true);
    
    if (allReady) {
      this.logger.debug(`All players ready in session ${data.roomId}, starting game!`);
      
      session.status = IngameStatus.IN_PROGRESS;

      if (session.gametype === GametypeEnum.PONG) {
        this.initializePongGame(session as ActiveGameSession<PongData>);
        
        const pongData = session.data as PongData;
        const gameInfo = {
          roomId: session.id,
          gametype: session.gametype,
          player1: {
            id: pongData.player1.user.id,
            nickname: pongData.player1.user.nickname,
            color: pongData.player1.color,
            score: pongData.player1.score,
          },
          player2: {
            id: pongData.player2.user.id,
            nickname: pongData.player2.user.nickname,
            color: pongData.player2.color,
            score: pongData.player2.score,
          },
        };
        
        for (const player of session.players) {
          player.client.emit('ingame-comm', gameInfo);
        }
      } else if (session.gametype === GametypeEnum.SHOOT) {
        this.initializeShootGame(session);
        
        const shootData = session.data as any;
        const gameInfo = {
          roomId: session.id,
          gametype: session.gametype,
          action: 'start-game',
          player1: {
            id: shootData.player1.user.id,
            nickname: shootData.player1.user.nickname,
            color: shootData.player1.color,
            health: shootData.player1.health,
          },
          player2: {
            id: shootData.player2.user.id,
            nickname: shootData.player2.user.nickname,
            color: shootData.player2.color,
            health: shootData.player2.health,
          },
        };
        
        for (const player of session.players) {
          player.client.emit('ingame-comm', gameInfo);
        }
      } else {
        for (const player of session.players) {
          player.client.emit('ingame-comm', this.omitSensitives(session));
        }
      }

      if (session.tournamentId) {
        const tournament = this.activeTournaments[session.tournamentId];
        if (tournament) {
          const spectatorData = {
            roomId: session.id,
            tournamentId: session.tournamentId,
            matchId: session.matchId,
            gametype: session.gametype,
            status: session.status,
            data: session.gametype === GametypeEnum.PONG ? {
              ball: session.data ? {
                x: (session.data as PongData).ball.x,
                y: (session.data as PongData).ball.y,
                radius: (session.data as PongData).ball.radius,
              } : null,
              player1: session.data ? {
                id: (session.data as PongData).player1.user.id,
                nickname: (session.data as PongData).player1.user.nickname,
                score: (session.data as PongData).player1.score,
                y: (session.data as PongData).player1.y,
                color: (session.data as PongData).player1.color,
              } : null,
              player2: session.data ? {
                id: (session.data as PongData).player2.user.id,
                nickname: (session.data as PongData).player2.user.nickname,
                score: (session.data as PongData).player2.score,
                y: (session.data as PongData).player2.y,
                color: (session.data as PongData).player2.color,
              } : null,
            } : null,
          };
          
          for (const spectator of tournament.spectators) {
            spectator.client.emit('spectator-game', spectatorData);
          }
        }
      }
    }
  }

  async handleTournamentMatchEnd(roomId: string, winnerId: string) {
    const session = this.activeGameSessions[roomId];
    if (!session || !session.tournamentId || !session.matchId) return;

    const tournament = this.activeTournaments[session.tournamentId];
    if (!tournament) return;

    const match = tournament.matches.find(m => m.id === session.matchId);
    if (!match) return;

    const winner = match.player1?.user.id === winnerId ? match.player1 : match.player2;
    match.winner = winner;
    match.status = 'completed';
    tournament.currentMatch = null;

    this.logger.debug(`Match ${match.id} completed. Winner: ${winner?.user.nickname}`);

    const tournamentRoom = `tournament-${tournament.id}`;
    this.server.to(tournamentRoom).emit('tournament-match-ended', {
      tournamentId: tournament.id,
      matchId: match.id,
      winner: winner ? { id: winner.user.id, nickname: winner.user.nickname } : null,
    });

    this.broadcastTournamentState(tournament);

    setTimeout(() => {
      delete this.activeGameSessions[roomId];
      
      setTimeout(() => {
        this.logger.log(`Starting next tournament match for tournament ${tournament.id}`);
        this.startNextTournamentMatch(tournament.id);
      }, 2000);
    }, 3000);
  }

  private endTournament(tournament: Tournament) {
    const finalMatch = tournament.matches.find(m => 
      m.round === Math.max(...tournament.matches.map(m => m.round)) && m.matchIndex === 0
    );

    tournament.winner = finalMatch?.winner || null;
    tournament.status = 'completed';

    this.logger.debug(`Tournament ${tournament.id} completed. Winner: ${tournament.winner?.user.nickname}`);

    const tournamentRoom = `tournament-${tournament.id}`;
    this.server.to(tournamentRoom).emit('tournament-ended', {
      tournamentId: tournament.id,
      winner: tournament.winner ? { id: tournament.winner.user.id, nickname: tournament.winner.user.nickname } : null,
      finalRanking: this.calculateFinalRanking(tournament),
    });

    for (const player of tournament.players) {
      player.client.leave(tournamentRoom);
    }

    setTimeout(() => {
      delete this.activeTournaments[tournament.id];
    }, 30000);
  }

  private cancelTournament(tournamentId: string, reason: string) {
    const tournament = this.activeTournaments[tournamentId];
    if (!tournament) return;

    this.logger.warn(`Cancelling tournament ${tournamentId}: ${reason}`);

    const tournamentRoom = `tournament-${tournament.id}`;
    
    this.server.to(tournamentRoom).emit('tournament-cancelled', {
      tournamentId: tournament.id,
      reason,
    });

    for (const player of tournament.players) {
      player.client.leave(tournamentRoom);
    }

    for (const [roomId, session] of Object.entries(this.activeGameSessions)) {
      if (session.tournamentId === tournamentId) {
        if (session.gametype === GametypeEnum.PONG && session.data) {
          const pongData = session.data as PongData;
          if (pongData.gameLoopInterval) {
            clearInterval(pongData.gameLoopInterval);
          }
        }
        delete this.activeGameSessions[roomId];
      }
    }

    delete this.activeTournaments[tournamentId];
  }

  private calculateFinalRanking(tournament: Tournament): { rank: number; player: { id: string; nickname: string } }[] {
    const ranking: { rank: number; player: { id: string; nickname: string } }[] = [];
    
    if (tournament.winner) {
      ranking.push({ rank: 1, player: { id: tournament.winner.user.id, nickname: tournament.winner.user.nickname } });
    }

    const finalMatch = tournament.matches.find(m => 
      m.round === Math.max(...tournament.matches.map(m => m.round)) && m.matchIndex === 0
    );
    if (finalMatch) {
      const finalist = finalMatch.player1?.user.id === tournament.winner?.user.id ? finalMatch.player2 : finalMatch.player1;
      if (finalist) {
        ranking.push({ rank: 2, player: { id: finalist.user.id, nickname: finalist.user.nickname } });
      }
    }

    const semiMatches = tournament.matches.filter(m => m.round === (tournament.players.length > 4 ? 1 : 0));
    let rank = 3;
    for (const match of semiMatches) {
      if (match.winner && match.player1 && match.player2) {
        const loser = match.player1.user.id === match.winner.user.id ? match.player2 : match.player1;
        if (!ranking.find(r => r.player.id === loser.user.id)) {
          ranking.push({ rank: rank++, player: { id: loser.user.id, nickname: loser.user.nickname } });
        }
      }
    }

    return ranking;
  }

  private getTournamentFormat(playerCount: number): { type: string; players: number; brackets: string[][] } {
    if (playerCount >= 8) {
      return {
        type: 'TOURNAMENT_8',
        players: 8,
        brackets: [
          ['Quart 1', 'Quart 2', 'Quart 3', 'Quart 4'],
          ['Demi 1', 'Demi 2'],
          ['Finale'],
        ],
      };
    } else if (playerCount >= 4) {
      return {
        type: 'TOURNAMENT_4',
        players: 4,
        brackets: [
          ['Demi 1', 'Demi 2'],
          ['Finale'],
        ],
      };
    } else {
      return {
        type: 'DUEL',
        players: 2,
        brackets: [['Match']],
      };
    }
  }

  async removePlayerFromLobby(client: Socket, gametype: GametypeEnum) {
    const user = client.handshake.auth.user as User;
    
    let playerLobby: { id: string; gametype: GametypeEnum; players: UserQueue[]; createdAt: Date; timer: NodeJS.Timeout | null; timeRemaining: number; } | null = null;
    let playerLobbyId: string | null = null;
    
    for (const [lobbyId, lobby] of this.waitingLobbies.entries()) {
      if (lobby.gametype === gametype && lobby.players.some(p => p.user.id === user.id)) {
        playerLobby = lobby;
        playerLobbyId = lobbyId;
        break;
      }
    }
    
    if (!playerLobby || !playerLobbyId) return;

    const playerIdx = playerLobby.players.findIndex(p => p.user.id === user.id);
    
    if (playerIdx === -1) return;

    playerLobby.players.splice(playerIdx, 1);
    client.leave(`lobby-${playerLobby.id}`);
    
    const queueIdx = this.userQueue.findIndex(uq => uq.user.id === user.id);
    if (queueIdx !== -1) {
      this.userQueue.splice(queueIdx, 1);
    }

    this.logger.debug(`Player ${user.email} left lobby ${playerLobby.id}. Remaining: ${playerLobby.players.length}`);

    const playersInfo = playerLobby.players.map(p => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.server.to(`lobby-${playerLobby.id}`).emit('lobby-updated', {
      roomId: playerLobby.id,
      gametype,
      players: playersInfo,
      timeRemaining: playerLobby.timeRemaining,
      maxPlayers: 4,
    });
    if (playerLobby.players.length === 0) {
      if (playerLobby.timer) clearInterval(playerLobby.timer);
      this.waitingLobbies.delete(playerLobbyId);
    }
  }

  private handleGameQueueEntry(
    players: [UserQueue, ...UserQueue[]] | [LobbyPlayer, ...LobbyPlayer[]],
    gametype: GametypeEnum,
  ) {
    this.handleGame(gametype, players);
  }

  private omitSensitives<T>(
    activeGameSession: ActiveGameSession<T>,
  ): Pick<
    ActiveGameSession<T>,
    'id' | 'data' | 'status' | 'gametype' | 'tournamentHistory'
  > {
    const { id, data, status, gametype, tournamentHistory } = activeGameSession;
    return { id, data, status, gametype, tournamentHistory };
  }

  private getTournamentHistory(UserQueue: UserQueue[]): [string, string][][] {
    const tournamentHistory: [string, string][] = [];
    let tournamentCache: string[] = [];
    for (const user of UserQueue) {
      tournamentCache.push(user.user.id);
      if (tournamentCache.length === 2) {
        tournamentHistory.push(tournamentCache as [string, string]);
        tournamentCache = [];
      }
    }
    return [tournamentHistory];
  }

  async handleGame(gametype: GametypeEnum, usersList: (UserQueue | LobbyPlayer)[]) {
    const roomId = uuidv4();

    const room = this.server.of('/').in(roomId);

    const isLobbyPlayer = (player: any): player is LobbyPlayer => {
      return 'joinedAt' in player && 'client' in player;
    };

    const players: UserQueue[] = usersList.map((player) => {
      if (isLobbyPlayer(player)) {
        return {
          user: player.user,
          client: player.client,
          gametype: gametype,
          entryTimestamp: player.joinedAt,
        };
      }
      return player as UserQueue;
    });

    const activeGameSession: ActiveGameSession<unknown> = {
      id: roomId,
      gametype: gametype,
      status: IngameStatus.WAITING_FOR_PLAYERS,
      players: players,
      createdAt: Date.now(),
      tournamentHistory: this.getTournamentHistory(players),
      room,
      data: null,
      lobbyData: {},
      winners: [],
      classNumber: 0,
      currentClass: 1,
      mapVoteData: [],
    };

    for (const userQueue of players) {
      activeGameSession.lobbyData[userQueue.user.id] = {
        ready: false,
        color: null,
        map: null,
      };
    }

    for (const userQueue of players) {
      userQueue.client.emit(
        'ingame-comm',
        this.omitSensitives(activeGameSession),
      );
    }

    this.activeGameSessions[activeGameSession.id] = activeGameSession;

    for (const user of players) {
      await user.client.join(roomId);
    }

    while (true) {
      if (
        (await room.fetchSockets()).length === activeGameSession.players.length
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); 
      this.logger.debug(`Room : ${roomId} - Waiting for players to enter...`);
    }

    activeGameSession.status = IngameStatus.LOBBY;

    room.emit('ingame-comm', this.omitSensitives(activeGameSession));

    while (true) {
      const allReady = activeGameSession.players.every(
        (userQueue) =>
          userQueue.client.handshake.auth.user.id in
            activeGameSession.lobbyData &&
          activeGameSession.lobbyData[userQueue.client.handshake.auth.user.id]
            .ready,
      );

      if (allReady) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.logger.debug(
        `Room : ${roomId} - Waiting for players to be ready...`,
      );
    }

    this.logger.debug(
      `Room : ${roomId} - All players are ready, starting game...`,
    );

    activeGameSession.classNumber = Math.log2(activeGameSession.players.length);

    while (activeGameSession.currentClass <= activeGameSession.classNumber) {
      this.logger.debug(
        `Room : ${roomId} - Starting class ${activeGameSession.currentClass}/${activeGameSession.classNumber}`,
      );

      let userTemp: UserQueue | null = null;
      for (const userQueue of activeGameSession.players) {
        if (!userTemp) {
          userTemp = userQueue;
          continue;
        }

        const users = [userTemp, userQueue];
        userTemp = null;

        activeGameSession.status = IngameStatus.NEXT_ROUND_SELECT;
        room.emit('ingame-comm', this.omitSensitives(activeGameSession));
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            ms(
              this.configService.getOrThrow<StringValue>(
                'NEXT_ROUND_SELECT_TIMEOUT',
              ),
            ),
          ),
        );

        if (activeGameSession.gametype === GametypeEnum.PONG) {
          const pongData: PongData = {
            gameWidth: 1200,
            gameHeight: 800,
            paddleWidth: 10,
            paddleHeight: 100,
            maxScore: 5,
            ball: {
              x: 600,
              y: 400,
              vx: 0,
              vy: 0,
              radius: 8,
            },
            player1: {
              user: users[0].user,
              score: 0,
              y: 350,
              color: '#4cc9f0',
              speed: 20,
            },
            player2: {
              user: users[1].user,
              score: 0,
              y: 350,
              color: '#f72585',
              speed: 20,
            },
          };
          activeGameSession.data = pongData;
        } else if (activeGameSession.gametype === GametypeEnum.SHOOT) {
          const shootData: ShootData = {
            gameWidth: 1700,
            gameHeight: 750,
            player1: {
              user: users[0].user,
              score: 0,
              x: 150,
              y: 350,
              width: 75,
              height: 100,
              orentation: OrientationEnum.RIGHT,
              balls: [],
            },
            player2: {
              user: users[1].user,
              score: 0,
              x: 1475,
              y: 350,
              width: 75,
              height: 100,
              orentation: OrientationEnum.LEFT,
              balls: [],
            },
            walls: [],
          };
          activeGameSession.data = shootData;
        }

        activeGameSession.status = IngameStatus.IN_PROGRESS;

        room.emit('ingame-comm', this.omitSensitives(activeGameSession));

        while (activeGameSession.status === IngameStatus.IN_PROGRESS) {
          room.emit('gamedata', activeGameSession.data);
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              1000 / this.configService.getOrThrow('GAME_FPS'),
            ),
          );
        }
      }

      this.logger.debug(
        `Room : ${roomId} - Class ${activeGameSession.currentClass}/${activeGameSession.classNumber} finished`,
      );

      activeGameSession.currentClass++;
    }

    activeGameSession.status = IngameStatus.TERMINATED;

    room.emit('ingame-comm', this.omitSensitives(activeGameSession));

    await Promise.all(
      activeGameSession.players.map((p) =>
        this.usersService.updateUserStatus(p.user.id, 'online'),
      ),
    );

    delete this.activeGameSessions[activeGameSession.id];
  }

  readyUser(client: Socket) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId(user.id);

    if (activeGameSession.status !== IngameStatus.LOBBY) {
      throw new AccessNotGrantedException();
    }
    activeGameSession.lobbyData[user.id].ready = true;
    activeGameSession.room.emit('ready-user', user.id);
    this.logger.debug(`User ready : ${user.id} - ${user.email}`);
  }

  cancelReadyUser(client: Socket) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId(user.id);

    if (activeGameSession.status !== IngameStatus.LOBBY) {
      throw new AccessNotGrantedException();
    }
    activeGameSession.lobbyData[user.id].ready = false;
    activeGameSession.room.emit('cancel-ready-user', user.id);
    this.logger.debug(`User cancel ready : ${user.id} - ${user.email}`);
  }

  getActiveGameSessionById<T>(id: string): ActiveGameSession<T> {
    const activeGameSession = this.activeGameSessions[id];
    if (!activeGameSession) {
      throw new AccessNotGrantedException();
    }
    return activeGameSession as ActiveGameSession<T>;
  }

  getActiveGameSessionByUserId<T>(userId: string): ActiveGameSession<T> {
    const activeGameSession = Object.values(this.activeGameSessions).find(
      (session) => session.players.map((user) => user.user.id).includes(userId),
    );
    if (!activeGameSession) {
      throw new AccessNotGrantedException();
    }
    return activeGameSession as ActiveGameSession<T>;
  }

  gameConfig(client: Socket, gameConfigDto: GameConfigDto) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId(user.id);
    
    if (activeGameSession.status === IngameStatus.NEXT_ROUND_SELECT || 
        activeGameSession.status === IngameStatus.LOBBY) {
      if (activeGameSession.lobbyData[user.id].ready === true) {
        throw new AccessNotGrantedException();
      }
      activeGameSession.lobbyData[user.id].color = gameConfigDto.color;
      activeGameSession.lobbyData[user.id].map = gameConfigDto.map;
      if (activeGameSession.status === IngameStatus.NEXT_ROUND_SELECT) {
        activeGameSession.lobbyData[user.id].ready = true;
      }
      activeGameSession.room.emit('game-config', {
        user: user.id,
        color: gameConfigDto.color,
        map: gameConfigDto.map,
      });
    } else {
      throw new AccessNotGrantedException();
    }
  }

  gamedataPong(client: Socket, data: GamedataPongDto) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId<PongData>(
      user.id,
    );

    if (activeGameSession.gametype !== GametypeEnum.PONG) {
      throw new AccessNotGrantedException();
    }

    if (activeGameSession.status !== IngameStatus.IN_PROGRESS) {
      throw new AccessNotGrantedException();
    }

    if (activeGameSession.data?.player1.user.id === user.id) {
      activeGameSession.data.player1.y = data.y;
      if (data.ball) {
        activeGameSession.data.ball.x = data.ball.x;
        activeGameSession.data.ball.y = data.ball.y;
      }
    } else if (activeGameSession.data?.player2.user.id === user.id) {
      activeGameSession.data.player2.y = data.y;
    } else {
      throw new AccessNotGrantedException();
    }
  }

  gamedataShoot(client: Socket, data: GamedataShootDto) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId<ShootData>(
      user.id,
    );

    if (activeGameSession.gametype !== GametypeEnum.SHOOT) {
      throw new AccessNotGrantedException();
    }

    if (activeGameSession.status !== IngameStatus.IN_PROGRESS) {
      throw new AccessNotGrantedException();
    }

    if (activeGameSession.data?.player1.user.id === user.id) {
      const wouldCollide = this.checkPlayerWallCollision(
        data.x,
        data.y,
        activeGameSession.data.player1.width,
        activeGameSession.data.player1.height,
        activeGameSession.data.walls
      );
      
      if (!wouldCollide) {
        activeGameSession.data.player1.x = data.x;
        activeGameSession.data.player1.y = data.y;
      }
      activeGameSession.data.player1.orentation = data.orientation;
      activeGameSession.data.player1.balls = data.balls;
    } else if (activeGameSession.data?.player2.user.id === user.id) {
      const wouldCollide = this.checkPlayerWallCollision(
        data.x,
        data.y,
        activeGameSession.data.player2.width,
        activeGameSession.data.player2.height,
        activeGameSession.data.walls
      );
      
      if (!wouldCollide) {
        activeGameSession.data.player2.x = data.x;
        activeGameSession.data.player2.y = data.y;
      }
      activeGameSession.data.player2.orentation = data.orientation;
      activeGameSession.data.player2.balls = data.balls;
    } else {
      throw new AccessNotGrantedException();
    }
  }

  async gamedataWinner(client: Socket, data: string) {
    const user = client.handshake.auth.user as User;
    const activeGameSession = this.getActiveGameSessionByUserId<
      PongData | ShootData
    >(user.id);

    if (activeGameSession.status !== IngameStatus.IN_PROGRESS) {
      throw new AccessNotGrantedException();
    }

    if (
      !activeGameSession.players
        .map((userQueue) => userQueue.user.id)
        .includes(data)
    ) {
      throw new AccessNotGrantedException();
    }

    activeGameSession.winners.push(
      activeGameSession.players.find(
        (userQueue) => userQueue.user.id === data,
      ) as UserQueue,
    );

    if (!activeGameSession.data) {
      throw new InternalServerException();
    }

    await this.gameHistoryService.create({
      gametype: activeGameSession.gametype,
      players: [
        activeGameSession.data.player1.user.id,
        activeGameSession.data.player2.user.id,
      ],
      winner: data,
    });

    activeGameSession.status = IngameStatus.INTERMISSION;

    activeGameSession.room.emit('gamedata-winner', data);
  }

  async userStatusChanged(
    client: Socket,
    data: { status: 'offline' | 'online' | 'in_game' },
  ) {
    const user = client.handshake.auth.user as User;
    if (!user?.id) {
      return;
    }

    await this.usersService.updateUserStatus(user.id, data.status);

    this.server.emit('user-status-updated', {
      userId: user.id,
      status: data.status,
    });
  }


  private initializePongGame(session: ActiveGameSession<PongData>) {
    const player1Config = session.lobbyData[session.players[0].user.id];
    const player2Config = session.lobbyData[session.players[1].user.id];

    session.data = {
      gameWidth: 1200,
      gameHeight: 800,
      paddleWidth: 10,
      paddleHeight: 100,
      maxScore: 5,
      ball: {
        x: 600,
        y: 400,
        vx: 5,
        vy: 5,
        radius: 8,
      },
      player1: {
        user: session.players[0].user,
        score: 0,
        y: 350,
        color: player1Config?.color || '#4cc9f0',
        speed: player1Config?.paddleSpeed || 20,
      },
      player2: {
        user: session.players[1].user,
        score: 0,
        y: 350,
        color: player2Config?.color || '#f72585',
        speed: player2Config?.paddleSpeed || 20,
      },
    };

    this.logger.debug(`Initialized Pong game for session ${session.id}`);
    this.logger.debug(` Player 1: ${session.players[0].user.nickname} (${player1Config?.color}) speed: ${player1Config?.paddleSpeed}`);
    this.logger.debug(` Player 2: ${session.players[1].user.nickname} (${player2Config?.color}) speed: ${player2Config?.paddleSpeed}`);

    const gameLoop = setInterval(() => {
      this.updatePongGame(session);
    }, 1);

    session.data.gameLoopInterval = gameLoop;
    this.logger.debug(` Game loop started for session ${session.id}`);
  }

  private updatePongGame(session: ActiveGameSession<PongData>) {
    if (!session.data || session.status !== IngameStatus.IN_PROGRESS) {
      if (session.data?.gameLoopInterval) {
        clearInterval(session.data.gameLoopInterval);
        this.logger.debug(` Game loop stopped for session ${session.id}`);
      }
      return;
    }

    const data = session.data;

    data.ball.x += data.ball.vx * 0.1;
    data.ball.y += data.ball.vy * 0.1;

    if (data.ball.y - data.ball.radius <= 0 || data.ball.y + data.ball.radius >= data.gameHeight) {
      data.ball.vy = -data.ball.vy;
      data.ball.y = Math.max(data.ball.radius, Math.min(data.gameHeight - data.ball.radius, data.ball.y));
    }

    if (
      data.ball.x - data.ball.radius <= data.paddleWidth &&
      data.ball.y >= data.player1.y &&
      data.ball.y <= data.player1.y + data.paddleHeight
    ) {
      data.ball.vx = Math.abs(data.ball.vx);
      data.ball.x = data.paddleWidth + data.ball.radius;
      
      const hitPos = (data.ball.y - data.player1.y) / data.paddleHeight - 0.5;
      data.ball.vy += hitPos * 3;
    }

    if (
      data.ball.x + data.ball.radius >= data.gameWidth - data.paddleWidth &&
      data.ball.y >= data.player2.y &&
      data.ball.y <= data.player2.y + data.paddleHeight
    ) {
      data.ball.vx = -Math.abs(data.ball.vx);
      data.ball.x = data.gameWidth - data.paddleWidth - data.ball.radius;
      
      const hitPos = (data.ball.y - data.player2.y) / data.paddleHeight - 0.5;
      data.ball.vy += hitPos * 3;
    }

    if (data.ball.x - data.ball.radius <= 0) {
      data.player2.score++;
      this.resetPongBall(data);
      this.logger.debug(`Player 2 scores! Score: ${data.player1.score} - ${data.player2.score}`);
    } else if (data.ball.x + data.ball.radius >= data.gameWidth) {
      data.player1.score++;
      this.resetPongBall(data);
      this.logger.debug(`Player 1 scores! Score: ${data.player1.score} - ${data.player2.score}`);
    }

    if (data.player1.score >= data.maxScore || data.player2.score >= data.maxScore) {
      this.endPongGame(session);
      return;
    }

    const gameState = {
      roomId: session.id,
      ball: {
        x: data.ball.x,
        y: data.ball.y,
        vx: data.ball.vx,
        vy: data.ball.vy,
        radius: data.ball.radius,
      },
      player1: {
        y: data.player1.y,
        score: data.player1.score,
        color: data.player1.color,
      },
      player2: {
        y: data.player2.y,
        score: data.player2.score,
        color: data.player2.color,
      },
    };

    session.room.emit('pong-update', gameState);
  }

  private resetPongBall(data: PongData) {
    data.ball.x = data.gameWidth / 2;
    data.ball.y = data.gameHeight / 2;
    
    const angle = (Math.random() - 0.5) * Math.PI / 3;
    const speed = 5;
    data.ball.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    data.ball.vy = Math.sin(angle) * speed;
  }

  private endPongGame(session: ActiveGameSession<PongData>) {
    if (session.data?.gameLoopInterval) {
      clearInterval(session.data.gameLoopInterval);
    }

    const winner = session.data!.player1.score >= session.data!.maxScore 
      ? session.players[0].user 
      : session.players[1].user;

    this.logger.debug(`Pong game ended. Winner: ${winner.nickname}`);

    session.status = IngameStatus.INTERMISSION;
    session.room.emit('game-ended', {
      winnerId: winner.id,
      winnerNickname: winner.nickname,
      finalScore: {
        player1: session.data!.player1.score,
        player2: session.data!.player2.score,
      },
    });

    this.gameHistoryService.create({
      gametype: session.gametype,
      players: [session.data!.player1.user.id, session.data!.player2.user.id],
      winner: winner.id,
    });

    if (session.tournamentId && session.matchId) {
      this.handleTournamentMatchEnd(session.id, winner.id);
    }
  }

  async handlePaddleMove(client: Socket, data: { roomId: string; direction: 'up' | 'down' | 'stop' }) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session || !session.data || session.gametype !== GametypeEnum.PONG) {
      this.logger.warn(` handlePaddleMove: Invalid session or not a Pong game`);
      return;
    }

    const pongData = session.data as PongData;
    const isPlayer1 = session.players[0].user.id === user.id;
    const player = isPlayer1 ? pongData.player1 : pongData.player2;

    if (data.direction === 'up') {
      player.y = Math.max(0, player.y - player.speed);
    } else if (data.direction === 'down') {
      player.y = Math.min(pongData.gameHeight - pongData.paddleHeight, player.y + player.speed);
    }
  }

  async handleSpectateGame(
    client: Socket,
    data: { roomId: string; tournamentId?: string; matchId?: string; gametype?: string },
  ) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session) {
      this.logger.warn(`handleSpectateGame: Session ${data.roomId} not found`);
      return;
    }

    client.join(data.roomId);
    this.logger.debug(`User ${user.nickname} joined room ${data.roomId} as spectator`);

    if (session.gametype === GametypeEnum.SHOOT && session.data) {
      const shootData = session.data as any;
      
      if (!shootData.player1 || !shootData.player2 || !shootData.fireballs || !shootData.walls) {
        this.logger.warn(`Shoot game not fully initialized yet for spectator`);
        return;
      }

      const gameState = {
        roomId: session.id,
        players: [
          {
            x: shootData.player1.x,
            y: shootData.player1.y,
            width: shootData.player1.width,
            height: shootData.player1.height,
            health: shootData.player1.health,
            color: shootData.player1.color,
            name: shootData.player1.user.nickname,
          },
          {
            x: shootData.player2.x,
            y: shootData.player2.y,
            width: shootData.player2.width,
            height: shootData.player2.height,
            health: shootData.player2.health,
            color: shootData.player2.color,
            name: shootData.player2.user.nickname,
          },
        ],
        fireballs: shootData.fireballs.map((fb: any) => ({
          x: fb.x,
          y: fb.y,
          radius: fb.radius,
          color: fb.color,
        })),
        walls: shootData.walls,
      };
      client.emit('shoot-update', gameState);
    }
  }


  async handlePlayerAction(
    client: Socket,
    data: { roomId: string; move: { x: number; y: number }; fire: boolean; dash: boolean },
  ) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session || !session.data || session.gametype !== GametypeEnum.SHOOT) {
      this.logger.warn(`handlePlayerAction: Invalid session or not a Shoot game`);
      return;
    }

    const shootData = session.data as any;
    const isPlayer1 = session.players[0].user.id === user.id;
    const player = isPlayer1 ? shootData.player1 : shootData.player2;

    
    if (data.move.x !== 0 || data.move.y !== 0) {
      
      const length = Math.sqrt(data.move.x * data.move.x + data.move.y * data.move.y);
      if (length > 0) {
        const normalizedX = data.move.x / length;
        const normalizedY = data.move.y / length;
        
        
        const newX = player.x + normalizedX * player.speed;
        const newY = player.y + normalizedY * player.speed;

        
        const boundedX = Math.max(0, Math.min(shootData.gameWidth - player.width, newX));
        const boundedY = Math.max(0, Math.min(shootData.gameHeight - player.height, newY));

        
        const wouldCollide = this.checkPlayerWallCollision(
          boundedX,
          boundedY,
          player.width,
          player.height,
          shootData.walls
        );

        
        if (!wouldCollide) {
          player.x = boundedX;
          player.y = boundedY;
        }

        
        player.lastDirection = { x: normalizedX, y: normalizedY };
      }
    }

    
    if (data.fire) {
      const now = Date.now();
      if (now - player.lastFire >= player.fireCooldown) {
        player.lastFire = now;
        
        const direction = player.lastDirection.x !== 0 || player.lastDirection.y !== 0 
          ? player.lastDirection 
          : { x: isPlayer1 ? 1 : -1, y: 0 };

        shootData.fireballs.push({
          x: player.x + player.width / 2,
          y: player.y + player.height / 2,
          vx: direction.x * 15,
          vy: direction.y * 15,
          radius: 8,
          color: player.color,
          playerId: user.id,
        });
      }
    }

    
    if (data.dash) {
      const now = Date.now();
      if (player.canDash && now - player.lastDashTime >= player.dashCooldown) {
        player.isDashing = true;
        player.dashStartTime = now;
        player.lastDashTime = now;
        player.canDash = false;

        
        const direction = player.lastDirection.x !== 0 || player.lastDirection.y !== 0 
          ? player.lastDirection 
          : { x: isPlayer1 ? 1 : -1, y: 0 };

        
        const newX = player.x + direction.x * 100;
        const newY = player.y + direction.y * 100;

        
        const boundedX = Math.max(0, Math.min(shootData.gameWidth - player.width, newX));
        const boundedY = Math.max(0, Math.min(shootData.gameHeight - player.height, newY));

        
        const wouldCollide = this.checkPlayerWallCollision(
          boundedX,
          boundedY,
          player.width,
          player.height,
          shootData.walls
        );

        
        if (!wouldCollide) {
          player.x = boundedX;
          player.y = boundedY;
        }
        

        
        setTimeout(() => {
          player.canDash = true;
        }, player.dashCooldown);
      }
    }
  }

  private initializeShootGame(session: ActiveGameSession<any>) {
    const player1Config = session.lobbyData[session.players[0].user.id];
    const player2Config = session.lobbyData[session.players[1].user.id];

    
    const selectedMap = player1Config?.map === 'map2' || player2Config?.map === 'map2' ? 'map2' : 'map1';

    session.data = {
      gameWidth: 1700,
      gameHeight: 750,
      player1: {
        user: session.players[0].user,
        x: 150,
        y: 300,
        width: 75,
        height: 100,
        speed: 9,
        health: 100,
        color: player1Config?.color || '#00ccff',
        lastFire: 0,
        lastDirection: { x: 0, y: 0 },
        canDash: true,
        dashCooldown: 500,
        isDashing: false,
        dashStartTime: 0,
        lastDashTime: 0,
        fireCooldown: 300,
      },
      player2: {
        user: session.players[1].user,
        x: 1475,
        y: 300,
        width: 75,
        height: 100,
        speed: 9,
        health: 100,
        color: player2Config?.color || '#ff6666',
        lastFire: 0,
        lastDirection: { x: 0, y: 0 },
        canDash: true,
        dashCooldown: 500,
        isDashing: false,
        dashStartTime: 0,
        lastDashTime: 0,
        fireCooldown: 300,
      },
      fireballs: [],
      particles: [],
      walls: this.getShootWalls(selectedMap),
      gameLoopInterval: null,
    };

    this.logger.debug(`Initialized Shoot game for session ${session.id}`);
    this.logger.debug(` Player 1: ${session.players[0].user.nickname} (${player1Config?.color})`);
    this.logger.debug(` Player 2: ${session.players[1].user.nickname} (${player2Config?.color})`);

    
    const gameLoop = setInterval(() => {
      this.updateShootGame(session);
    }, 16); 

    session.data.gameLoopInterval = gameLoop;
    this.logger.debug(` Shoot game loop started for session ${session.id}`);
  }

  private getShootWalls(mapId: string): any[] {
    
    if (mapId === 'map1') {
      return [
        { x: 600, y: 200, width: 50, height: 200 },
        { x: 1050, y: 350, width: 50, height: 200 },
      ];
    }
    
    else if (mapId === 'map2') {
      return [
        { x: 500, y: 100, width: 100, height: 300 },
        { x: 1100, y: 350, width: 100, height: 300 },
      ];
    }
    return [];
  }

  private checkPlayerWallCollision(
    playerX: number,
    playerY: number,
    playerWidth: number,
    playerHeight: number,
    walls: any[]
  ): boolean {
    for (const wall of walls) {
      
      if (
        playerX < wall.x + wall.width &&
        playerX + playerWidth > wall.x &&
        playerY < wall.y + wall.height &&
        playerY + playerHeight > wall.y
      ) {
        return true; 
      }
    }
    return false; 
  }

  private updateShootGame(session: ActiveGameSession<any>) {
    if (!session.data || session.status !== IngameStatus.IN_PROGRESS) {
      if (session.data?.gameLoopInterval) {
        clearInterval(session.data.gameLoopInterval);
        this.logger.debug(` Shoot game loop stopped for session ${session.id}`);
      }
      return;
    }

    const data = session.data;

    
    for (let i = data.fireballs.length - 1; i >= 0; i--) {
      const fireball = data.fireballs[i];
      fireball.x += fireball.vx;
      fireball.y += fireball.vy;

      
      if (
        fireball.x < 0 ||
        fireball.x > data.gameWidth ||
        fireball.y < 0 ||
        fireball.y > data.gameHeight
      ) {
        data.fireballs.splice(i, 1);
        continue;
      }

      
      let hitWall = false;
      for (const wall of data.walls) {
        const closestX = Math.max(wall.x, Math.min(fireball.x, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(fireball.y, wall.y + wall.height));
        const distanceX = fireball.x - closestX;
        const distanceY = fireball.y - closestY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < fireball.radius) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        data.fireballs.splice(i, 1);
        continue;
      }

      
      const players = [data.player1, data.player2];
      let playerHit = false;
      for (const player of players) {
        if (fireball.playerId === player.user.id) continue; 

        if (
          fireball.x > player.x &&
          fireball.x < player.x + player.width &&
          fireball.y > player.y &&
          fireball.y < player.y + player.height
        ) {
          player.health -= 10;

          
          if (player.health <= 0) {
            this.endShootGame(session);
            return;
          }

          
          data.player1.x = 150;
          data.player1.y = 300;
          data.player2.x = 1475;
          data.player2.y = 300;
          data.fireballs = [];
          
          playerHit = true;
          break;
        }
      }

      
      if (playerHit) {
        break;
      }
    }

    
    const gameState = {
      roomId: session.id,
      players: [
        {
          x: data.player1.x,
          y: data.player1.y,
          width: data.player1.width,
          height: data.player1.height,
          health: data.player1.health,
          color: data.player1.color,
          name: data.player1.user.nickname,
        },
        {
          x: data.player2.x,
          y: data.player2.y,
          width: data.player2.width,
          height: data.player2.height,
          health: data.player2.health,
          color: data.player2.color,
          name: data.player2.user.nickname,
        },
      ],
      fireballs: data.fireballs.map(fb => ({
        x: fb.x,
        y: fb.y,
        radius: fb.radius,
        color: fb.color,
      })),
      walls: data.walls,
    };

    session.room.emit('shoot-update', gameState);
  }

  private endShootGame(session: ActiveGameSession<any>) {
    if (session.data?.gameLoopInterval) {
      clearInterval(session.data.gameLoopInterval);
    }

    const winner = session.data.player1.health > 0 
      ? session.players[0].user 
      : session.players[1].user;

    this.logger.debug(`Shoot game ended. Winner: ${winner.nickname}`);

    session.status = IngameStatus.INTERMISSION;
    session.room.emit('game-ended', {
      winnerId: winner.id,
      winnerName: winner.nickname,
    });

    
    this.gameHistoryService.create({
      gametype: session.gametype,
      players: [session.data.player1.user.id, session.data.player2.user.id],
      winner: winner.id,
    });

    
    if (session.tournamentId && session.matchId) {
      this.handleTournamentMatchEnd(session.id, winner.id);
    }
  }
}

