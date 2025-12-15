import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { GameHistoryService } from './game-history.service';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GetMyGameHistoryDto } from './dto/get-my-game-history.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { GetAllGameHistoryDto } from './dto/get-all-game-history.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthorityEnum } from 'src/users/enums/authority.enum';

@Controller('game-history')
export class GameHistoryController {
  constructor(private readonly gameHistoryService: GameHistoryService) {}

  @Post()
  @Roles(AuthorityEnum.NORMAL)
  create(@Body() createGameHistoryDto: CreateGameHistoryDto) {
    return this.gameHistoryService.create(createGameHistoryDto);
  }

  @Get()
  @Roles(AuthorityEnum.NORMAL)
  findAll(@Query() query: GetAllGameHistoryDto) {
    return this.gameHistoryService.findAll(query);
  }

  @Get('/me')
  @Roles(AuthorityEnum.NORMAL)
  findMyGame(
    @Query() query: GetMyGameHistoryDto,
    @Req() request: RequestWithUser,
  ) {
    const newQuery: GetAllGameHistoryDto = query;
    newQuery.query = { players: request.user.id };
    return this.findAll(newQuery);
  }

  @Get('/me/statistics')
  @Roles(AuthorityEnum.NORMAL)
  getMyStatistics(@Req() request: RequestWithUser) {
    return this.gameHistoryService.getStatictics(request.user.id);
  }

  @Get(':id')
  @Roles(AuthorityEnum.NORMAL)
  findOne(@Param('id') id: string) {
    return this.gameHistoryService.findById(id);
  }
}
