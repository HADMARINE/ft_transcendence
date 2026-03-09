import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Pour le développement avec certificats auto-signés
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any) => {
      // Désactiver la vérification SSL en développement pour les requêtes SSR
      if (config.node) {
        config.node.global = true;
      }
      return config;
    },
  }),
};

export default nextConfig;
