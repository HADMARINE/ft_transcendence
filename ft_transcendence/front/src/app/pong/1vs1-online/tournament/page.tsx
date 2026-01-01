"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GametypeEnum, useGameData } from "@/util/useGameData";

interface TournamentPlayer {
  id: string;
  nickname: string;
}

interface TournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  score: { player1: number; player2: number } | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TournamentState {
  id?: string;
  tournamentId?: string;
  gametype: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatch: { matchId: string; round: number; matchIndex: number; id?: string } | null;
  spectators: TournamentPlayer[];
  status: 'waiting' | 'in_progress' | 'completed';
  winner: TournamentPlayer | null;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e6e6e6",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "10px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "30px",
    color: "#f72585",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
    width: "100%",
    maxWidth: "1400px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  bracketContainer: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    border: "2px solid #4cc9f0",
    borderRadius: "15px",
    padding: "30px",
    minWidth: "800px",
    boxShadow: "0 0 30px rgba(76, 201, 240, 0.5)",
  },
  bracketTitle: {
    fontSize: "1.5rem",
    color: "#4cc9f0",
    marginBottom: "20px",
    textAlign: "center" as const,
  },
  bracketTree: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    gap: "40px",
    padding: "20px",
  },
  roundColumn: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "30px",
    alignItems: "center",
  },
  roundTitle: {
    fontSize: "1.2rem",
    color: "#f72585",
    marginBottom: "15px",
    textAlign: "center" as const,
  },
  matchCard: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "2px solid #4cc9f0",
    borderRadius: "10px",
    padding: "15px",
    minWidth: "200px",
    transition: "all 0.3s ease",
  },
  matchCardInProgress: {
    border: "2px solid #f72585",
    boxShadow: "0 0 20px rgba(247, 37, 133, 0.5)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  matchCardCompleted: {
    border: "2px solid #4caf50",
    opacity: 0.8,
  },
  matchPlayer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "5px",
    marginBottom: "5px",
    backgroundColor: "rgba(76, 201, 240, 0.1)",
  },
  matchPlayerWinner: {
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    border: "1px solid #4caf50",
  },
  matchPlayerLoser: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
  },
  matchPlayerWaiting: {
    backgroundColor: "rgba(100, 100, 100, 0.2)",
    border: "1px dashed #666",
  },
  playerName: {
    fontSize: "1rem",
    color: "#fff",
  },
  playerScore: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    color: "#4cc9f0",
  },
  matchVs: {
    textAlign: "center" as const,
    color: "#666",
    fontSize: "0.9rem",
    margin: "5px 0",
  },
  spectatorSection: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    border: "2px solid #f72585",
    borderRadius: "15px",
    padding: "20px",
    minWidth: "250px",
    maxHeight: "400px",
    overflowY: "auto" as const,
  },
  spectatorTitle: {
    fontSize: "1.3rem",
    color: "#f72585",
    marginBottom: "15px",
    textAlign: "center" as const,
  },
  spectatorList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  spectatorItem: {
    backgroundColor: "rgba(247, 37, 133, 0.1)",
    padding: "10px 15px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  spectatorIcon: {
    fontSize: "1.2rem",
  },
  currentMatchBanner: {
    backgroundColor: "rgba(247, 37, 133, 0.2)",
    border: "2px solid #f72585",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px",
    textAlign: "center" as const,
  },
  currentMatchText: {
    fontSize: "1.3rem",
    color: "#f72585",
    marginBottom: "10px",
  },
  currentMatchPlayers: {
    fontSize: "1.8rem",
    color: "#fff",
    fontWeight: "bold",
  },
  winnerBanner: {
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    border: "3px solid #4caf50",
    borderRadius: "15px",
    padding: "30px",
    textAlign: "center" as const,
    marginTop: "20px",
  },
  winnerTitle: {
    fontSize: "2rem",
    color: "#4caf50",
    marginBottom: "10px",
  },
  winnerName: {
    fontSize: "2.5rem",
    color: "#fff",
    fontWeight: "bold",
    textShadow: "0 0 20px rgba(76, 175, 80, 0.7)",
  },
  backButton: {
    backgroundColor: "transparent",
    color: "#4cc9f0",
    border: "2px solid #4cc9f0",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    marginTop: "20px",
  },
  youTag: {
    backgroundColor: "#4cc9f0",
    color: "#000",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.7rem",
    marginLeft: "5px",
    fontWeight: "bold",
  },
  isSpectating: {
    backgroundColor: "rgba(247, 37, 133, 0.2)",
    border: "1px solid #f72585",
    borderRadius: "8px",
    padding: "10px 15px",
    marginBottom: "20px",
    textAlign: "center" as const,
    color: "#f72585",
  },
};

