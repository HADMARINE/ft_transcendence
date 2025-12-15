import { User } from '../user.entity';

export class FindAllUsersDto {
  query: Partial<{
    email: string;
    nickname: string;
    id: string;
  }>;
  pagination: {
    page: number;
    count: number;
  };
  order: Record<keyof User, 'ASC' | 'DESC' | 'asc' | 'desc'>;
}
