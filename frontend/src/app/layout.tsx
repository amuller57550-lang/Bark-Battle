import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Bark Battle — Combat d'Aboiements en Ligne",
  description: "Affronte d'autres joueurs dans des duels d'aboiements épiques ! Grimpe les ligues, décroche des badges et deviens le Roi des Chiens.",
  keywords: ["bark battle", "jeu aboiements", "multijoueur", "fun", "compétitif"],
  openGraph: {
    title: "Bark Battle",
    description: "Le jeu de combat d'aboiements le plus épique du web",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bark-gradient min-h-screen antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#292524",
              color: "#fafaf9",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: "12px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
