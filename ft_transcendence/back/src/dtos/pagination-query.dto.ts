import { IsNumberString, IsOptional } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsNumberString()
  count?: number; 

  @IsOptional()
  @IsNumberString()
  page?: number; 
}
