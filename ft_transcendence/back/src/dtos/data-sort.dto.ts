import { IsEnum, IsString } from 'class-validator';

export enum DataSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class DataSortDto {
  @IsString()
  field: string;

  @IsEnum(DataSortOrder)
  order: DataSortOrder;
}


