import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { DataNotFoundException } from 'src/errors/exceptions/data-not-found.exception';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UtilsService } from 'src/utils/utils.service';
import { AuthorityEnum } from './enums/authority.enum';
import { GameHistoryService } from 'src/game-history/game-history.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(UtilsService) private readonly utilsService: UtilsService,
    @Inject(forwardRef(() => GameHistoryService))
    private readonly gameHistoryService: GameHistoryService,
  ) {}

  async createOne(createUserDto: CreateUserDto): Promise<void> {
    const user = new User();
    user.email = createUserDto.email;
    user.nickname = createUserDto.nickname;
    user.authority = [AuthorityEnum.NORMAL];
    const password = this.authService.createPassword(createUserDto.password);
    user.pubkey = password.pubkey;
    user.keysalt = password.salt;

    try {
      await this.usersRepository.save(user);
    } catch (err) {
      this.logger.debug(err);
      throw err;
    }
  }

  async createMany(createUserDtos: CreateUserDto[]): Promise<void> {
    for (const createUserDto of createUserDtos) {
      await this.createOne(createUserDto);
    }
  }

  async findAll(findAllUsersDto: FindAllUsersDto): Promise<User[]> {
    const users = await this.usersRepository.find(
      this.utilsService.queryNullableFilter({
        where: findAllUsersDto.query,
        skip:
          findAllUsersDto.pagination.count * findAllUsersDto.pagination.page,
        take: findAllUsersDto.pagination.count,
        order: findAllUsersDto.order,
      }),
    );

    if (!users || users.length === 0) {
      throw new DataNotFoundException({ name: 'users' });
    }
    return users;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }
    return user;
  }

  async findOnePublic(id: string): Promise<any> {
    const user = await this.findOne(id);
    
    return {
      id: user.id,
      username: user.nickname,
      email: user.email,
      authority: user.authority.includes(AuthorityEnum.ADMIN) ? 'ADMIN' : 'NORMAL',
      avatar: user.avatar,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.nickname) {
      user.nickname = updateUserDto.nickname;
    }
    if (updateUserDto.password) {
      const password = this.authService.createPassword(updateUserDto.password);
      user.pubkey = password.pubkey;
      user.keysalt = password.salt;
    }

    await this.usersRepository.save(user);
    return user;
  }

  async updateEmail(
    id: string,
    newEmail: string,
    currentPassword: string,
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.debug(`updateEmail called for user ${id} with new email ${newEmail}`);
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    
    const isValid = this.authService.verifyPassword(
      currentPassword,
      user.pubkey,
      user.keysalt,
    );
    
    this.logger.debug(`Password verification result: ${isValid}`);
    
    if (!isValid) {
      return { success: false, message: 'Invalid current password' };
    }

    
    const existingUser = await this.usersRepository.findOne({ where: { email: newEmail } });
    if (existingUser && existingUser.id !== id) {
      return { success: false, message: 'Email already in use' };
    }

    try {
      user.email = newEmail;
      await this.usersRepository.save(user);
      this.logger.debug(`Email updated successfully for user ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error updating email:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: 'Email already in use' };
      }
      return { success: false, message: 'Failed to update email' };
    }
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message?: string }> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    
    const isValid = this.authService.verifyPassword(
      currentPassword,
      user.pubkey,
      user.keysalt,
    );
    if (!isValid) {
      return { success: false, message: 'Invalid current password' };
    }

    const password = this.authService.createPassword(newPassword);
    user.pubkey = password.pubkey;
    user.keysalt = password.salt;
    await this.usersRepository.save(user);
    return { success: true };
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.softRemove({ id });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }
  }

  
  async getFriends(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !user.friends || user.friends.length === 0) {
      return [];
    }

    const friends = await this.usersRepository.findBy({ id: In(user.friends) });
    return friends.map((f) => ({
      id: f.id,
      username: f.nickname,
      email: f.email,
      status: f.status || 'offline',
      currentGameId: f.currentGameId,
    }));
  }

  async getFriendRequests(userId: string) {
    
    return [];
  }

  async sendFriendRequest(userId: string, targetId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    const target = await this.usersRepository.findOneBy({ id: targetId });

    if (!user || !target) {
      return { success: false, message: 'User not found' };
    }

    user.friends = Array.isArray(user.friends) ? user.friends : [];
    target.friends = Array.isArray(target.friends) ? target.friends : [];

    if (user.friends.includes(targetId)) {
      return { success: false, message: 'Already friends' };
    }

    
    user.friends.push(targetId);
    target.friends.push(userId);

    await this.usersRepository.save([user, target]);
    return { success: true };
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    
    return { success: true };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    
    return { success: true };
  }

  async removeFriend(userId: string, friendId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    const friend = await this.usersRepository.findOneBy({ id: friendId });

    if (!user || !friend) {
      return { success: false, message: 'User not found' };
    }

    
    user.friends = user.friends.filter((id) => id !== friendId);
    
    friend.friends = friend.friends.filter((id) => id !== userId);

    await this.usersRepository.save([user, friend]);
    return { success: true };
  }

  async searchUsers(query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.nickname) LIKE :query', {
        query: `%${query.toLowerCase()}%`,
      })
      .orWhere('LOWER(user.email) LIKE :query', {
        query: `%${query.toLowerCase()}%`,
      })
      .take(20)
      .getMany();

    return users.map((u) => ({
      id: u.id,
      username: u.nickname,
      email: u.email,
    }));
  }

  async getUserStats(userId: string) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    
    const allGames = await this.gameHistoryService.findAll({});
    const userGames = allGames.filter((game: any) => 
      game.players.includes(userId)
    );

    
    const totalGames = userGames.length;
    const wins = userGames.filter((game: any) => game.winner === userId).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    
    const gamesByType: { [key: string]: { played: number; won: number; lost: number } } = {};
    
    userGames.forEach((game: any) => {
      const gameType = game.gametype;
      if (!gamesByType[gameType]) {
        gamesByType[gameType] = { played: 0, won: 0, lost: 0 };
      }
      gamesByType[gameType].played++;
      if (game.winner === userId) {
        gamesByType[gameType].won++;
      } else {
        gamesByType[gameType].lost++;
      }
    });

    const games = Object.keys(gamesByType).map(gameType => ({
      game: gameType,
      played: gamesByType[gameType].played,
      won: gamesByType[gameType].won,
      lost: gamesByType[gameType].lost,
    }));

    
    const history = await Promise.all(
      userGames
        .sort((a: any, b: any) => b.date - a.date)
        .slice(0, 20)
        .map(async (game: any) => {
          const opponentId = game.players.find((p: string) => p !== userId);
          let opponentName = 'Inconnu';
          
          if (opponentId) {
            try {
              const opponent = await this.findOne(opponentId);
              opponentName = opponent?.nickname || 'Inconnu';
            } catch (e) {
              
            }
          }

          return {
            id: game.id,
            game: game.gametype,
            result: game.winner === userId ? 'win' : 'loss',
            date: new Date(game.date).toLocaleDateString('fr-FR'),
            opponentId: opponentId || '',
            opponentName,
          };
        })
    );

    return {
      totalGames,
      winRate,
      games,
      history,
    };
  }

  async updateUserStatus(
    userId: string,
    status: 'online' | 'offline' | 'in_game',
    currentGameId?: string,
  ) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    user.status = status;
    if (status === 'in_game' && currentGameId) {
      user.currentGameId = currentGameId;
    } else if (status !== 'in_game') {
      user.currentGameId = undefined;
    }

    await this.usersRepository.save(user);
    return { success: true, status: user.status };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    console.log('updateAvatar called with:', { userId, avatarUrl });
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new DataNotFoundException({ name: 'user' });
    }

    user.avatar = avatarUrl;
    await this.usersRepository.save(user);
    console.log('Avatar saved successfully for user:', userId);
    return { success: true, avatar: avatarUrl };
  }
}
