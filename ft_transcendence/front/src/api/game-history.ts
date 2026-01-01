import { client } from "./client";

export async function getMyStatistics(): Promise<{
  general: {
    wins: number;
    losses: number;
    totalGames: number;
    victoryRate: number; 
  };
  pong: {
    wins: number;
    losses: number;
    totalGames: number;
    victoryRate: number;
  };
  shoot: {
    wins: number;
    losses: number;
    totalGames: number;
    victoryRate: number;
  };
} | null> {
  const result = await client.get("/game-history/me/statistics");
  if (result.result === true) return result.data;
  return null;
}

export async function getGameHistoryList(): Promise<{
  id: string;
  gametype: "PONG" | "SHOOT";
  date: number;
  players: string[];
  winner: string;
} | null> {
  const result = await client.get("/game-history/me");
  if (result.result === true) return result.data;
  return null;
}
