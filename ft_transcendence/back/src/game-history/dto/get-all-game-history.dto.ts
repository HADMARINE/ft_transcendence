import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { FindAllFactoryDto } from 'src/dtos/find-all-factory.dto';

class GameHistoryQuery {
  @IsOptional()
  @IsString()
  players?: string;
}

export class GetAllGameHistoryDto extends FindAllFactoryDto {
  @IsOptional()
  @Type(() => GameHistoryQuery)
  query?: GameHistoryQuery;
}
