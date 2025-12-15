import { AuthorityEnum } from 'src/users/enums/authority.enum';
import { TokenType } from '../enum/token-type.enum';

export class TokenPayloadEntity {
  user: string;
  type: TokenType;
  authority: AuthorityEnum[];
}
