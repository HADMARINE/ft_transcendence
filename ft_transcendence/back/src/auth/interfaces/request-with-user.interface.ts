import { Request } from 'express';
import { FastifyRequest } from 'fastify';
import { User } from 'src/users/user.entity';

export interface RequestWithUser extends FastifyRequest {
  user: User;
}
