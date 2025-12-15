"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * AuthGuard - Vérifie que l'utilisateur est authentifié
 * Redirige vers /login si non authentifié
 * À utiliser uniquement sur les pages qui nécessitent une authentification
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      console.log("❌ User not authenticated, redirecting to /login");
      router.replace("/login");
      return;
    }

    // Vérifier que les données utilisateur sont valides
    try {
      const userData = JSON.parse(user);
      if (!userData.id) {
        console.log("❌ Invalid user data, redirecting to /login");
        router.replace("/login");
        return;
      }
    } catch (e) {
      console.log("❌ Error parsing user data, redirecting to /login");
      router.replace("/login");
      return;
    }
  }, [router]);

  return <>{children}</>;
}
