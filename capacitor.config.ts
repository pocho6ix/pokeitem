import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.pokeitem.app",
  appName: "Pokeitem",
  webDir: "out",
  ios: {
    // Enable the native edge-swipe gesture (left edge → go back, right
    // edge → go forward) that users expect in every iOS app. WKWebView
    // wires this up to its own history stack — since Next.js client
    // navigation uses `history.pushState()`, the stack is already
    // populated correctly and the gesture "just works".
    //
    // The option is read by Capacitor iOS at runtime (persisted into
    // `capacitor.config.json` and applied to the WKWebView configuration
    // in `CAPBridgeViewController`), but the 8.3.1 TS declarations
    // haven't caught up yet — hence the cast.
    ...({ allowsBackForwardNavigationGestures: true } as Record<string, unknown>),
  },
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
