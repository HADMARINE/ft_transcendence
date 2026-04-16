import "./globals.css";
import { Inter } from "next/font/google";
import { GameDataProvider } from "@/util/useGameData";
import { RouteStatusTracker } from "@/components/RouteStatusTracker";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <GameDataProvider>
          <RouteStatusTracker />
          {children}
        </GameDataProvider>
      </body>
    </html>
  );
}