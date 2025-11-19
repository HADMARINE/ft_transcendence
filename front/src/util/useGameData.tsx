"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

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
  assureConnection: () => void;
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

// Hook pour localStorage qui ne s'exécute QUE côté client
const useClientToken = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Vérification très stricte pour s'assurer qu'on est côté client
    if (typeof window === 'undefined') return;
    if (typeof localStorage === 'undefined') return;
    
    try {
      const storedToken = localStorage.getItem("token");
      setToken(storedToken);
    } catch (error) {
      console.warn('Failed to get token from localStorage:', error);
    }
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

  // Utiliser le hook personnalisé pour le token
  const token = useClientToken();

  useEffect(() => {
    if (ingameData && ingameData.status !== status) {
      setStatus(ingameData.status);
    }
  }, [ingameData, status]);

  // Socket initialization - COMPLÈTEMENT isolé du serveur
  useEffect(() => {
    // Vérifications multiples pour être ABSOLUMENT sûr d'être côté client
    if (typeof window === 'undefined') return;
    if (typeof document === 'undefined') return;
    if (typeof localStorage === 'undefined') return;
    
    // S'assurer que nous sommes dans un environnement de navigateur
    if (!window.document) return;

    console.log("Initializing socket connection...");

    const client = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:61001",
      {
        autoConnect: false,
        transports: ["websocket"],
        auth: token ? { token } : undefined,
      }
    );

    clientRef.current = client;

    // Ne connecter que si on a un token
    if (token) {
      console.log("Connecting with token...");
      client.connect();
    } else {
      console.log("No token available, skipping connection");
    }

    client.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    client.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    client.on("game-session", (data: GameData) => {
      setIngameData(prev => ({ ...prev, ...data }));
    });

    client.on("register-queue", (data: RegisterQueueStatus) => {
      console.log("Register Queue Status:", data);
      setRegisterQueueStatus(data);
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

    return () => {
      console.log("Cleaning up socket connection...");
      if (client.connected) {
        client.disconnect();
      }
      clientRef.current = null;
    };
  }, [token]); // Se re-exécute seulement si le token change

  const sendGamedata = (data: unknown) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("gamedata", data);
    }
  };

  const registerQueue = (gametype: GametypeEnum) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.emit("register-queue", { gametype });
    }
  };

  const unregisterQueue = () => {
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

  const assureConnection = () => {
    if (typeof window === 'undefined') return;
    if (!clientRef.current) return;
    
    if (!isConnected) {
      try {
        const currentToken = localStorage.getItem("token");
        if (currentToken) {
          clientRef.current.auth = { token: currentToken };
          clientRef.current.connect();
        }
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
      // Timeout pour s'assurer que c'est bien exécuté après le rendu
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