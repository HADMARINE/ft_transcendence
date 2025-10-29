"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./HomePage.module.css"; // Optionnel si vous voulez ajouter du style
import { GameDataProvider } from "@/util/useGameData";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger immédiatement vers la page de login
    router.replace("/login");
  }, []);

  return (
    <GameDataProvider>
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    </GameDataProvider>
  );
}
