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
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
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
import { FastifyReply } from 'fastify';
import { Public } from 'src/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('avatars/:filename')
  async getAvatar(
    @Param('filename') filename: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const fs = await import('fs/promises');
      const filePath = join(process.cwd(), 'public', 'avatars', filename);
      
      
      await fs.access(filePath);
      
      
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
      
      
      const fileBuffer = await fs.readFile(filePath);
      
      
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Content-Type', mimeType);
      res.header('Cache-Control', 'public, max-age=31536000');
      
      return res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException('Avatar not found');
    }
  }

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

  @Post('me/avatar')
  @Roles(AuthorityEnum.NORMAL)
  async uploadAvatar(
    @Req() request: RequestWithUser,
    @Body() body: { image: string; filename: string }
  ) {
    const user = request.user;
    
    try {
      
      if (!body.image || !body.filename) {
        throw new BadRequestException('No image data provided');
      }

      
      const matches = body.image.match(/^data:image\/([a-zA-Z]*);base64,([^\"]*)/);
      if (!matches || matches.length !== 3) {
        throw new BadRequestException('Invalid image format');
      }

      const imageType = matches[1];
      const base64Data = matches[2];

      const allowedTypes = ['jpeg', 'jpg', 'png', 'gif'];
      if (!allowedTypes.includes(imageType.toLowerCase())) {
        throw new BadRequestException('Only JPEG, PNG, and GIF images are allowed');
      }

      const uniqueFilename = `avatar-${randomBytes(16).toString('hex')}-${Date.now()}.${imageType}`;
      const uploadPath = join(process.cwd(), 'public', 'avatars');
      const filePath = join(uploadPath, uniqueFilename);

      const fs = await import('fs/promises');
      await fs.mkdir(uploadPath, { recursive: true });

      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length > 5 * 1024 * 1024) {
        throw new BadRequestException('Image size must not exceed 5MB');
      }

      await fs.writeFile(filePath, buffer);

      const avatarUrl = `/users/avatars/${uniqueFilename}`;
      await this.usersService.updateAvatar(user.id, avatarUrl);

      return {
        success: true,
        avatar: avatarUrl,
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload avatar');
    }
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
  deleteMe(@Req() request: RequestWithUser) {
    return this.usersService.remove(request.user.id);
  }
}
