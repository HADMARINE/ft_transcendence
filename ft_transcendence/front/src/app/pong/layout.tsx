"use client";

import { useEffect } from "react";
import { updateUserStatus } from "@/api/users";

export default function PongLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        await updateUserStatus("in_game", "pong");
      } catch {
        
      }
    })();

    return () => {
      void updateUserStatus("online");
    };
  }, []);

  return <>{children}</>;
}
