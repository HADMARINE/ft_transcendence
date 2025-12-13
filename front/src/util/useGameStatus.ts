"use client";

import { useEffect, useRef } from "react";
import { updateUserStatus } from "@/api/users";
import { useGameData } from "./useGameData";

/**
 * Marks the current user as in_game while the component using this hook is mounted.
 * Also notifies connected websocket clients of the status change.
 */
export function useGameStatus() {
  const { client } = useGameData();
  const hasSetStatusRef = useRef(false);
  
  useEffect(() => {
    // Only run once per mount
    if (hasSetStatusRef.current) return;
    hasSetStatusRef.current = true;

    // Set status to in_game
    const setInGame = async () => {
      try {
        await updateUserStatus("in_game");
        
        // Notify other clients via websocket if connected
        if (client?.connected) {
          client.emit("user-status-changed", {
            status: "in_game",
          });
        }
      } catch (err) {
        console.error("Failed to update status to in_game:", err);
      }
    };

    setInGame();
  }, []); // Empty dependency array - run once on mount
}
