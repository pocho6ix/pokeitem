import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.pokeitem.app",
  appName: "Pokeitem",
  webDir: "out",
  server: {
    allowNavigation: [
      "api.pokeitem.fr",
      "*.blob.vercel-storage.com",
      "product-images.s3.cardmarket.com",
    ],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0A0F1E",
    },
  },
};

export default config;
