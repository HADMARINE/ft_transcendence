"use client";

import { useEffect } from "react";
import { updateUserStatus } from "@/api/users";
import { useGameData } from "./useGameData";

/**
 * Marks the current user as in_game with a specific mode identifier
 * while the component using this hook is mounted.
 * Also notifies connected websocket clients of the status change.
 */
export function useGameStatus(currentGameId: string) {
  const gameData = useGameData();

  useEffect(() => {
    (async () => {
      try {
        await updateUserStatus("in_game", currentGameId);
        // Notify other clients via websocket
        if (gameData?.client) {
          gameData.client.emit("user-status-changed", {
            status: "in_game",
            currentGameId,
          });
        }
      } catch {
        // Ignore when not authenticated.
      }
    })();

    return () => {
      (async () => {
        try {
          await updateUserStatus("online");
          // Notify other clients via websocket
          if (gameData?.client) {
            gameData.client.emit("user-status-changed", {
              status: "online",
            });
          }
        } catch {
          // Ignore
        }
      })();
    };
  }, [currentGameId, gameData?.client]);
}
