import { IsNumberString, IsOptional } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsNumberString()
  count?: number; // Number of rows to fetch from the DB

  @IsOptional()
  @IsNumberString()
  page?: number; // Number of ROWS to skip
}

/**
 * Pagination dto
 */
