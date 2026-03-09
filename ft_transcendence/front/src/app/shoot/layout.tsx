"use client";

import { useEffect } from "react";
import { updateUserStatus } from "@/api/users";

export default function ShootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        await updateUserStatus("in_game", "shoot");
      } catch {
        // Ignore if not authenticated.
      }
    })();

    return () => {
      void updateUserStatus("online");
    };
  }, []);

  return <>{children}</>;
}
