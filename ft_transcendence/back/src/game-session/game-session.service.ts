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
  readonly lobbies: Record<string, Lobby> = {}; // gameType -> Lobby
  readonly activeTournaments: Record<string, Tournament> = {}; // tournamentId -> Tournament
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

      // Mark user as online when socket connects
      await this.usersService.updateUserStatus(user.id, 'online');

      for (const activeGameSession of Object.values(this.activeGameSessions)) {
        if (
          activeGameSession.players
            .map((user) => user.user.id)
            .includes(user.id)
        ) {
          // TODO : reestablish user session, send info to client
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

    // Remove the user from the legacy queue if present
    const queueIndex = this.userQueue.findIndex(
      (userQueue) => userQueue.user?.id === user?.id,
    );

    if (queueIndex !== -1) {
      const gametype = this.userQueue[queueIndex].gametype;
      this.userQueue.splice(queueIndex, 1);
      
      // Broadcast updated queue to remaining players
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

    // Remove the user from any waiting lobby (nouveau système dynamique)
    for (const [gametype, lobby] of Object.entries(this.waitingLobbies)) {
      const playerIdx = lobby.players.findIndex((p) => p.user.id === user?.id);
      if (playerIdx !== -1) {
        lobby.players.splice(playerIdx, 1);
        client.leave(`lobby-${lobby.id}`);

        this.logger.debug(`Player ${user?.email} disconnected from waiting lobby ${lobby.id}. Remaining: ${lobby.players.length}`);

        if (lobby.players.length === 0) {
          // Plus personne dans le lobby, supprimer
          this.logger.debug(`Waiting lobby ${lobby.id} is now empty, deleting...`);
          if (lobby.timer) clearInterval(lobby.timer);
          delete this.waitingLobbies[gametype];
        } else {
          // Notifier les autres joueurs
          const playersInfo = lobby.players.map((p) => ({
            id: p.user.id,
            email: p.user.email,
            nickname: p.user.nickname,
          }));

          this.server.to(`lobby-${lobby.id}`).emit('lobby-updated', {
            roomId: lobby.id,
            gametype,
            players: playersInfo,
            timeRemaining: lobby.timeRemaining,
            maxPlayers: 8,
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

    // Remove the user from any old lobby system
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

    // Vérifier si l'utilisateur fait partie d'un tournoi actif
    for (const [tournamentId, tournament] of Object.entries(this.activeTournaments)) {
      const isPlayerInTournament = tournament.players.some(p => p.user.id === user?.id);
      
      if (isPlayerInTournament) {
        this.logger.warn(`⚠️ Player ${user?.nickname} disconnected from active tournament ${tournamentId}. Cancelling tournament...`);
        
        // Annuler le tournoi
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

    // Check if user already registered in the existing queue system
    const alreadyInQueue = this.userQueue.some(
      (uq) => uq.user.id === user.id && uq.gametype === gametype,
    );
    if (alreadyInQueue) {
      this.logger.debug(`User ${user.email} already in queue for ${gametype}`);
      client.emit('register-queue', RegisterQueueStatus.ALREADY_REGISTERED);
      return;
    }

    // Add user to the existing userQueue
    const entry: UserQueue = {
      user,
      client,
      gametype,
      entryTimestamp: new Date(),
    };
    this.userQueue.push(entry);
    this.logger.debug(`✅ Added ${user.email} to userQueue. Total now: ${this.userQueue.length}`);

    // Join the shared queue room per game type for UI updates
    await client.join(queueRoom);
    this.logger.debug(`✅ ${user.email} joined room: ${queueRoom}`);

    // Broadcast current waiting users for this gametype
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

    this.logger.debug(`✅ Successfully sent lobby-update to room ${queueRoom}`);

    client.emit('register-queue', RegisterQueueStatus.REGISTERED);
    this.logger.debug(`✅ Sent REGISTERED status to ${user.email}`);

    // Mark player as in_game for presence tracking
    const gameId = gametype.toLowerCase();
    await this.usersService.updateUserStatus(user.id, 'in_game', gameId);
  }

  private async processLobby(lobby: Lobby) {
    const playerCount = lobby.players.length;
    const queueRoom = this.getQueueRoom(lobby.gametype);

    // After 30s, include everyone currently waiting in the lobby in one game
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
      // Not enough players yet; reschedule to try again in 30s
      lobby.waitTimer = setTimeout(() => {
        this.processLobby(lobby);
      }, 30000);
    }
  }

  async unregisterQueue(client: Socket) {
    const user = client.handshake.auth.user as User;
    // Try to remove from the existing queue first
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

      // Broadcast updated waiting list
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

    // Fallback: remove from any temporary lobby
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
        queue[GametypeEnum.PONG].length < 8
      ) {
        queue[GametypeEnum.PONG].push(userQueue);
      } else if (
        userQueue.gametype === GametypeEnum.SHOOT &&
        queue[GametypeEnum.SHOOT].length < 8
      ) {
        queue[GametypeEnum.SHOOT].push(userQueue);
      }
    });

    return queue;
  }

  // Lobbies d'attente actifs (un par gametype)
  readonly waitingLobbies: Record<string, {
    id: string;
    gametype: GametypeEnum;
    players: UserQueue[];
    createdAt: Date;
    timer: NodeJS.Timeout | null;
    timeRemaining: number;
  }> = {};

  handleGameQueue() {
    this.logger.debug('=== handleGameQueue START ===');

    const queue = this.getSeperatedUserQueue();

    this.logger.debug(
      `Current queue status - PONG : ${queue[GametypeEnum.PONG].length}, SHOOT : ${queue[GametypeEnum.SHOOT].length}`,
    );

    // Pour chaque type de jeu, vérifier si on peut créer ou rejoindre un lobby
    for (const gametype of [GametypeEnum.PONG, GametypeEnum.SHOOT]) {
      const playersInQueue = queue[gametype];
      
      if (playersInQueue.length === 0) continue;

      const existingLobby = this.waitingLobbies[gametype];

      if (existingLobby) {
        // Lobby existe déjà - ajouter les nouveaux joueurs
        this.addPlayersToWaitingLobby(gametype, playersInQueue);
      } else if (playersInQueue.length >= 2) {
        // Pas de lobby et 2+ joueurs - créer un nouveau lobby
        this.createWaitingLobby(gametype, playersInQueue);
      }
    }

    this.logger.debug('=== handleGameQueue END ===');
  }

  private createWaitingLobby(gametype: GametypeEnum, players: UserQueue[]) {
    const roomId = uuidv4();
    const lobbyRoom = `lobby-${roomId}`;
    
    this.logger.debug(`Creating waiting lobby ${roomId} for ${gametype} with ${players.length} players`);

    // Retirer les joueurs de la queue
    for (const player of players) {
      const idx = this.userQueue.findIndex(uq => uq.user.id === player.user.id);
      if (idx !== -1) {
        this.userQueue.splice(idx, 1);
      }
      // Quitter la room de queue et rejoindre le lobby
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

    this.waitingLobbies[gametype] = lobby;

    // Envoyer l'événement lobby-created aux joueurs
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
      maxPlayers: 8,
    });

    this.logger.debug(`Emitted lobby-created to ${players.length} players`);

    // Démarrer le countdown de 60 secondes
    this.startLobbyCountdown(gametype);
  }

  private addPlayersToWaitingLobby(gametype: GametypeEnum, newPlayers: UserQueue[]) {
    const lobby = this.waitingLobbies[gametype];
    if (!lobby) return;

    const lobbyRoom = `lobby-${lobby.id}`;
    const maxPlayers = 8;

    for (const player of newPlayers) {
      if (lobby.players.length >= maxPlayers) break;
      
      // Vérifier si le joueur n'est pas déjà dans le lobby
      if (lobby.players.some(p => p.user.id === player.user.id)) continue;

      // Retirer de la queue
      const idx = this.userQueue.findIndex(uq => uq.user.id === player.user.id);
      if (idx !== -1) {
        this.userQueue.splice(idx, 1);
      }

      // Ajouter au lobby
      player.client.leave(this.getQueueRoom(gametype));
      player.client.join(lobbyRoom);
      lobby.players.push(player);

      this.logger.debug(`Added player ${player.user.email} to lobby ${lobby.id}. Total: ${lobby.players.length}`);
    }

    // Notifier tous les joueurs du lobby
    const playersInfo = lobby.players.map(p => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.server.to(lobbyRoom).emit('lobby-updated', {
      roomId: lobby.id,
      gametype,
      players: playersInfo,
      timeRemaining: lobby.timeRemaining,
      maxPlayers: 8,
    });
  }

  private startLobbyCountdown(gametype: GametypeEnum) {
    const lobby = this.waitingLobbies[gametype];
    if (!lobby) return;

    const lobbyRoom = `lobby-${lobby.id}`;

    // Timer qui décrémente chaque seconde
    lobby.timer = setInterval(() => {
      lobby.timeRemaining--;

      // Envoyer le temps restant à tous les joueurs
      this.server.to(lobbyRoom).emit('lobby-countdown', {
        roomId: lobby.id,
        timeRemaining: lobby.timeRemaining,
        playerCount: lobby.players.length,
      });

      if (lobby.timeRemaining <= 0) {
        this.launchTournamentFromLobby(gametype);
      }
    }, 1000);
  }

  private launchTournamentFromLobby(gametype: GametypeEnum) {
    const lobby = this.waitingLobbies[gametype];
    if (!lobby) return;

    // Arrêter le timer
    if (lobby.timer) {
      clearInterval(lobby.timer);
      lobby.timer = null;
    }

    const lobbyRoom = `lobby-${lobby.id}`;
    const playerCount = lobby.players.length;

    this.logger.debug(`Launching tournament from lobby ${lobby.id} with ${playerCount} players`);

    if (playerCount < 2) {
      // Pas assez de joueurs, annuler
      this.server.to(lobbyRoom).emit('lobby-cancelled', {
        reason: 'NOT_ENOUGH_PLAYERS',
      });
      
      // Remettre les joueurs dans la queue
      for (const player of lobby.players) {
        player.client.leave(lobbyRoom);
        player.client.join(this.getQueueRoom(gametype));
        this.userQueue.push(player);
      }
      
      delete this.waitingLobbies[gametype];
      return;
    }

    const playerCountForFormat = lobby.players.length;
    const format = playerCountForFormat <= 2 ? 'DUEL' : 
                   playerCountForFormat <= 4 ? 'TOURNAMENT_4' : 'TOURNAMENT_8';

    // Émettre d'abord l'événement tournament-starting au lobby
    // pour que le frontend puisse naviguer vers la page tournoi
    this.server.to(lobbyRoom).emit('tournament-starting', {
      format,
      tournamentId: lobby.id,
      players: lobby.players.map(p => ({
        id: p.user.id,
        nickname: p.user.nickname,
      })),
      brackets: [], // Sera rempli après
    });

    // Créer le tournoi
    const tournament = this.createTournament(gametype, lobby.players, lobby.id);
    
    // Supprimer le lobby d'attente
    delete this.waitingLobbies[gametype];

    // Démarrer le premier match du tournoi après un délai plus long
    // pour laisser le temps au frontend de naviguer ET enregistrer les listeners
    setTimeout(() => {
      this.logger.log(`📋 Starting first tournament match for tournament ${tournament.id}...`);
      this.startNextTournamentMatch(tournament.id);
    }, 5000); // Augmenté à 5000ms pour plus de stabilité
  }

  private createTournament(gametype: GametypeEnum, lobbyPlayers: UserQueue[], lobbyId: string): Tournament {
    const tournamentId = lobbyId;
    const tournamentRoom = `tournament-${tournamentId}`;

    // Convertir les joueurs du lobby en joueurs de tournoi
    const players: TournamentPlayer[] = lobbyPlayers.map(p => ({
      user: p.user,
      client: p.client,
      odisconnected: false,
    }));

    // Faire rejoindre la room du tournoi à tous les joueurs
    this.logger.error(`🎪 Creating tournament ${tournamentId}, joining players to room ${tournamentRoom}`);
    for (const player of players) {
      player.client.join(tournamentRoom);
      this.logger.error(`  ✅ ${player.user.nickname} (socket ${player.client.id}) joined room ${tournamentRoom}`);
    }

    // Créer les matchs selon le nombre de joueurs
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

    // Envoyer l'arbre du tournoi à tous les joueurs
    this.broadcastTournamentState(tournament);

    this.logger.debug(`Tournament ${tournamentId} created with ${players.length} players and ${matches.length} matches`);

    return tournament;
  }

  private createTournamentBracket(players: TournamentPlayer[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    const playerCount = players.length;

    if (playerCount === 2) {
      // Duel simple - 1 match
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
      // Tournoi 4 joueurs - 2 demi-finales + 1 finale
      // Demi-finale 1: joueur 0 vs joueur 1
      matches.push({
        id: uuidv4(),
        player1: players[0],
        player2: players[1],
        winner: null,
        status: 'pending',
        round: 0,
        matchIndex: 0,
      });
      // Demi-finale 2: joueur 2 vs joueur 3 (ou bye si 3 joueurs)
      matches.push({
        id: uuidv4(),
        player1: players[2],
        player2: players[3] || null,
        winner: players[3] ? null : players[2], // Si pas de 4ème joueur, le 3ème gagne par forfait
        status: players[3] ? 'pending' : 'completed',
        round: 0,
        matchIndex: 1,
      });
      // Finale
      matches.push({
        id: uuidv4(),
        player1: null, // Sera rempli après les demi-finales
        player2: null,
        winner: null,
        status: 'pending',
        round: 1,
        matchIndex: 0,
      });
    } else if (playerCount >= 5 && playerCount <= 8) {
      // Tournoi 8 joueurs - 4 quarts + 2 demi-finales + 1 finale
      // Quarts de finale
      for (let i = 0; i < 4; i++) {
        const p1 = players[i * 2] || null;
        const p2 = players[i * 2 + 1] || null;
        matches.push({
          id: uuidv4(),
          player1: p1,
          player2: p2,
          winner: p2 ? null : p1, // Si pas d'adversaire, victoire par forfait
          status: p2 ? 'pending' : 'completed',
          round: 0,
          matchIndex: i,
        });
      }
      // Demi-finales
      matches.push({
        id: uuidv4(),
        player1: null,
        player2: null,
        winner: null,
        status: 'pending',
        round: 1,
        matchIndex: 0,
      });
      matches.push({
        id: uuidv4(),
        player1: null,
        player2: null,
        winner: null,
        status: 'pending',
        round: 1,
        matchIndex: 1,
      });
      // Finale
      matches.push({
        id: uuidv4(),
        player1: null,
        player2: null,
        winner: null,
        status: 'pending',
        round: 2,
        matchIndex: 0,
      });
    }

    return matches;
  }

  private broadcastTournamentState(tournament: Tournament) {
    const tournamentRoom = `tournament-${tournament.id}`;

    // Créer un objet propre sans références circulaires (Socket, etc.)
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

    // Utiliser JSON.parse(JSON.stringify()) pour s'assurer qu'il n'y a AUCUNE référence circulaire
    const cleanState = JSON.parse(JSON.stringify(state));
    
    this.server.to(tournamentRoom).emit('tournament-bracket', cleanState);
  }

  private startNextTournamentMatch(tournamentId: string) {
    this.logger.log(`🎪 === START NEXT TOURNAMENT MATCH === tournamentId: ${tournamentId}`);
    const tournament = this.activeTournaments[tournamentId];
    if (!tournament) {
      this.logger.error(`🎪 ERROR: Tournament ${tournamentId} not found!`);
      return;
    }

    this.logger.log(`🎪 Tournament matches status:`);
    tournament.matches.forEach(m => {
      this.logger.log(`  Match ${m.id}: ${m.status} - ${m.player1?.user.nickname || 'TBD'} vs ${m.player2?.user.nickname || 'TBD'} (round ${m.round}, index ${m.matchIndex})`);
    });

    // Toujours remplir les matchs du round suivant avec les gagnants
    this.fillNextRoundMatches(tournament);

    // Trouver le prochain match à jouer
    const nextMatch = tournament.matches.find(m => m.status === 'pending' && m.player1 && m.player2);
    this.logger.log(`🎪 Found ${tournament.matches.length} total matches. Looking for pending match...`);
    if (nextMatch) {
      this.logger.log(`🎪 Found pending match: ${nextMatch.id} - ${nextMatch.player1?.user.nickname} vs ${nextMatch.player2?.user.nickname}`);
    } else {
      this.logger.log(`🎪 No pending match found with both players`);
    }

    if (!nextMatch) {
      // Tournoi terminé
      const allCompleted = tournament.matches.every(m => m.status === 'completed');
      if (allCompleted) {
        this.logger.log(`🎪 All matches completed! Tournament is over!`);
        this.endTournament(tournament);
      } else {
        this.logger.log(`🎪 Waiting for more matches to complete. Pending: ${tournament.matches.filter(m => m.status === 'pending').length}`);
      }
      return;
    }

    this.startMatch(tournament, nextMatch);
  }

  private fillNextRoundMatches(tournament: Tournament) {
    this.logger.log(`🎪 Filling next round matches...`);
    // Remplir les matchs du round suivant avec les gagnants
    const completedMatches = tournament.matches.filter(m => m.status === 'completed');
    this.logger.log(`🎪 Found ${completedMatches.length} completed matches`);
    
    for (const match of tournament.matches) {
      if (match.status !== 'pending') continue;
      if (match.player1 && match.player2) {
        this.logger.log(`  Match ${match.id} already has both players`);
        continue; // Déjà rempli
      }

      this.logger.log(`  Trying to fill match ${match.id} (round ${match.round}, index ${match.matchIndex})`);

      // Trouver les matchs précédents qui alimentent ce match
      const previousRound = match.round - 1;
      if (previousRound < 0) {
        this.logger.log(`    Previous round is ${previousRound}, skipping`);
        continue;
      }

      const feedingMatches = completedMatches.filter(m => m.round === previousRound);
      this.logger.log(`    Found ${feedingMatches.length} feeding matches from round ${previousRound}`);
      
      if (match.round === 1 && tournament.matches.length >= 3) {
        // Demi-finales alimentées par les quarts (ou matchs du round 0)
        if (match.matchIndex === 0) {
          // Demi 1: gagnants des matchs 0 et 1 du round 0
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
          // Demi 2: gagnants des matchs 2 et 3 du round 0
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
        // Finale pour tournoi 4 joueurs (round 1 = finale)
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
        // Finale pour tournoi 8 joueurs
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
    this.logger.log(`🎪 Finished filling next round matches`);
  }

  private startMatch(tournament: Tournament, match: TournamentMatch) {
    const tournamentRoom = `tournament-${tournament.id}`;
    
    this.logger.log(`🎪 === STARTING MATCH === tournamentId: ${tournament.id}, matchId: ${match.id}`);
    this.logger.log(`🎪 Match players: ${match.player1?.user.nickname} (${match.player1?.user.id}) vs ${match.player2?.user.nickname} (${match.player2?.user.id})`);
    
    tournament.currentMatch = match;
    tournament.status = 'in_progress';
    match.status = 'in_progress';

    // Les autres joueurs sont spectateurs
    tournament.spectators = tournament.players.filter(
      p => p.user.id !== match.player1?.user.id && p.user.id !== match.player2?.user.id
    );

    this.logger.debug(
      `Starting match ${match.id}: ${match.player1?.user.nickname} vs ${match.player2?.user.nickname}`
    );

    // Informer tout le monde du début du match
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

    // Créer la session de jeu pour les 2 joueurs
    if (match.player1 && match.player2) {
      const playersForGame: UserQueue[] = [
        { user: match.player1.user, client: match.player1.client, gametype: tournament.gametype, entryTimestamp: new Date() },
        { user: match.player2.user, client: match.player2.client, gametype: tournament.gametype, entryTimestamp: new Date() },
      ];
      
      this.logger.log(`🎪 Calling handleTournamentGame for match ${match.id}`);
      // Lancer le jeu avec un callback pour quand le match est terminé
      this.handleTournamentGame(tournament.id, match.id, playersForGame, tournament.spectators);
    } else {
      this.logger.error(`🎪 ERROR: Match players not properly set! player1: ${match.player1}, player2: ${match.player2}`);
    }

    this.broadcastTournamentState(tournament);
  }

  private async handleTournamentGame(tournamentId: string, matchId: string, players: UserQueue[], spectators: TournamentPlayer[]) {
    const roomId = uuidv4();
    const room = this.server.of('/').in(roomId);
    const gametype = players[0].gametype;

    // Joindre les joueurs à la room
    for (const player of players) {
      await player.client.join(roomId);
      this.logger.debug(`✅ Player ${player.user.nickname} joined room ${roomId} (socket: ${player.client.id})`);
    }

    // Joindre les spectateurs à la room (ils recevront spectator-mode après)
    for (const spectator of spectators) {
      await spectator.client.join(roomId);
      this.logger.debug(`👁️ Spectator ${spectator.user.nickname} joined room ${roomId}`);
    }

    // Créer la session de jeu en mode LOBBY (attente de configuration)
    const activeGameSession: ActiveGameSession<PongData> = {
      id: roomId,
      gametype,
      tournamentId,
      matchId,
      players: players,
      status: IngameStatus.LOBBY, // En attente de configuration
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

    // Initialiser lobbyData avec des couleurs par défaut (pas encore prêts)
    activeGameSession.lobbyData[players[0].user.id] = {
      ready: false,
      color: '#4cc9f0', // Bleu par défaut pour joueur 1
      map: 'classic',
    };
    activeGameSession.lobbyData[players[1].user.id] = {
      ready: false,
      color: '#f72585', // Rose par défaut pour joueur 2
      map: 'classic',
    };

    this.activeGameSessions[roomId] = activeGameSession;

    this.logger.debug(`Tournament game ${roomId} created for match ${matchId}, waiting for player config`);
    this.logger.log(`🎮 SENDING match-config to player 1: ${players[0].user.nickname} and player 2: ${players[1].user.nickname}`);

    // Envoyer les joueurs vers la page de configuration
    const matchConfigData = {
      roomId,
      tournamentId,
      matchId,
      gametype,
      player1: { id: players[0].user.id, nickname: players[0].user.nickname },
      player2: { id: players[1].user.id, nickname: players[1].user.nickname },
    };

    this.logger.log(`🎮 EMITTING MATCH-CONFIG:\n  Tournament: ${tournamentId}\n  Match: ${matchId}\n  Room: ${roomId}\n  Player1: ${players[0].user.nickname} (${players[0].user.id})\n  Player2: ${players[1].user.nickname} (${players[1].user.id})\n`);

    // Émettre aux 2 joueurs UNIQUEMENT (pas à toute la room du tournoi)
    for (const player of players) {
      this.logger.log(`  → Sending match-config to ${player.user.nickname} (socket ${player.client.id})`);
      player.client.emit('match-config', matchConfigData);
    }

    // Informer les spectateurs qu'ils doivent rester en mode spectateur
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

  // Gérer la configuration des joueurs
  async handlePlayerConfig(client: Socket, data: { roomId: string; tournamentId?: string; matchId?: string; color: string; paddleSpeed?: number; ready: boolean }) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session) {
      this.logger.warn(`handlePlayerConfig: Session ${data.roomId} not found`);
      return;
    }

    // Vérifier que le joueur fait partie de la session
    const isPlayer = session.players.some(p => p.user.id === user.id);
    if (!isPlayer) {
      this.logger.warn(`handlePlayerConfig: User ${user.id} is not part of session ${data.roomId}`);
      return;
    }

    // Mettre à jour la configuration du joueur
    session.lobbyData[user.id] = {
      ready: data.ready,
      color: data.color,
      paddleSpeed: data.paddleSpeed || 20,
      map: 'classic',
    };

    this.logger.debug(`Player ${user.nickname} config: ready=${data.ready}, color=${data.color}, speed=${data.paddleSpeed}`);

    // Notifier l'autre joueur de la mise à jour
    const room = this.server.to(data.roomId);
    room.emit('config-update', {
      roomId: data.roomId,
      userId: user.id,
      nickname: user.nickname,
      ready: data.ready,
      color: data.color,
      paddleSpeed: data.paddleSpeed,
    });

    // Vérifier si les deux joueurs sont prêts
    const allReady = session.players.every(p => session.lobbyData[p.user.id]?.ready === true);
    
    if (allReady) {
      this.logger.debug(`All players ready in session ${data.roomId}, starting game!`);
      
      // Mettre à jour le status
      session.status = IngameStatus.IN_PROGRESS;

      // Initialiser le jeu Pong si c'est un jeu Pong
      if (session.gametype === GametypeEnum.PONG) {
        this.initializePongGame(session as ActiveGameSession<PongData>);
        
        // Pour Pong, envoyer seulement les infos nécessaires
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
        
        // Pour Shoot, envoyer les infos nécessaires
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
        // Pour les autres jeux, envoyer les données normales
        for (const player of session.players) {
          player.client.emit('ingame-comm', this.omitSensitives(session));
        }
      }

      // Envoyer aux spectateurs si c'est un match de tournoi
      if (session.tournamentId) {
        const tournament = this.activeTournaments[session.tournamentId];
        if (tournament) {
          // Créer une version safe pour les spectateurs (sans références circulaires)
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

  // Appelé quand un match de tournoi est terminé
  async handleTournamentMatchEnd(roomId: string, winnerId: string) {
    const session = this.activeGameSessions[roomId];
    if (!session || !session.tournamentId || !session.matchId) return;

    const tournament = this.activeTournaments[session.tournamentId];
    if (!tournament) return;

    const match = tournament.matches.find(m => m.id === session.matchId);
    if (!match) return;

    // Déterminer le gagnant
    const winner = match.player1?.user.id === winnerId ? match.player1 : match.player2;
    match.winner = winner;
    match.status = 'completed';
    tournament.currentMatch = null;

    this.logger.debug(`Match ${match.id} completed. Winner: ${winner?.user.nickname}`);

    // Notifier tout le monde
    const tournamentRoom = `tournament-${tournament.id}`;
    this.server.to(tournamentRoom).emit('tournament-match-ended', {
      tournamentId: tournament.id,
      matchId: match.id,
      winner: winner ? { id: winner.user.id, nickname: winner.user.nickname } : null,
    });

    // Broadcast l'état mis à jour
    this.broadcastTournamentState(tournament);

    // Attendre 3 secondes avant de nettoyer (pour que les spectateurs voient le résultat)
    setTimeout(() => {
      // Nettoyer la session de jeu
      delete this.activeGameSessions[roomId];
      
      // Attendre 2 secondes de plus puis démarrer le prochain match
      setTimeout(() => {
        this.logger.log(`🎪 Starting next tournament match for tournament ${tournament.id}`);
        this.startNextTournamentMatch(tournament.id);
      }, 2000);
    }, 3000);
  }

  private endTournament(tournament: Tournament) {
    // Trouver le gagnant (celui qui a gagné la finale)
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

    // Faire quitter la room à tous les joueurs
    for (const player of tournament.players) {
      player.client.leave(tournamentRoom);
    }

    // Supprimer le tournoi après un délai
    setTimeout(() => {
      delete this.activeTournaments[tournament.id];
    }, 30000);
  }

  private cancelTournament(tournamentId: string, reason: string) {
    const tournament = this.activeTournaments[tournamentId];
    if (!tournament) return;

    this.logger.warn(`🚫 Cancelling tournament ${tournamentId}: ${reason}`);

    const tournamentRoom = `tournament-${tournament.id}`;
    
    // Notifier tous les joueurs que le tournoi est annulé
    this.server.to(tournamentRoom).emit('tournament-cancelled', {
      tournamentId: tournament.id,
      reason,
    });

    // Faire quitter la room à tous les joueurs
    for (const player of tournament.players) {
      player.client.leave(tournamentRoom);
    }

    // Nettoyer toutes les sessions de jeu actives liées au tournoi
    for (const [roomId, session] of Object.entries(this.activeGameSessions)) {
      if (session.tournamentId === tournamentId) {
        // Arrêter la game loop si elle existe
        if (session.gametype === GametypeEnum.PONG && session.data) {
          const pongData = session.data as PongData;
          if (pongData.gameLoopInterval) {
            clearInterval(pongData.gameLoopInterval);
          }
        }
        delete this.activeGameSessions[roomId];
      }
    }

    // Supprimer le tournoi
    delete this.activeTournaments[tournamentId];
  }

  private calculateFinalRanking(tournament: Tournament): { rank: number; player: { id: string; nickname: string } }[] {
    const ranking: { rank: number; player: { id: string; nickname: string } }[] = [];
    
    // Le gagnant est 1er
    if (tournament.winner) {
      ranking.push({ rank: 1, player: { id: tournament.winner.user.id, nickname: tournament.winner.user.nickname } });
    }

    // Le perdant de la finale est 2ème
    const finalMatch = tournament.matches.find(m => 
      m.round === Math.max(...tournament.matches.map(m => m.round)) && m.matchIndex === 0
    );
    if (finalMatch) {
      const finalist = finalMatch.player1?.user.id === tournament.winner?.user.id ? finalMatch.player2 : finalMatch.player1;
      if (finalist) {
        ranking.push({ rank: 2, player: { id: finalist.user.id, nickname: finalist.user.nickname } });
      }
    }

    // Les perdants des demi-finales sont 3ème
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

  // Permettre à un joueur de quitter le lobby
  async removePlayerFromLobby(client: Socket, gametype: GametypeEnum) {
    const lobby = this.waitingLobbies[gametype];
    if (!lobby) return;

    const user = client.handshake.auth.user as User;
    const playerIdx = lobby.players.findIndex(p => p.user.id === user.id);
    
    if (playerIdx === -1) return;

    lobby.players.splice(playerIdx, 1);
    client.leave(`lobby-${lobby.id}`);

    this.logger.debug(`Player ${user.email} left lobby ${lobby.id}. Remaining: ${lobby.players.length}`);

    // Notifier les autres joueurs
    const playersInfo = lobby.players.map(p => ({
      id: p.user.id,
      email: p.user.email,
      nickname: p.user.nickname,
    }));

    this.server.to(`lobby-${lobby.id}`).emit('lobby-updated', {
      roomId: lobby.id,
      gametype,
      players: playersInfo,
      timeRemaining: lobby.timeRemaining,
      maxPlayers: 8,
    });

    // Si plus personne, supprimer le lobby
    if (lobby.players.length === 0) {
      if (lobby.timer) clearInterval(lobby.timer);
      delete this.waitingLobbies[gametype];
    }
  }

  private handleGameQueueEntry(
    players: [UserQueue, ...UserQueue[]] | [LobbyPlayer, ...LobbyPlayer[]],
    gametype: GametypeEnum,
  ) {
    // Toujours lancer le jeu directement
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

  // TODO : handle game
  async handleGame(gametype: GametypeEnum, usersList: (UserQueue | LobbyPlayer)[]) {
    const roomId = uuidv4();

    const room = this.server.of('/').in(roomId);

    const isLobbyPlayer = (player: any): player is LobbyPlayer => {
      return 'joinedAt' in player && 'client' in player;
    };

    // Convert to a compatible format for ActiveGameSession
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
      // Wait all players to enter the game
      if (
        (await room.fetchSockets()).length === activeGameSession.players.length
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      this.logger.debug(`Room : ${roomId} - Waiting for players to enter...`);
    }

    activeGameSession.status = IngameStatus.LOBBY;

    room.emit('ingame-comm', this.omitSensitives(activeGameSession));

    while (true) {
      // Wait all players to be ready
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
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
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
            player1: {
              user: users[0].user,
              score: 0,
              x: 150,
              y: 350,
              orentation: OrientationEnum.RIGHT,
              balls: [],
            },
            player2: {
              user: users[1].user,
              score: 0,
              x: 1475,
              y: 350,
              orentation: OrientationEnum.LEFT,
              balls: [],
            },
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

    // Game finished: set all players back to online and clear currentGameId
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
    
    // Accepter LOBBY (pour les matchs de tournoi) ou NEXT_ROUND_SELECT
    if (activeGameSession.status === IngameStatus.NEXT_ROUND_SELECT || 
        activeGameSession.status === IngameStatus.LOBBY) {
      if (activeGameSession.lobbyData[user.id].ready === true) {
        throw new AccessNotGrantedException();
      }
      activeGameSession.lobbyData[user.id].color = gameConfigDto.color;
      activeGameSession.lobbyData[user.id].map = gameConfigDto.map;
      // Ne pas mettre ready ici pour LOBBY, cela sera fait par ready-user
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
      activeGameSession.data.player1.x = data.x;
      activeGameSession.data.player1.y = data.y;
      activeGameSession.data.player1.orentation = data.orientation;
      activeGameSession.data.player1.balls = data.balls;
    } else if (activeGameSession.data?.player2.user.id === user.id) {
      activeGameSession.data.player2.x = data.x;
      activeGameSession.data.player2.y = data.y;
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

    // Update user status in database
    await this.usersService.updateUserStatus(user.id, data.status);

    // Broadcast status change to all connected clients so they see it in friends list
    this.server.emit('user-status-updated', {
      userId: user.id,
      status: data.status,
    });
  }

  // ========== PONG GAME LOGIC ==========

  private initializePongGame(session: ActiveGameSession<PongData>) {
    const player1Config = session.lobbyData[session.players[0].user.id];
    const player2Config = session.lobbyData[session.players[1].user.id];

    // Initialiser les données du jeu Pong
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
    this.logger.debug(`🎮 Player 1: ${session.players[0].user.nickname} (${player1Config?.color}) speed: ${player1Config?.paddleSpeed}`);
    this.logger.debug(`🎮 Player 2: ${session.players[1].user.nickname} (${player2Config?.color}) speed: ${player2Config?.paddleSpeed}`);

    // Démarrer la boucle de jeu (1ms = 1000 FPS pour une fluidité maximale)
    const gameLoop = setInterval(() => {
      this.updatePongGame(session);
    }, 1);

    session.data.gameLoopInterval = gameLoop;
    this.logger.debug(`✅ Game loop started for session ${session.id}`);
  }

  private updatePongGame(session: ActiveGameSession<PongData>) {
    if (!session.data || session.status !== IngameStatus.IN_PROGRESS) {
      if (session.data?.gameLoopInterval) {
        clearInterval(session.data.gameLoopInterval);
        this.logger.debug(`❌ Game loop stopped for session ${session.id}`);
      }
      return;
    }

    const data = session.data;

    // Mettre à jour la position de la balle (vitesse ajustée pour le 1ms interval)
    data.ball.x += data.ball.vx * 0.1;
    data.ball.y += data.ball.vy * 0.1;

    // Collision avec les murs haut et bas
    if (data.ball.y - data.ball.radius <= 0 || data.ball.y + data.ball.radius >= data.gameHeight) {
      data.ball.vy = -data.ball.vy;
      data.ball.y = Math.max(data.ball.radius, Math.min(data.gameHeight - data.ball.radius, data.ball.y));
    }

    // Collision avec la raquette du joueur 1 (gauche)
    if (
      data.ball.x - data.ball.radius <= data.paddleWidth &&
      data.ball.y >= data.player1.y &&
      data.ball.y <= data.player1.y + data.paddleHeight
    ) {
      data.ball.vx = Math.abs(data.ball.vx);
      data.ball.x = data.paddleWidth + data.ball.radius;
      
      // Ajouter de l'effet selon où la balle frappe la raquette
      const hitPos = (data.ball.y - data.player1.y) / data.paddleHeight - 0.5;
      data.ball.vy += hitPos * 3;
    }

    // Collision avec la raquette du joueur 2 (droite)
    if (
      data.ball.x + data.ball.radius >= data.gameWidth - data.paddleWidth &&
      data.ball.y >= data.player2.y &&
      data.ball.y <= data.player2.y + data.paddleHeight
    ) {
      data.ball.vx = -Math.abs(data.ball.vx);
      data.ball.x = data.gameWidth - data.paddleWidth - data.ball.radius;
      
      // Ajouter de l'effet
      const hitPos = (data.ball.y - data.player2.y) / data.paddleHeight - 0.5;
      data.ball.vy += hitPos * 3;
    }

    // Vérifier les points marqués
    if (data.ball.x - data.ball.radius <= 0) {
      // Joueur 2 marque un point
      data.player2.score++;
      this.resetPongBall(data);
      this.logger.debug(`Player 2 scores! Score: ${data.player1.score} - ${data.player2.score}`);
    } else if (data.ball.x + data.ball.radius >= data.gameWidth) {
      // Joueur 1 marque un point
      data.player1.score++;
      this.resetPongBall(data);
      this.logger.debug(`Player 1 scores! Score: ${data.player1.score} - ${data.player2.score}`);
    }

    // Vérifier la fin de partie
    if (data.player1.score >= data.maxScore || data.player2.score >= data.maxScore) {
      this.endPongGame(session);
      return;
    }

    // Envoyer les mises à jour à tous les joueurs (uniquement les données nécessaires, pas d'objets circulaires)
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
    
    // Vitesse aléatoire
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

    // Sauvegarder dans l'historique
    this.gameHistoryService.create({
      gametype: session.gametype,
      players: [session.data!.player1.user.id, session.data!.player2.user.id],
      winner: winner.id,
    });

    // Si c'est un match de tournoi, passer au match suivant
    if (session.tournamentId && session.matchId) {
      this.handleTournamentMatchEnd(session.id, winner.id);
    }
  }

  async handlePaddleMove(client: Socket, data: { roomId: string; direction: 'up' | 'down' | 'stop' }) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session || !session.data || session.gametype !== GametypeEnum.PONG) {
      this.logger.warn(`❌ handlePaddleMove: Invalid session or not a Pong game`);
      return;
    }

    const pongData = session.data as PongData;
    const isPlayer1 = session.players[0].user.id === user.id;
    const player = isPlayer1 ? pongData.player1 : pongData.player2;

    // Déplacer la raquette
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
      this.logger.warn(`❌ handleSpectateGame: Session ${data.roomId} not found`);
      return;
    }

    // Ajouter le spectateur à la room
    client.join(data.roomId);
    this.logger.debug(`👁️ User ${user.nickname} joined room ${data.roomId} as spectator`);

    // Envoyer l'état actuel du jeu au spectateur
    if (session.gametype === GametypeEnum.SHOOT && session.data) {
      const shootData = session.data as any;
      
      // Vérifier que le jeu est initialisé
      if (!shootData.player1 || !shootData.player2 || !shootData.fireballs || !shootData.walls) {
        this.logger.warn(`⚠️ Shoot game not fully initialized yet for spectator`);
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

  // ==================== SHOOT GAME LOGIC ====================

  async handlePlayerAction(
    client: Socket,
    data: { roomId: string; move: { x: number; y: number }; fire: boolean; dash: boolean },
  ) {
    const user = client.handshake.auth.user as User;
    const session = this.activeGameSessions[data.roomId];

    if (!session || !session.data || session.gametype !== GametypeEnum.SHOOT) {
      this.logger.warn(`❌ handlePlayerAction: Invalid session or not a Shoot game`);
      return;
    }

    const shootData = session.data as any; // Sera typé correctement plus tard
    const isPlayer1 = session.players[0].user.id === user.id;
    const player = isPlayer1 ? shootData.player1 : shootData.player2;

    // Déplacer le joueur
    if (data.move.x !== 0 || data.move.y !== 0) {
      // Normaliser le vecteur de mouvement
      const length = Math.sqrt(data.move.x * data.move.x + data.move.y * data.move.y);
      if (length > 0) {
        const normalizedX = data.move.x / length;
        const normalizedY = data.move.y / length;
        
        player.x += normalizedX * player.speed;
        player.y += normalizedY * player.speed;

        // Limites du terrain
        player.x = Math.max(0, Math.min(shootData.gameWidth - player.width, player.x));
        player.y = Math.max(0, Math.min(shootData.gameHeight - player.height, player.y));

        // Sauvegarder la dernière direction pour le tir
        player.lastDirection = { x: normalizedX, y: normalizedY };
      }
    }

    // Tirer
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

    // Dash
    if (data.dash) {
      const now = Date.now();
      if (player.canDash && now - player.lastDashTime >= player.dashCooldown) {
        player.isDashing = true;
        player.dashStartTime = now;
        player.lastDashTime = now;
        player.canDash = false;

        // Dash dans la dernière direction
        const direction = player.lastDirection.x !== 0 || player.lastDirection.y !== 0 
          ? player.lastDirection 
          : { x: isPlayer1 ? 1 : -1, y: 0 };

        player.x += direction.x * 100;
        player.y += direction.y * 100;

        // Limites du terrain
        player.x = Math.max(0, Math.min(shootData.gameWidth - player.width, player.x));
        player.y = Math.max(0, Math.min(shootData.gameHeight - player.height, player.y));

        // Réactiver le dash après le cooldown
        setTimeout(() => {
          player.canDash = true;
        }, player.dashCooldown);
      }
    }
  }

  private initializeShootGame(session: ActiveGameSession<any>) {
    const player1Config = session.lobbyData[session.players[0].user.id];
    const player2Config = session.lobbyData[session.players[1].user.id];

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
      walls: this.getShootWalls(player1Config?.map || 'map1'),
      gameLoopInterval: null,
    };

    this.logger.debug(`Initialized Shoot game for session ${session.id}`);
    this.logger.debug(`🔫 Player 1: ${session.players[0].user.nickname} (${player1Config?.color})`);
    this.logger.debug(`🔫 Player 2: ${session.players[1].user.nickname} (${player2Config?.color})`);

    // Démarrer la boucle de jeu (60 FPS)
    const gameLoop = setInterval(() => {
      this.updateShootGame(session);
    }, 16); // ~60 FPS

    session.data.gameLoopInterval = gameLoop;
    this.logger.debug(`✅ Shoot game loop started for session ${session.id}`);
  }

  private getShootWalls(mapId: string): any[] {
    // Map 1: Forêt
    if (mapId === 'map1') {
      return [
        { x: 600, y: 200, width: 50, height: 200 },
        { x: 1050, y: 350, width: 50, height: 200 },
      ];
    }
    // Map 2: Cité
    else if (mapId === 'map2') {
      return [
        { x: 500, y: 100, width: 100, height: 300 },
        { x: 1100, y: 350, width: 100, height: 300 },
      ];
    }
    return [];
  }

  private updateShootGame(session: ActiveGameSession<any>) {
    if (!session.data || session.status !== IngameStatus.IN_PROGRESS) {
      if (session.data?.gameLoopInterval) {
        clearInterval(session.data.gameLoopInterval);
        this.logger.debug(`❌ Shoot game loop stopped for session ${session.id}`);
      }
      return;
    }

    const data = session.data;

    // Mettre à jour les fireballs
    for (let i = data.fireballs.length - 1; i >= 0; i--) {
      const fireball = data.fireballs[i];
      fireball.x += fireball.vx;
      fireball.y += fireball.vy;

      // Supprimer si hors limites
      if (
        fireball.x < 0 ||
        fireball.x > data.gameWidth ||
        fireball.y < 0 ||
        fireball.y > data.gameHeight
      ) {
        data.fireballs.splice(i, 1);
        continue;
      }

      // Collision avec les murs
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

      // Collision avec les joueurs
      const players = [data.player1, data.player2];
      let playerHit = false;
      for (const player of players) {
        if (fireball.playerId === player.user.id) continue; // Ne pas toucher son propre joueur

        if (
          fireball.x > player.x &&
          fireball.x < player.x + player.width &&
          fireball.y > player.y &&
          fireball.y < player.y + player.height
        ) {
          player.health -= 10;

          // Vérifier la fin du jeu
          if (player.health <= 0) {
            this.endShootGame(session);
            return;
          }

          // Réinitialiser les positions des joueurs et supprimer toutes les balles
          data.player1.x = 150;
          data.player1.y = 300;
          data.player2.x = 1475;
          data.player2.y = 300;
          data.fireballs = [];
          
          playerHit = true;
          break;
        }
      }

      // Si un joueur a été touché, on a réinitialisé toutes les balles, donc on sort de la boucle
      if (playerHit) {
        break;
      }
    }

    // Envoyer les mises à jour
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

    // Sauvegarder dans l'historique
    this.gameHistoryService.create({
      gametype: session.gametype,
      players: [session.data.player1.user.id, session.data.player2.user.id],
      winner: winner.id,
    });

    // Si c'est un match de tournoi, passer au match suivant
    if (session.tournamentId && session.matchId) {
      this.handleTournamentMatchEnd(session.id, winner.id);
    }
  }
}

