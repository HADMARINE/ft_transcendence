import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';
import { DataSortDto } from './data-sort.dto';

export class FindAllFactoryDto {
  @IsOptional()
  @Type(() => PaginationQueryDto)
  pagination?: PaginationQueryDto;

  @IsOptional()
  @Type(() => DataSortDto)
  sort?: DataSortDto;
}


