"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameData } from "@/util/useGameData";
import { getCurrentUser } from "@/api/users";
import TournamentBracket from "../../../../components/TournamentBracket";

interface TournamentPlayer {
  id: string;
  nickname: string;
  email?: string;
}

interface TournamentMatch {
  id: string;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  status: 'pending' | 'in_progress' | 'completed';
  round: number;
  matchIndex: number;
}

interface TournamentState {
  tournamentId: string;
  gametype: string;
  status: 'waiting' | 'in_progress' | 'completed';
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatch: {
    id: string;
    player1: TournamentPlayer | null;
    player2: TournamentPlayer | null;
    round: number;
    matchIndex: number;
  } | null;
  winner: TournamentPlayer | null;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e6e6e6",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    overflowY: "auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "10px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#f72585",
  },
  statusBadge: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "1rem",
    fontWeight: "bold",
    marginTop: "10px",
  },
  waiting: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
    border: "2px solid #ffc107",
    color: "#ffc107",
  },
  inProgress: {
    backgroundColor: "rgba(76, 201, 240, 0.2)",
    border: "2px solid #4cc9f0",
    color: "#4cc9f0",
  },
  completed: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    border: "2px solid #4caf50",
    color: "#4caf50",
  },
  currentMatchBanner: {
    backgroundColor: "rgba(247, 37, 133, 0.1)",
    border: "2px solid #f72585",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "30px",
    width: "100%",
    maxWidth: "600px",
    textAlign: "center",
  },
  currentMatchTitle: {
    fontSize: "1.3rem",
    color: "#f72585",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  versus: {
    fontSize: "1.5rem",
    color: "#4cc9f0",
    margin: "10px 0",
  },
  playerName: {
    fontSize: "1.2rem",
    color: "#fff",
    fontWeight: "bold",
  },
  spectatorBadge: {
    backgroundColor: "rgba(156, 39, 176, 0.2)",
    border: "2px solid #9c27b0",
    color: "#9c27b0",
    padding: "10px 20px",
    borderRadius: "25px",
    marginTop: "10px",
    fontSize: "1rem",
    fontWeight: "bold",
  },
  winnerAnnouncement: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    border: "3px solid #4caf50",
    borderRadius: "20px",
    padding: "30px",
    marginTop: "20px",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(76, 175, 80, 0.5)",
  },
  winnerTitle: {
    fontSize: "2rem",
    color: "#4caf50",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  winnerName: {
    fontSize: "2.5rem",
    color: "#fff",
    fontWeight: "bold",
    textShadow: "0 0 15px rgba(76, 175, 80, 0.8)",
  },
  backButton: {
    backgroundColor: "#4cc9f0",
    color: "#1a1a2e",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    marginTop: "20px",
    transition: "all 0.3s ease",
  },
};

