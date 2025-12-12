import { client } from "./client";

export type GameStats = {
  game: string;
  played: number;
  won: number;
  lost: number;
};

export type MatchHistory = {
  id: string;
  game: string;
  result: 'win' | 'loss';
  date: string;
  opponentId: string;
  opponentName: string;
  score?: string;
};

export type UserStats = {
  totalGames: number;
  winRate: number;
  games: GameStats[];
  history: MatchHistory[];
};

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const result = await client.get<UserStats>(`/users/${userId}/stats`);
  if (result.result === true) return result.data;
  return null;
}