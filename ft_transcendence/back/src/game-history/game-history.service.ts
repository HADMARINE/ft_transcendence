import { Injectable, Logger } from '@nestjs/common';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { UpdateGameHistoryDto } from './dto/update-game-history.dto';
import { GameHistory } from './entities/game-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetMyGameHistoryDto } from './dto/get-my-game-history.dto';
import { GetAllGameHistoryDto } from './dto/get-all-game-history.dto';
import { DataNotFoundException } from 'src/errors/exceptions/data-not-found.exception';
import { GametypeEnum } from 'src/game-session/enum/game-type.enum';

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(GameHistory)
    private readonly gameHistoryRepository: Repository<GameHistory>,
  ) {}

  private readonly logger = new Logger(GameHistoryService.name);

  async create(
    createGameHistoryDto: CreateGameHistoryDto,
  ): Promise<GameHistory> {
    const gameHistory = new GameHistory();

    gameHistory.gametype = createGameHistoryDto.gametype;
    gameHistory.players = createGameHistoryDto.players;
    gameHistory.winner = createGameHistoryDto.winner;
    gameHistory.date = Date.now();

    try {
      await this.gameHistoryRepository.save(gameHistory);

      return gameHistory;
    } catch (err) {
      this.logger.debug(err);
      throw err;
    }
  }

  async findAll(query: GetAllGameHistoryDto): Promise<GameHistory[]> {
    const result = await this.gameHistoryRepository.find({
      order: query.sort ? { [query.sort.field]: query.sort.order } : undefined,
      skip: query.pagination
        ? (query.pagination?.count || 0) * (query.pagination.page || 0)
        : undefined,
      take: query.pagination?.count || undefined,
    });

    if (query.query && query.query?.players)
      result.filter((value) =>
        value.players.includes(query.query?.players as string),
      );

    return result;
  }

  async findById(id: string): Promise<GameHistory> {
    const gameHistory = await this.gameHistoryRepository.findOne({
      where: { id },
    });
    if (!gameHistory) {
      throw new DataNotFoundException({ name: 'game history' });
    }
    return gameHistory;
  }

  async getStatictics(userid: string): Promise<{
    general: {
      wins: number;
      losses: number;
      totalGames: number;
      victoryRate: number; // percentage
    };
    pong: {
      wins: number;
      losses: number;
      totalGames: number;
      victoryRate: number;
    };
    shoot: {
      wins: number;
      losses: number;
      totalGames: number;
      victoryRate: number;
    };
  }> {
    // I know that this is not the most efficient way to do it, but it is the simplest
    const gameHistories = (await this.gameHistoryRepository.find()).filter(
      (value) => value.players.includes(userid),
    );

    const result: Awaited<ReturnType<GameHistoryService['getStatictics']>> = {
      general: {
        wins: gameHistories.filter((value) => value.winner === userid).length,
        losses: 0,
        totalGames: gameHistories.length,
        victoryRate: 0,
      },
      pong: {
        wins: 0,
        losses: 0,
        totalGames: gameHistories.filter(
          (value) => value.gametype === GametypeEnum.PONG,
        ).length,
        victoryRate: 0,
      },
      shoot: {
        wins: 0,
        losses: 0,
        totalGames: gameHistories.filter(
          (value) => value.gametype === GametypeEnum.SHOOT,
        ).length,
        victoryRate: 0,
      },
    };
    result.general.losses = result.general.totalGames - result.general.wins;
    result.general.victoryRate =
      result.general.totalGames > 0
        ? (result.general.wins / result.general.totalGames) * 100
        : 0;

    result.pong.wins = gameHistories.filter(
      (value) =>
        value.gametype === GametypeEnum.PONG && value.winner === userid,
    ).length;
    result.pong.losses = result.pong.totalGames - result.pong.wins;
    result.pong.victoryRate =
      result.pong.totalGames > 0
        ? (result.pong.wins / result.pong.totalGames) * 100
        : 0;

    result.shoot.wins = gameHistories.filter(
      (value) =>
        value.gametype === GametypeEnum.SHOOT && value.winner === userid,
    ).length;
    result.shoot.losses = result.shoot.totalGames - result.shoot.wins;
    result.shoot.victoryRate =
      result.shoot.totalGames > 0
        ? (result.shoot.wins / result.shoot.totalGames) * 100
        : 0;

    return result;
  }
}