export default function TournamentPage() {
  const router = useRouter();
  const gameData = useGameData();
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user?.id) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!gameData.client) return;

    const handleTournamentBracket = (data: TournamentState) => {
      console.log(" Received tournament-bracket:", data);
      setTournamentState(data);

      if (data.currentMatch && currentUserId) {
        const isPlayer = 
          data.currentMatch.player1?.id === currentUserId ||
          data.currentMatch.player2?.id === currentUserId;
        setIsSpectator(!isPlayer);
      }
    };

    const handleMatchStarting = (data: any) => {
      console.log(" Match starting:", data);
      
      if (currentUserId) {
        const isPlayer = 
          data.match.player1?.id === currentUserId ||
          data.match.player2?.id === currentUserId;
        
        if (isPlayer) {
          setIsSpectator(false);
        } else {
          setIsSpectator(true);
          console.log("️ Redirecting to spectator page for match:", data.match.id);
          router.push(`/shoot/1vs1-online/spectator?roomId=${data.match.id}&tournamentId=${data.tournamentId}&matchId=${data.match.id}`);
        }
      }
    };

    const handleMatchEnded = (data: any) => {
      console.log(" Match ended:", data);
    };

    const handleTournamentEnded = (data: any) => {
      console.log(" Tournament ended:", data);
      if (tournamentState) {
        setTournamentState({
          ...tournamentState,
          status: 'completed',
          winner: data.winner,
        });
      }

      setTimeout(() => {
        console.log(" Redirecting to home page...");
        router.push('/shoot');
      }, 5000);
    };

    const handleMatchConfig = (data: any) => {
      console.log(" Match config received:", data);
      
      if (currentUserId) {
        const isPlayer = 
          data.player1?.id === currentUserId ||
          data.player2?.id === currentUserId;
        
        if (isPlayer) {
          console.log(" Je suis un joueur de ce match, navigation vers Config");
          router.push(`/shoot/1vs1online/Config?roomId=${data.roomId}&tournamentId=${data.tournamentId}&matchId=${data.matchId}`);
        } else {
          console.log("️ Ce n'est pas mon match, je reste spectateur");
          setIsSpectator(true);
        }
      }
    };

    const handleSpectatorMode = (data: any) => {
      console.log("️ Received spectator-mode:", data);
      setIsSpectator(true);
      if (data.roomId) {
        console.log("️ Redirecting to spectator page via spectator-mode event");
        router.push(`/shoot/1vs1-online/spectator?roomId=${data.roomId}&tournamentId=${data.tournamentId || ''}&matchId=${data.matchId || ''}`);
      }
    };

    gameData.client.on("tournament-bracket", handleTournamentBracket);
    gameData.client.on("tournament-match-starting", handleMatchStarting);
    gameData.client.on("tournament-match-ended", handleMatchEnded);
    gameData.client.on("tournament-ended", handleTournamentEnded);
    gameData.client.on("match-config", handleMatchConfig);
    gameData.client.on("spectator-mode", handleSpectatorMode);

    return () => {
      gameData.client?.off("tournament-bracket", handleTournamentBracket);
      gameData.client?.off("tournament-match-starting", handleMatchStarting);
      gameData.client?.off("tournament-match-ended", handleMatchEnded);
      gameData.client?.off("tournament-ended", handleTournamentEnded);
      gameData.client?.off("match-config", handleMatchConfig);
      gameData.client?.off("spectator-mode", handleSpectatorMode);
    };
  }, [gameData.client, router, currentUserId, tournamentState]);

  useEffect(() => {
    const handleTournamentStarting = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(" Tournament starting (custom event):", customEvent.detail);
    };

    window.addEventListener("tournament-starting", handleTournamentStarting as EventListener);

    return () => {
      window.removeEventListener("tournament-starting", handleTournamentStarting as EventListener);
    };
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'waiting':
        return { ...styles.statusBadge, ...styles.waiting };
      case 'in_progress':
        return { ...styles.statusBadge, ...styles.inProgress };
      case 'completed':
        return { ...styles.statusBadge, ...styles.completed };
      default:
        return styles.statusBadge;
    }
  };

  const handleBackToMenu = () => {
    router.push("/shoot");
  };

  if (!tournamentState) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>
            Chargement du tournoi...
          </h1>
          <div className="shoot-lobby-spinner" style={{ margin: "20px auto" }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.header as React.CSSProperties}>
        <h1 style={styles.title as React.CSSProperties}>
          Tournoi - {tournamentState.gametype}
        </h1>
        <p style={styles.subtitle as React.CSSProperties}>
          {tournamentState.players.length} joueurs
        </p>
        <div style={getStatusStyle(tournamentState.status) as React.CSSProperties}>
          {tournamentState.status === 'waiting' && 'En attente'}
          {tournamentState.status === 'in_progress' && 'En cours'}
          {tournamentState.status === 'completed' && 'Terminé'}
        </div>
        {isSpectator && (
          <div style={styles.spectatorBadge as React.CSSProperties}>
            ️ Mode Spectateur
          </div>
        )}
      </div>

      {tournamentState.currentMatch && tournamentState.status === 'in_progress' && (
        <div style={styles.currentMatchBanner as React.CSSProperties}>
          <div style={styles.currentMatchTitle as React.CSSProperties}>
            ️ Match en cours
          </div>
          <div style={styles.playerName as React.CSSProperties}>
            {tournamentState.currentMatch.player1?.nickname || "En attente"}
          </div>
          <div style={styles.versus as React.CSSProperties}>VS</div>
          <div style={styles.playerName as React.CSSProperties}>
            {tournamentState.currentMatch.player2?.nickname || "En attente"}
          </div>
        </div>
      )}

      <TournamentBracket
        matches={tournamentState.matches}
        players={tournamentState.players}
        currentMatchId={tournamentState.currentMatch?.id || null}
      />

      {tournamentState.status === 'completed' && tournamentState.winner && (
        <div style={styles.winnerAnnouncement as React.CSSProperties}>
          <div style={styles.winnerTitle as React.CSSProperties}>
             Vainqueur du Tournoi 
          </div>
          <div style={styles.winnerName as React.CSSProperties}>
            {tournamentState.winner.nickname}
          </div>
          <button
            style={styles.backButton as React.CSSProperties}
            onClick={handleBackToMenu}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(76, 201, 240, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Retour au menu
          </button>
        </div>
      )}
    </div>
  );
}
