"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

export const TOKEN_SYNC_EVENT = "ft-token-changed";

export enum RegisterQueueStatus {
  REGISTERED = "REGISTERED",
  UNREGISTERED = "UNREGISTERED",
  NOT_REGISTERED = "NOT_REGISTERED",
  ALREADY_REGISTERED = "ALREADY_REGISTERED",
}

export enum IngameStatus {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  LOBBY = "LOBBY",
  IN_PROGRESS = "IN_PROGRESS",
  NEXT_ROUND_SELECT = "NEXT_ROUND_SELECT",
  INTERMISSION = "INTERMISSION",
  TERMINATED = "TERMINATED",
  PAUSED = "PAUSED",
}

export enum GametypeEnum {
  PONG = "PONG",
  SHOOT = "SHOOT",
}

export interface GameData<TGametype = unknown> {
  id: string;
  data: TGametype | null;
  status: IngameStatus;
  gametype: GametypeEnum;
  tournamentHistory: [string, string][][];
  [key: string]: unknown;
}

type GameDataContextValue = {
  isConnected: boolean;
  registerQueueStatus: RegisterQueueStatus;
  ingameData: GameData | null;
  gamedata: unknown | null;
  readyUsers: string[];
  isUserReady: boolean;
  client: Socket | null;
  status: IngameStatus | null;
  winner: string | null;
  sendGamedata: (data: unknown) => void;
  registerQueue: (gametype: GametypeEnum) => void;
  unregisterQueue: () => void;
  readyUser: () => void;
  cancelReadyUser: () => void;
  gameConfig: (config: { color: string; map: string }) => void;
  gameDataWinner: (winner: string) => void;
  gameDataShoot: (data: GamedataShootDto) => void;
  gameDataPong: (data: GamedataPongDto) => void;
  assureConnection: () => Promise<void>;
};

export enum OrientationEnum {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  UP = "UP",
  DOWN = "DOWN",
}

export interface GamedataShootDto {
  x: number;
  y: number;
  orientation: OrientationEnum;
  balls: { x: number; y: number }[];
}

export interface GamedataPongDto {
  y: number;
  ball?: { x: number; y: number };
}

const GLOBAL_KEY = "__FT_GAME_DATA_CONTEXT__";
const GameDataContext: React.Context<GameDataContextValue | undefined> =
  (globalThis as any)[GLOBAL_KEY] ||
  createContext<GameDataContextValue | undefined>(undefined);
if (!(globalThis as any)[GLOBAL_KEY])
  (globalThis as any)[GLOBAL_KEY] = GameDataContext;

