"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScannerState = "idle" | "onboarding" | "scanning" | "captured" | "result";

interface IdentifyResult {
  found: boolean;
  confidence: number;
  card?: {
    id: string;
    name: string;
    number: string;
    imageUrl: string | null;
    price: number | null;
    rarity: string;
  };
  serie?: {
    id: string;
    slug: string;
    name: string;
    blocSlug: string;
  };
  raw?: { name: string; number: string; setCode: string };
}

// ─── Onboarding slides ────────────────────────────────────────────────────────

const SLIDES = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16 text-blue-400"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: "Prêt à scanner tes cartes ?",
    subtitle: "Pointez votre caméra vers une carte Pokémon et l'IA l'identifie instantanément.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16 text-yellow-400"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    title: "Un bon éclairage, c'est l'idéal !",
    subtitle: "Évitez les reflets et les ombres. Une lumière naturelle ou une lampe de bureau suffisent.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16 text-green-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    title: "Une carte bien posée, c'est la clé !",
    subtitle: "Posez la carte à plat, face visible, et centrez-la dans le cadre de visée.",
  },
];

const ONBOARDING_KEY = "pokeitem_scanner_onboarding_done";

// ─── Component ────────────────────────────────────────────────────────────────

export function CardScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<ScannerState>("idle");
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // ── Check onboarding on mount ──────────────────────────────────────────────
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setState("onboarding");
    }
  }, []);

  // ── Clean up camera on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Stop stream helper ─────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Attach stream to video once scanning view is mounted ──────────────────
  useEffect(() => {
    if (state === "scanning" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        setError("Impossible de démarrer la vidéo.");
        stopStream();
        setState("idle");
      });
    }
  }, [state, stopStream]);

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      // Set state first → triggers re-render → video element mounts → useEffect assigns stream
      setState("scanning");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermissionDenied(true);
      } else {
        setError("Impossible d'accéder à la caméra.");
      }
      setState("idle");
    }
  }, []);

  // ── Identify via API ───────────────────────────────────────────────────────
  const identify = useCallback(async (dataUrl: string) => {
    try {
      const res = await fetch("/api/scanner/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (res.status === 500) {
        setError("Scanner temporairement indisponible.");
        setState("idle");
        return;
      }

      const data: IdentifyResult = await res.json();
      setResult(data);
      setState("result");
    } catch {
      setError("Erreur de connexion. Réessayez.");
      setState("idle");
    }
  }, []);

  // ── Capture photo ──────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("La caméra n'est pas encore prête. Réessayez dans un instant.");
      return;
    }

    canvas.width  = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    setPhoto(dataUrl);
    setState("captured");
    void identify(dataUrl);
  }, [identify, stopStream]);

  // ── File fallback ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhoto(dataUrl);
        setState("captured");
        void identify(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [identify]
  );

  // ── Add to collection ──────────────────────────────────────────────────────
  const addToCollection = useCallback(async () => {
    if (!result?.card) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: [
            {
              cardId: result.card.id,
              quantity: 1,
              condition: "NEAR_MINT",
              language: "FR",
              version: "NORMAL",
            },
          ],
        }),
      });
      if (res.ok) {
        setSuccessBanner(`${result.card.name} ajoutée à ta collection !`);
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        setError("Impossible d'ajouter la carte.");
      }
    } catch {
      setError("Erreur de connexion.");
    }
    setIsAdding(false);
  }, [result]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopStream();
    setResult(null);
    setPhoto(null);
    setError(null);
    setState("idle");
  }, [stopStream]);

  // ── Close camera ───────────────────────────────────────────────────────────
  const closeCamera = useCallback(() => {
    stopStream();
    setState("idle");
  }, [stopStream]);

  // ── Onboarding controls ────────────────────────────────────────────────────
  const finishOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setState("idle");
  }, []);

  const nextSlide = useCallback(() => {
    if (onboardingSlide < SLIDES.length - 1) {
      setOnboardingSlide((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }, [onboardingSlide, finishOnboarding]);

  // ── Format price ───────────────────────────────────────────────────────────
  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return null;
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // ONBOARDING
  if (state === "onboarding") {
    const slide = SLIDES[onboardingSlide];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 px-6 text-center">
        <div className="mb-8">{slide.icon}</div>
        <h1 className="mb-3 text-2xl font-bold text-white">{slide.title}</h1>
        <p className="mb-10 max-w-xs text-sm text-gray-400">{slide.subtitle}</p>

        {/* Dots */}
        <div className="mb-8 flex gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === onboardingSlide ? "w-6 bg-blue-400" : "w-1.5 bg-gray-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="mb-4 w-full max-w-xs rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {onboardingSlide < SLIDES.length - 1 ? "Continuer" : "Commencer"}
        </button>
        <button
          onClick={finishOnboarding}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Passer l&apos;onboarding
        </button>
      </div>
    );
  }

  // SCANNING (camera live)
  if (state === "scanning") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />

        {/* Dark overlay with viewfinder cutout (purely visual) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Viewfinder */}
          <div className="relative" style={{ width: 260, height: 370 }}>
            {/* Corner brackets */}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <div
                key={corner}
                className="absolute h-10 w-10"
                style={{
                  top: corner.startsWith("t") ? 0 : "auto",
                  bottom: corner.startsWith("b") ? 0 : "auto",
                  left: corner.endsWith("l") ? 0 : "auto",
                  right: corner.endsWith("r") ? 0 : "auto",
                  borderColor: "white",
                  borderStyle: "solid",
                  borderTopWidth: corner.startsWith("t") ? 3 : 0,
                  borderBottomWidth: corner.startsWith("b") ? 3 : 0,
                  borderLeftWidth: corner.endsWith("l") ? 3 : 0,
                  borderRightWidth: corner.endsWith("r") ? 3 : 0,
                  borderRadius:
                    corner === "tl"
                      ? "6px 0 0 0"
                      : corner === "tr"
                      ? "0 6px 0 0"
                      : corner === "bl"
                      ? "0 0 0 6px"
                      : "0 0 6px 0",
                }}
              />
            ))}
            <p className="absolute -bottom-8 left-0 right-0 text-center text-xs text-white/70">
              Centrez la carte dans le cadre
            </p>
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 pt-safe-top pb-4 pt-4">
          <button
            onClick={closeCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-12 gap-6">
          {/* Capture button */}
          <button
            onClick={capturePhoto}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 shadow-lg hover:bg-white/30 transition-colors active:scale-95"
            aria-label="Prendre la photo"
          >
            <div className="h-14 w-14 rounded-full bg-white" />
          </button>

          {/* File fallback */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-white/60 hover:text-white/90 transition-colors underline underline-offset-2"
          >
            Vous n&apos;arrivez pas à scanner ?
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // CAPTURED / LOADING
  if (state === "captured") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
        {photo && (
          <div className="mb-6 h-48 w-36 overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Card photo" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-3 text-white">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Identification en cours…</span>
        </div>
      </div>
    );
  }

  // IDLE / RESULT — both rendered in page context
  return (
    <>
      {/* Hidden canvas for capture (only needed when camera is live, but keep here as fallback) */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Success banner */}
      {successBanner && result?.serie && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            <Link
              href={`/collection/cartes/${result.serie.blocSlug}/${result.serie.slug}`}
              className="underline underline-offset-2"
            >
              {successBanner}
            </Link>
          </span>
        </div>
      )}

      <div className="mx-auto max-w-md px-4 py-12">
        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Permission denied */}
        {permissionDenied && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            Accès caméra refusé.{" "}
            <a href="/collection/cartes" className="underline">
              Recherche manuelle
            </a>
          </div>
        )}

        {/* RESULT STATE */}
        {state === "result" && result && (
          <div>
            {result.found && result.card && result.serie ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
                {/* Card image */}
                <div className="flex justify-center bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/20 py-6">
                  {result.card.imageUrl ? (
                    <Image
                      src={result.card.imageUrl}
                      alt={result.card.name}
                      width={160}
                      height={224}
                      className="rounded-lg shadow-md object-contain"
                    />
                  ) : (
                    <div className="flex h-56 w-40 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-gray-400">
                        <rect x="2" y="3" width="20" height="18" rx="2" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M2 18l4-4 4 4 4-6 4 6" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Card info */}
                <div className="px-5 pb-6">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">
                    {result.card.name}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    {result.serie.name} · #{result.card.number}
                  </p>

                  <div className="flex items-center gap-2 mb-5">
                    {/* Price */}
                    {result.card.price != null && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {formatPrice(result.card.price)}
                      </span>
                    )}
                    {/* Rarity */}
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 capitalize">
                      {result.card.rarity.toLowerCase().replace(/_/g, " ")}
                    </span>
                    {/* Confidence */}
                    <span className="ml-auto text-xs text-[var(--text-secondary)]">
                      {result.confidence}% confiance
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => void addToCollection()}
                      disabled={isAdding}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {isAdding ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Ajout…
                        </>
                      ) : (
                        "Ajouter à ma collection"
                      )}
                    </button>
                    <button
                      onClick={reset}
                      className="rounded-xl border border-[var(--border-default)] py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Not found */
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
                <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">
                  Carte non reconnue
                </h2>
                <p className="mb-6 text-sm text-[var(--text-secondary)]">
                  Essayez sous un meilleur éclairage ou repositionnez la carte.
                </p>
                <button
                  onClick={reset}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>
        )}

        {/* IDLE STATE */}
        {state === "idle" && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-white"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
              Scanner de cartes
            </h1>
            <p className="mb-8 max-w-xs text-sm text-[var(--text-secondary)]">
              Prenez en photo une carte Pokémon pour l&apos;identifier et l&apos;ajouter à votre collection.
            </p>

            <button
              onClick={() => void startCamera()}
              className="mb-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Ouvrir la caméra
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
            >
              Choisir une photo depuis la galerie
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for file fallback capture */}
    </>
  );
}
