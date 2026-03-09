"use client";

interface TournamentPlayer {
  id: string;
  nickname: string;
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

interface TournamentBracketProps {
  matches: TournamentMatch[];
  players: TournamentPlayer[];
  currentMatchId: string | null;
}

const styles = {
  bracketContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "1400px",
    padding: "20px",
  },
  roundsContainer: {
    display: "flex",
    gap: "60px",
    alignItems: "flex-start",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  roundColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "40px",
    minWidth: "250px",
  },
  roundTitle: {
    fontSize: "1.3rem",
    color: "#4cc9f0",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "20px",
    textTransform: "uppercase",
  },
  matchCard: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    border: "2px solid #4cc9f0",
    borderRadius: "12px",
    padding: "15px",
    minWidth: "220px",
    position: "relative",
    transition: "all 0.3s ease",
  },
  matchCardCurrent: {
    border: "3px solid #f72585",
    boxShadow: "0 0 20px rgba(247, 37, 133, 0.6)",
    transform: "scale(1.05)",
  },
  matchCardCompleted: {
    border: "2px solid #4caf50",
    backgroundColor: "rgba(22, 33, 62, 0.6)",
  },
  matchCardPending: {
    border: "2px solid #666",
    backgroundColor: "rgba(22, 33, 62, 0.5)",
  },
  matchHeader: {
    fontSize: "0.9rem",
    color: "#a0a0a0",
    marginBottom: "10px",
    textAlign: "center",
  },
  playerSlot: {
    backgroundColor: "rgba(76, 201, 240, 0.1)",
    border: "1px solid #4cc9f0",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerSlotWinner: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    border: "2px solid #4caf50",
    fontWeight: "bold",
  },
  playerSlotLoser: {
    opacity: 0.5,
  },
  playerSlotEmpty: {
    backgroundColor: "rgba(100, 100, 100, 0.1)",
    border: "1px dashed #666",
    color: "#666",
    fontStyle: "italic",
  },
  playerName: {
    fontSize: "1rem",
    color: "#fff",
  },
  winnerIcon: {
    color: "#4caf50",
    fontSize: "1.2rem",
  },
  vsText: {
    textAlign: "center",
    color: "#f72585",
    fontSize: "0.9rem",
    fontWeight: "bold",
    margin: "5px 0",
  },
  statusBadge: {
    fontSize: "0.75rem",
    padding: "4px 8px",
    borderRadius: "12px",
    textAlign: "center",
    marginTop: "8px",
    fontWeight: "bold",
  },
  statusPending: {
    backgroundColor: "rgba(156, 156, 156, 0.2)",
    border: "1px solid #9c9c9c",
    color: "#9c9c9c",
  },
  statusInProgress: {
    backgroundColor: "rgba(247, 37, 133, 0.2)",
    border: "1px solid #f72585",
    color: "#f72585",
  },
  statusCompleted: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    border: "1px solid #4caf50",
    color: "#4caf50",
  },
  connector: {
    width: "30px",
    height: "2px",
    backgroundColor: "#4cc9f0",
    position: "absolute",
    right: "-30px",
    top: "50%",
  },
};

export default function TournamentBracket({ matches, players, currentMatchId }: TournamentBracketProps) {
  // Organiser les matchs par rounds
  const rounds: TournamentMatch[][] = [];
  const maxRound = Math.max(...matches.map(m => m.round));
  
  for (let r = 0; r <= maxRound; r++) {
    const roundMatches = matches
      .filter(m => m.round === r)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    rounds.push(roundMatches);
  }

  const getRoundTitle = (roundIndex: number, totalRounds: number) => {
    const matchesInRound = rounds[roundIndex].length;
    
    if (roundIndex === totalRounds - 1) {
      return "🏆 Finale";
    } else if (roundIndex === totalRounds - 2) {
      return "⚔️ Demi-finales";
    } else if (matchesInRound === 4) {
      return "🎮 Quarts de finale";
    } else {
      return `Round ${roundIndex + 1}`;
    }
  };

  const getMatchCardStyle = (match: TournamentMatch) => {
    let style = { ...styles.matchCard };
    
    if (match.id === currentMatchId) {
      style = { ...style, ...styles.matchCardCurrent };
    } else if (match.status === 'completed') {
      style = { ...style, ...styles.matchCardCompleted };
    } else if (match.status === 'pending') {
      style = { ...style, ...styles.matchCardPending };
    }
    
    return style;
  };

  const getPlayerSlotStyle = (player: TournamentPlayer | null, match: TournamentMatch) => {
    let style = { ...styles.playerSlot };
    
    if (!player) {
      return { ...style, ...styles.playerSlotEmpty };
    }
    
    if (match.winner?.id === player.id) {
      style = { ...style, ...styles.playerSlotWinner };
    } else if (match.status === 'completed') {
      style = { ...style, ...styles.playerSlotLoser };
    }
    
    return style;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { ...styles.statusBadge, ...styles.statusPending };
      case 'in_progress':
        return { ...styles.statusBadge, ...styles.statusInProgress };
      case 'completed':
        return { ...styles.statusBadge, ...styles.statusCompleted };
      default:
        return styles.statusBadge;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return '⚡ En cours';
      case 'completed':
        return '✓ Terminé';
      default:
        return status;
    }
  };

  return (
    <div style={styles.bracketContainer as React.CSSProperties}>
      <div style={styles.roundsContainer as React.CSSProperties}>
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} style={styles.roundColumn as React.CSSProperties}>
            <h3 style={styles.roundTitle as React.CSSProperties}>
              {getRoundTitle(roundIndex, rounds.length)}
            </h3>
            {roundMatches.map((match, matchIndex) => (
              <div
                key={match.id}
                style={getMatchCardStyle(match) as React.CSSProperties}
              >
                <div style={styles.matchHeader as React.CSSProperties}>
                  Match {match.matchIndex + 1}
                </div>
                
                <div style={getPlayerSlotStyle(match.player1, match) as React.CSSProperties}>
                  <span style={styles.playerName as React.CSSProperties}>
                    {match.player1?.nickname || "En attente"}
                  </span>
                  {match.winner?.id === match.player1?.id && (
                    <span style={styles.winnerIcon as React.CSSProperties}>🏆</span>
                  )}
                </div>

                <div style={styles.vsText as React.CSSProperties}>VS</div>

                <div style={getPlayerSlotStyle(match.player2, match) as React.CSSProperties}>
                  <span style={styles.playerName as React.CSSProperties}>
                    {match.player2?.nickname || "En attente"}
                  </span>
                  {match.winner?.id === match.player2?.id && (
                    <span style={styles.winnerIcon as React.CSSProperties}>🏆</span>
                  )}
                </div>

                <div style={getStatusBadgeStyle(match.status) as React.CSSProperties}>
                  {getStatusText(match.status)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
