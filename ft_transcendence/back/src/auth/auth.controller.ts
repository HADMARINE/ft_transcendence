import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { FastifyReply } from 'fastify';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 300 } })
  @Post('login')
  login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user } = req;

    const cookieResult =
      this.authService.getCookieConfigTokenGenerationIntegrated(user);
    res.setCookie(...cookieResult);

    
    void this.usersService.updateUserStatus(user.id, 'online');

    return cookieResult[1];
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    
    if (req.user?.id) {
      void this.usersService.updateUserStatus(req.user.id, 'offline');
    }

    res.clearCookie('Authorization', {
      
      
      
      
      
    });
    return 'Hello';
  }

  @Get('verify/token')
  @Roles()
  verifyToken() {
    return 'OK';
  }
}
