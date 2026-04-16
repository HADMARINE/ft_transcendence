"use client";

import Link from "next/link";

const linkStyle = {
  color: "#4cc9f0",
  textDecoration: "none",
  fontWeight: 700,
};

export function LegalLinks() {
  return (
    <nav aria-label="Liens légaux" style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
      <Link href="/privacy-policy" style={linkStyle}>
        Politique de confidentialité
      </Link>
      <Link href="/terms-of-service" style={linkStyle}>
        Conditions d'utilisation
      </Link>
    </nav>
  );
}
