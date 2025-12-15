"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./HomePage.module.css";
import { GameDataProvider } from "@/util/useGameData";

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    router.replace("/login");
  }, [isMounted, router]);

  if (!isMounted) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

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