import { IsOptional, IsString, IsStrongPassword } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsStrongPassword()
  password?: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}
