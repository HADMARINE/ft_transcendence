"use client";

import { useEffect, useRef } from "react";
import { updateUserStatus } from "@/api/users";
import { useGameData } from "./useGameData";


export function useGameStatus() {
  const { client } = useGameData();
  const hasSetStatusRef = useRef(false);
  
  useEffect(() => {
    
    if (hasSetStatusRef.current) return;
    hasSetStatusRef.current = true;

    
    const setInGame = async () => {
      try {
        await updateUserStatus("in_game");
        
        
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
  }, []); 
}
