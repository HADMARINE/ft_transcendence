import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthorityEnum } from './enums/authority.enum';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 300 } })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createOne(createUserDto);
  }

  @Post('bulk')
  @Roles(AuthorityEnum.ADMIN)
  createMany(@Body() createUserDtos: CreateUserDto[]) {
    return this.usersService.createMany(createUserDtos);
  }

  @Get()
  @Roles(AuthorityEnum.NORMAL)
  findAll(@Query() findAllUsersDto: FindAllUsersDto) {
    return this.usersService.findAll(findAllUsersDto);
  }

  // GET /users/me must be BEFORE /users/:id to avoid matching "me" as an id
  @Get('me')
  @Roles(AuthorityEnum.NORMAL)
  getMe(@Req() request: RequestWithUser) {
    return this.usersService.findOnePublic(request.user.id);
  }

  @Get('search')
  @Roles(AuthorityEnum.NORMAL)
  searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get(':id/stats')
  @Roles(AuthorityEnum.NORMAL)
  getUserStats(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  @Get(':id')
  @Roles(AuthorityEnum.NORMAL)
  findOne(@Param('id') id: string) {
    return this.usersService.findOnePublic(id);
  }

  // Friends APIs expected by front
  @Get(':id/friends')
  @Roles(AuthorityEnum.NORMAL)
  getFriends(@Param('id') id: string) {
    return this.usersService.getFriends(id);
  }

  @Get(':id/friend-requests')
  @Roles(AuthorityEnum.NORMAL)
  getFriendRequests(@Param('id') id: string) {
    return this.usersService.getFriendRequests(id);
  }

  @Post(':id/friend-requests/:targetId')
  @Roles(AuthorityEnum.NORMAL)
  sendFriendRequest(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
  ) {
    return this.usersService.sendFriendRequest(id, targetId);
  }

  @Post(':id/friend-requests/:requestId/accept')
  @Roles(AuthorityEnum.NORMAL)
  acceptFriendRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.usersService.acceptFriendRequest(id, requestId);
  }

  @Post(':id/friend-requests/:requestId/decline')
  @Roles(AuthorityEnum.NORMAL)
  declineFriendRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.usersService.declineFriendRequest(id, requestId);
  }

  @Delete(':id/friends/:friendId')
  @Roles(AuthorityEnum.NORMAL)
  removeFriend(
    @Param('id') id: string,
    @Param('friendId') friendId: string,
  ) {
    return this.usersService.removeFriend(id, friendId);
  }

  @Patch(':id')
  @Roles(AuthorityEnum.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch('me/email')
  @Roles(AuthorityEnum.NORMAL)
  updateMyEmail(
    @Req() request: RequestWithUser,
    @Body() updateEmailDto: UpdateEmailDto,
  ) {
    return this.usersService.updateEmail(
      request.user.id,
      updateEmailDto.email,
      updateEmailDto.currentPassword,
    );
  }

  @Patch('me/password')
  @Roles(AuthorityEnum.NORMAL)
  updateMyPassword(
    @Req() request: RequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(
      request.user.id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  @Patch('me/status')
  @Roles(AuthorityEnum.NORMAL)
  updateMyStatus(
    @Req() request: RequestWithUser,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      request.user.id,
      updateStatusDto.status,
      updateStatusDto.currentGameId,
    );
  }

  @Patch('me')
  @Roles(AuthorityEnum.NORMAL)
  updateMe(
    @Req() request: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(request.user.id, updateUserDto);
  }

  @Delete(':id')
  @Roles(AuthorityEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Delete('me')
  @Roles(AuthorityEnum.NORMAL)
  removeMe(@Req() request: RequestWithUser) {
    return this.usersService.remove(request.user.id);
  }
}