const useClientToken = () => {
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const readToken = () => {
      const t = localStorage.getItem("token");
      return t || undefined;
    };
    const syncToken = () => setToken(readToken());

    
    syncToken();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "token") {
        syncToken();
      }
    };

    const handleCustomEvent = (_event?: Event) => syncToken();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TOKEN_SYNC_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        TOKEN_SYNC_EVENT,
        handleCustomEvent as EventListener,
      );
    };
  }, []);

  return token;
};

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const clientRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [registerQueueStatus, setRegisterQueueStatus] =
    useState<RegisterQueueStatus>(RegisterQueueStatus.NOT_REGISTERED);
  const [ingameData, setIngameData] = useState<GameData | null>(null);
  const [status, setStatus] = useState<IngameStatus | null>(null);
  const [gamedata, setGamedata] = useState<unknown | null>(null);
  const [readyUsers, setReadyUsers] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isUserReady, setIsUserReady] = useState<boolean>(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [pendingQueueGametype, setPendingQueueGametype] = useState<GametypeEnum | null>(null);

  const token = useClientToken();

  useEffect(() => {
    if (ingameData && ingameData.status !== status) {
      setStatus(ingameData.status);
    }
  }, [ingameData, status]);

  useEffect(() => {
    if (typeof window === 'undefined' || socketInitialized) return;

    console.log("Initializing socket connection with withCredentials...");
    setSocketInitialized(true);

    const client = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
      {
        autoConnect: true,
        transports: ["websocket"],
        withCredentials: true,
        auth: token ? { Authorization: token } : {},
      }
    );

    clientRef.current = client;

    client.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      
      if (pendingQueueGametype) {
        console.log("Reconnected, re-registering queue for:", pendingQueueGametype);
        setTimeout(() => {
          client.emit("register-queue", { gametype: pendingQueueGametype });
        }, 500);
      }
    });

    client.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    client.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    client.on("game-session", (data: GameData) => {
      setIngameData(prev => ({ ...prev, ...data }));
    });

    client.on("register-queue", (data: RegisterQueueStatus) => {
      console.log("Register Queue Status:", data);
      setRegisterQueueStatus(data);
      
      if (data === RegisterQueueStatus.REGISTERED || data === RegisterQueueStatus.ALREADY_REGISTERED) {
      } else if (data === RegisterQueueStatus.UNREGISTERED || data === RegisterQueueStatus.NOT_REGISTERED) {
        setPendingQueueGametype(null);
      }
    });

    client.on("ingame-comm", (data: GameData) => {
      setIngameData(prev => ({ ...prev, ...data }));
    });

    client.on("gamedata", (data: unknown) => {
      setGamedata(data);
    });

    client.on("ready-user", (userid: string) => {
      setReadyUsers(prev => [...prev, userid]);
    });

    client.on("cancel-ready-user", (userid: string) => {
      setReadyUsers(prev => prev.filter((id) => id !== userid));
    });

    client.on(
      "game-config",
      (data: { user: string; color: string; map: string }) => {
        setIngameData(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (!(updated as any).lobbyData) {
            (updated as any).lobbyData = {};
          }
          (updated as any).lobbyData[data.user] = {
            ...((updated as any).lobbyData?.[data.user] || {}),
            color: data.color,
            map: data.map,
          };
          return updated;
        });
      }
    );

    client.on("gamedata-winner", (data: string) => {
      setWinner(data);
    });

    client.on("user-status-updated", (data: { userId: string; status: string; currentGameId?: string }) => {
      console.log("User status updated:", data);
    });

    client.on("lobby-created", (data: { roomId: string; gametype: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY-CREATED EVENT IN PROVIDER ===", data);
      sessionStorage.setItem('lobbyData', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('lobby-created', { detail: data }));
      setPendingQueueGametype(null);
    });

    client.on("lobby-updated", (data: { roomId: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY-UPDATED EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('lobby-updated', { detail: data }));
    });

    client.on("lobby-countdown", (data: { roomId: string; timeRemaining: number; playerCount: number }) => {
      console.log("Lobby countdown:", data.timeRemaining);
      window.dispatchEvent(new CustomEvent('lobby-countdown', { detail: data }));
    });

    client.on("tournament-starting", (data: { roomId: string; format: string; players: any[]; brackets: string[][] }) => {
      console.log("=== TOURNAMENT-STARTING EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-starting', { detail: data }));
    });

    client.on("tournament-bracket", (data: any) => {
      console.log(" === TOURNAMENT-BRACKET EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-bracket', { detail: data }));
    });

    client.on("tournament-match-starting", (data: any) => {
      console.log(" === TOURNAMENT-MATCH-STARTING EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-match-starting', { detail: data }));
    });

    client.on("tournament-match-ended", (data: any) => {
      console.log(" === TOURNAMENT-MATCH-ENDED EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-match-ended', { detail: data }));
    });

    client.on("tournament-ended", (data: any) => {
      console.log(" === TOURNAMENT-ENDED EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-ended', { detail: data }));
    });

    client.on("tournament-cancelled", (data: any) => {
      console.log(" === TOURNAMENT-CANCELLED EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('tournament-cancelled', { detail: data }));
    });

    client.on("match-config", (data: any) => {
      console.log(" === MATCH-CONFIG EVENT IN PROVIDER === socket received event", data);
      console.log(" Dispatching custom event 'match-config'");
      window.dispatchEvent(new CustomEvent('match-config', { detail: data }));
    });

    client.on("match-config-spectator", (data: any) => {
      console.log("️ === MATCH-CONFIG-SPECTATOR EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('match-config-spectator', { detail: data }));
    });

    client.on("spectator-mode", (data: any) => {
      console.log("️ === SPECTATOR-MODE EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('spectator-mode', { detail: data }));
    });

    client.on("spectator-game", (data: any) => {
      console.log("️ === SPECTATOR-GAME EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('spectator-game', { detail: data }));
    });

    client.on("lobby-cancelled", (data: { reason: string }) => {
      console.log("=== LOBBY-CANCELLED EVENT IN PROVIDER ===", data);
      window.dispatchEvent(new CustomEvent('lobby-cancelled', { detail: data }));
    });

    return () => {
      console.log("Cleaning up socket connection...");
      client.removeAllListeners();
      if (client.connected) {
        client.disconnect();
      }
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [socketInitialized]);

  useEffect(() => {
    if (token && clientRef.current) {
      clientRef.current.auth = { Authorization: token };
      if (!clientRef.current.connected) {
        clientRef.current.connect();
      }
    }
  }, [token]);

  const sendGamedata = (data: unknown) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("gamedata", data);
    }
  };

  const registerQueue = (gametype: GametypeEnum) => {
    const client = clientRef.current;
    
    setPendingQueueGametype(gametype);
    
    const emitRegister = (socket: Socket) => {
      console.log("Emitting register-queue with gametype:", gametype);
      socket.emit("register-queue", { gametype });
    };

    if (client) {
      if (client.connected) {
        console.log("Client connected, emitting now");
        emitRegister(client);
      } else {
        console.log("Client exists but not connected, waiting for connection...");
        const onConnect = () => {
          console.log("Client now connected, emitting register-queue");
          emitRegister(client);
          client.off("connect", onConnect);
        };
        client.on("connect", onConnect);
        
        if (!client.hasListeners("register-queue")) {
          client.on("register-queue", (data: RegisterQueueStatus) => {
            console.log("Register Queue Status (reconnect):", data);
            setRegisterQueueStatus(data);
            
            if (data === RegisterQueueStatus.REGISTERED || data === RegisterQueueStatus.ALREADY_REGISTERED) {
            } else if (data === RegisterQueueStatus.NOT_REGISTERED) {
              console.warn("Failed to register, retrying in 1s...");
              setTimeout(() => {
                if (client.connected && pendingQueueGametype) {
                  emitRegister(client);
                }
              }, 1000);
            } else if (data === RegisterQueueStatus.UNREGISTERED) {
              setPendingQueueGametype(null);
            }
          });
        }
        
        client.connect();
      }
      return;
    }

    console.log("No client available, initializing socket...");
    const token = localStorage.getItem("token") || undefined;
    const newClient = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
      {
        autoConnect: true,
        transports: ["websocket"],
        withCredentials: true,
        auth: token ? { Authorization: token } : {},
      }
    );
    clientRef.current = newClient;

    newClient.on("lobby-created", (data: { roomId: string; gametype: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY-CREATED (new socket) ===", data);
      sessionStorage.setItem('lobbyData', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('lobby-created', { detail: data }));
    });

    newClient.on("lobby-updated", (data: { roomId: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY-UPDATED (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('lobby-updated', { detail: data }));
    });

    newClient.on("lobby-countdown", (data: { roomId: string; timeRemaining: number; playerCount: number }) => {
      window.dispatchEvent(new CustomEvent('lobby-countdown', { detail: data }));
    });

    newClient.on("tournament-starting", (data: any) => {
      console.log("=== TOURNAMENT-STARTING (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-starting', { detail: data }));
    });

    newClient.on("tournament-bracket", (data: any) => {
      console.log(" === TOURNAMENT-BRACKET (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-bracket', { detail: data }));
    });

    newClient.on("tournament-match-starting", (data: any) => {
      console.log(" === TOURNAMENT-MATCH-STARTING (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-match-starting', { detail: data }));
    });

    newClient.on("tournament-match-ended", (data: any) => {
      console.log(" === TOURNAMENT-MATCH-ENDED (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-match-ended', { detail: data }));
    });

    newClient.on("tournament-ended", (data: any) => {
      console.log(" === TOURNAMENT-ENDED (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-ended', { detail: data }));
    });

    newClient.on("tournament-cancelled", (data: any) => {
      console.log(" === TOURNAMENT-CANCELLED (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('tournament-cancelled', { detail: data }));
    });

    newClient.on("match-config", (data: any) => {
      console.log(" === MATCH-CONFIG (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('match-config', { detail: data }));
    });

    newClient.on("match-config-spectator", (data: any) => {
      console.log("️ === MATCH-CONFIG-SPECTATOR (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('match-config-spectator', { detail: data }));
    });

    newClient.on("spectator-mode", (data: any) => {
      console.log("️ === SPECTATOR-MODE (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('spectator-mode', { detail: data }));
    });

    newClient.on("spectator-game", (data: any) => {
      console.log("️ === SPECTATOR-GAME (new socket) ===", data);
      window.dispatchEvent(new CustomEvent('spectator-game', { detail: data }));
    });

    newClient.on("lobby-cancelled", (data: { reason: string }) => {
      window.dispatchEvent(new CustomEvent('lobby-cancelled', { detail: data }));
    });

    newClient.on("register-queue", (data: RegisterQueueStatus) => {
      console.log("Register Queue Status (new socket):", data);
      setRegisterQueueStatus(data);
    });

    newClient.on("lobby-update", (data: any) => {
      console.log("Lobby update (new socket):", data);
    });

    newClient.on("connect", () => {
      console.log("New client connected, emitting register-queue");
      setIsConnected(true);
      emitRegister(newClient);
    });

    newClient.on("disconnect", () => {
      console.log("New client disconnected");
      setIsConnected(false);
    });
    
    newClient.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  };

  const unregisterQueue = () => {
    setPendingQueueGametype(null);
    
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("unregister-queue");
    }
  };

  const readyUser = () => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("ready-user");
      setIsUserReady(true);
    }
  };

  const cancelReadyUser = () => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("cancel-ready-user");
      setIsUserReady(false);
    }
  };

  const gameConfig = (config: { color: string; map: string }) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("game-config", config);
    }
  };

  const gameDataPong = (data: GamedataPongDto) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("gamedata-pong", data);
    }
  };

  const gameDataShoot = (data: GamedataShootDto) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("gamedata-shoot", data);
    }
  };

  const gameDataWinner = (winner: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("gamedata-winner", winner);
    }
  };

  const assureConnection = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (!clientRef.current) return;

    if (!isConnected) {
      try {
        clientRef.current.connect();
        
        return new Promise((resolve) => {
          const checkConnection = () => {
            if (clientRef.current?.connected) {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      } catch (error) {
        console.warn('Failed to assure connection:', error);
      }
    }
  };

  const value: GameDataContextValue = {
    isConnected,
    registerQueueStatus,
    ingameData,
    gamedata,
    readyUsers,
    client: clientRef.current,
    status,
    winner,
    isUserReady,
    sendGamedata,
    registerQueue,
    unregisterQueue,
    readyUser,
    cancelReadyUser,
    gameConfig,
    gameDataWinner,
    gameDataPong,
    gameDataShoot,
    assureConnection,
  };

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
};

export function useGameData() {
  const ctx = useContext(GameDataContext);
  
  useEffect(() => {
    if (ctx && typeof window !== 'undefined') {
      setTimeout(() => {
        ctx.assureConnection();
      }, 0);
    }
  }, [ctx]);

  if (!ctx) {
    throw new Error("useGameData must be used within a GameDataProvider");
  }

  return ctx;
}