export default function TournamentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const tournamentId = searchParams.get("tournamentId");

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
  }, []);

  useEffect(() => {
    const tournamentDataStr = sessionStorage.getItem('tournamentData');
    if (tournamentDataStr) {
      try {
        const tournamentData = JSON.parse(tournamentDataStr);
        console.log("Loading tournament data from sessionStorage:", tournamentData);
        setTournament(tournamentData);
        sessionStorage.removeItem('tournamentData');
      } catch (e) {
        console.error("Error parsing tournament data:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!gameData.client) {
      console.log(" No gameData.client");
      return;
    }

    console.log(` Tournament page socket: ${gameData.client.id}, connected: ${gameData.client.connected}, tournamentId: ${tournamentId}`);

    console.log(" Tournament page useEffect: Registering socket listeners. Current tournamentId from URL:", tournamentId);

    const onTournamentBracket = (data: TournamentState) => {
      console.log(" Tournament bracket received:", data);
      setTournament(data);
    };

    const onMatchStarting = (data: { tournamentId: string; matchId: string; round: number; matchIndex: number; player1: TournamentPlayer; player2: TournamentPlayer }) => {
      console.log("Match starting:", data);
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentMatch: { matchId: data.matchId, round: data.round, matchIndex: data.matchIndex },
          matches: prev.matches.map(m => 
            m.id === data.matchId ? { ...m, status: 'in_progress' as const } : m
          ),
        };
      });
    };

    const onMatchEnded = (data: { matchId: string; winnerId: string; score: { player1: number; player2: number } }) => {
      console.log("Match ended:", data);
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentMatch: null,
          matches: prev.matches.map(m => 
            m.id === data.matchId 
              ? { 
                  ...m, 
                  status: 'completed' as const,
                  winner: m.player1?.id === data.winnerId ? m.player1 : m.player2,
                  score: data.score,
                } 
              : m
          ),
        };
      });
    };

    const onTournamentWinner = (data: { tournamentId: string; winner: TournamentPlayer }) => {
      console.log("Tournament winner:", data);
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          winner: data.winner,
        };
      });
    };

    const onTournamentEnded = (data: { tournamentId: string; winner: any; finalRanking: any[] }) => {
      console.log(" Tournament ended:", data);
      setTournament(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          winner: data.winner,
        };
      });

      setTimeout(() => {
        console.log(" Redirecting to home page...");
        router.push('/pong');
      }, 5000);
    };

    const onTournamentCancelled = (data: { tournamentId: string; reason: string }) => {
      console.log(" Tournament cancelled:", data);
      alert(`Tournoi annulé: ${data.reason}`);
      router.push('/pong');
    };

    const onSpectatorMode = (data: { roomId: string; tournamentId: string; matchId: string; player1: TournamentPlayer; player2: TournamentPlayer }) => {
      console.log("️ Spectator mode - redirecting to spectator page:", data);
      setIsSpectator(true);
      
      const currentTournamentId = tournamentId || tournament?.tournamentId || tournament?.id;
      if (data.tournamentId === currentTournamentId) {
        router.push(`/pong/1vs1-online/spectator?roomId=${data.roomId}&tournamentId=${data.tournamentId}&matchId=${data.matchId}`);
      }
    };

    const onMatchConfig = (data: { roomId: string; tournamentId: string; matchId: string; player1: TournamentPlayer; player2: TournamentPlayer }) => {
      console.log(" MATCH CONFIG EVENT:", data);
      console.log("  tournamentId from URL:", tournamentId);
      console.log("  tournamentId from state:", tournament?.tournamentId || tournament?.id);

      const currentTournamentId = tournamentId || tournament?.tournamentId || tournament?.id;
      const isMyTournament = data.tournamentId === currentTournamentId;
      
      if (!isMyTournament) {
        console.log("️ TournamentId mismatch, ignoring match-config");
        console.log(`  Expected: ${currentTournamentId}, Got: ${data.tournamentId}`);
        return;
      }

      console.log(" NAVIGATING TO CONFIG PAGE");
      router.push(`/pong/1vs1-online/match-config?roomId=${data.roomId}&tournamentId=${data.tournamentId}&matchId=${data.matchId}&player1=${encodeURIComponent(data.player1.nickname)}&player2=${encodeURIComponent(data.player2.nickname)}`);
    };

    const onIngameComm = (data: { id: string; tournamentId?: string; status?: string }) => {
      console.log("Ingame comm received:", data);
      if (data.tournamentId && data.tournamentId === tournamentId) {
        router.push(`/pong/1vs1-online/game?roomId=${data.id}&tournamentId=${data.tournamentId}`);
      }
    };

    gameData.client.on("tournament-bracket", onTournamentBracket);
    gameData.client.on("match-starting", onMatchStarting);
    gameData.client.on("match-ended", onMatchEnded);
    gameData.client.on("tournament-winner", onTournamentWinner);
    gameData.client.on("tournament-ended", onTournamentEnded);
    gameData.client.on("tournament-cancelled", onTournamentCancelled);
    gameData.client.on("spectator-mode", onSpectatorMode);
    gameData.client.on("match-config", onMatchConfig); 
    gameData.client.on("ingame-comm", onIngameComm);

    const handleMatchConfigEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(" TOURNAMENT PAGE: Custom event 'match-config' received!", customEvent.detail);
      onMatchConfig(customEvent.detail);
    };
    window.addEventListener('match-config', handleMatchConfigEvent);

    console.log(" ALL LISTENERS REGISTERED on tournament page");

    return () => {
      gameData.client?.off("tournament-bracket", onTournamentBracket);
      gameData.client?.off("match-starting", onMatchStarting);
      gameData.client?.off("match-ended", onMatchEnded);
      gameData.client?.off("tournament-winner", onTournamentWinner);
      gameData.client?.off("tournament-ended", onTournamentEnded);
      gameData.client?.off("tournament-cancelled", onTournamentCancelled);
      gameData.client?.off("spectator-mode", onSpectatorMode);
      gameData.client?.off("match-config", onMatchConfig);
      gameData.client?.off("ingame-comm", onIngameComm);
      window.removeEventListener('match-config', handleMatchConfigEvent);
    };
  }, [gameData.client, router, tournamentId, tournament]);

  const getRoundName = (round: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - round;
    if (roundsFromEnd === 0) return "Finale";
    if (roundsFromEnd === 1) return "Demi-finales";
    if (roundsFromEnd === 2) return "Quarts de finale";
    return `Round ${round + 1}`;
  };

  const getMatchesByRound = (matches: TournamentMatch[]): Map<number, TournamentMatch[]> => {
    const byRound = new Map<number, TournamentMatch[]>();
    matches.forEach(match => {
      const roundMatches = byRound.get(match.round) || [];
      roundMatches.push(match);
      byRound.set(match.round, roundMatches);
    });
    return byRound;
  };

  const isCurrentUser = (player: TournamentPlayer | null): boolean => {
    return player?.id === currentUserId;
  };

  const handleBack = () => {
    router.push("/pong");
  };

  if (!tournament) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Chargement du tournoi...</h1>
        <p style={styles.subtitle}>Veuillez patienter</p>
      </div>
    );
  }

  const matchesByRound = getMatchesByRound(tournament.matches);
  const totalRounds = Math.max(...Array.from(matchesByRound.keys())) + 1;
  const currentMatch = tournament.matches.find(m => m.status === 'in_progress');

  return (
    <div style={styles.container}>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>

      <h1 style={styles.title}> Tournoi</h1>
      <p style={styles.subtitle}>
        {tournament.players.length} joueurs - {tournament.status === 'completed' ? 'Terminé' : 'En cours'}
      </p>

      {isSpectator && (
        <div style={styles.isSpectating}>
          ️ Vous êtes en mode spectateur
        </div>
      )}

      {}
      {currentMatch && currentMatch.player1 && currentMatch.player2 && (
        <div style={styles.currentMatchBanner}>
          <div style={styles.currentMatchText}>️ Match en cours</div>
          <div style={styles.currentMatchPlayers}>
            {currentMatch.player1.nickname}
            {isCurrentUser(currentMatch.player1) && <span style={styles.youTag}>VOUS</span>}
            {" vs "}
            {currentMatch.player2.nickname}
            {isCurrentUser(currentMatch.player2) && <span style={styles.youTag}>VOUS</span>}
          </div>
        </div>
      )}

      {}
      {tournament.winner && (
        <div style={styles.winnerBanner}>
          <div style={styles.winnerTitle}> Vainqueur du tournoi!</div>
          <div style={styles.winnerName}>
            {tournament.winner.nickname}
            {isCurrentUser(tournament.winner) && " (VOUS!)"}
          </div>
        </div>
      )}

      <div style={styles.mainContent}>
        {}
        <div style={styles.bracketContainer}>
          <h2 style={styles.bracketTitle}>Arbre du tournoi</h2>
          <div style={styles.bracketTree}>
            {Array.from(matchesByRound.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([round, matches]) => (
                <div key={round} style={styles.roundColumn}>
                  <div style={styles.roundTitle}>
                    {getRoundName(round, totalRounds)}
                  </div>
                  {matches.map(match => {
                    const isInProgress = match.status === 'in_progress';
                    const isCompleted = match.status === 'completed';
                    
                    return (
                      <div 
                        key={match.id} 
                        style={{
                          ...styles.matchCard,
                          ...(isInProgress ? styles.matchCardInProgress : {}),
                          ...(isCompleted ? styles.matchCardCompleted : {}),
                        }}
                      >
                        {}
                        <div style={{
                          ...styles.matchPlayer,
                          ...(match.player1 
                            ? (isCompleted 
                              ? (match.winner?.id === match.player1.id 
                                ? styles.matchPlayerWinner 
                                : styles.matchPlayerLoser)
                              : {})
                            : styles.matchPlayerWaiting),
                        }}>
                          <span style={styles.playerName}>
                            {match.player1?.nickname || "En attente..."}
                            {isCurrentUser(match.player1) && <span style={styles.youTag}>VOUS</span>}
                          </span>
                          {match.score && (
                            <span style={styles.playerScore}>{match.score.player1}</span>
                          )}
                        </div>

                        <div style={styles.matchVs}>VS</div>

                        {}
                        <div style={{
                          ...styles.matchPlayer,
                          ...(match.player2 
                            ? (isCompleted 
                              ? (match.winner?.id === match.player2.id 
                                ? styles.matchPlayerWinner 
                                : styles.matchPlayerLoser)
                              : {})
                            : styles.matchPlayerWaiting),
                        }}>
                          <span style={styles.playerName}>
                            {match.player2?.nickname || "En attente..."}
                            {isCurrentUser(match.player2) && <span style={styles.youTag}>VOUS</span>}
                          </span>
                          {match.score && (
                            <span style={styles.playerScore}>{match.score.player2}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>

        {}
        {tournament.spectators && tournament.spectators.length > 0 && (
          <div style={styles.spectatorSection}>
            <h3 style={styles.spectatorTitle}>
              ️ Spectateurs ({tournament.spectators.length})
            </h3>
            <div style={styles.spectatorList}>
              {tournament.spectators.map(spectator => (
                <div key={spectator.id} style={styles.spectatorItem}>
                  <span style={styles.spectatorIcon}></span>
                  <span>
                    {spectator.nickname}
                    {isCurrentUser(spectator) && <span style={styles.youTag}>VOUS</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tournament.status === 'completed' && (
        <button
          style={styles.backButton}
          onClick={handleBack}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#4cc9f0";
            e.currentTarget.style.color = "#000";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#4cc9f0";
          }}
        >
          Retour au menu
        </button>
      )}
    </div>
  );
}
