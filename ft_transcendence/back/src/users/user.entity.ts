import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuthorityEnum } from './enums/authority.enum';
import { Exclude } from 'class-transformer';
import { object } from 'joi';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', unique: true })
  nickname: string;

  @Column({
    type: 'text',
    transformer: {
      from: (value: string) => JSON.parse(value) as AuthorityEnum[],
      to: (value: AuthorityEnum[]) => JSON.stringify(value),
    },
  })
  authority: AuthorityEnum[];

  @Exclude()
  @Column({ type: 'text' })
  pubkey: string;

  @Exclude()
  @Column({ type: 'text' })
  keysalt: string;

  @Column({
    type: 'text',
    default: '[]',
    transformer: {
      from: (value: unknown) => {
        if (Array.isArray(value)) return value as string[];
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as string[];
          } catch (e) {
            return [];
          }
        }
        return [];
      },
      to: (value: string[]) => JSON.stringify(value),
    },
  })
  friends: string[];

  @Column({ type: 'text', default: 'offline' })
  status: 'online' | 'offline' | 'in_game';

  @Column({ type: 'text', nullable: true })
  currentGameId?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;
}
