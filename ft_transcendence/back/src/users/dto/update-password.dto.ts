import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;
}
