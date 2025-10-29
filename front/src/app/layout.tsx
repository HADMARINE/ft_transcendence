"use client";

import "./globals.css";
// import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GameDataProvider } from "@/util/useGameData";
import { useIsAuth } from "@/util/useIsAuth";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Jeu de Combat",
//   description: "Personnalisez votre partie de jeu",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = useIsAuth({
    redirectToLogin: true,
    returnToCurrentPage: true,
  });
  return (
    <html lang="fr">
      <body className={inter.className}>
        <GameDataProvider>{children}</GameDataProvider>
      </body>
    </html>
  );
}
