"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardVersion, CARD_VERSION_LABELS, getSerieVersions } from "@/data/card-versions";

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
    emoji: "📷",
    title: "Scanner une carte",
    subtitle: "Pointez votre caméra vers une carte Pokémon — l'IA l'identifie instantanément.",
  },
  {
    emoji: "☀️",
    title: "Bonne lumière",
    subtitle: "Évitez les reflets. Une lumière naturelle ou une lampe de bureau suffisent.",
  },
  {
    emoji: "🎯",
    title: "Bien cadrer",
    subtitle: "Posez la carte à plat, face visible, et centrez-la dans le cadre.",
  },
];

const ONBOARDING_KEY = "pokeitem_scanner_onboarding_done";

// ─── Shared fullscreen wrapper ─────────────────────────────────────────────────

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-black ${className}`}>
      {children}
    </div>
  );
}

// ─── Corner viewfinder ─────────────────────────────────────────────────────────

function Viewfinder({ dim = false }: { dim?: boolean }) {
  const color = dim ? "rgba(255,255,255,0.25)" : "white";
  const size = 260;
  const height = 370;
  return (
    <div className="relative" style={{ width: size, height }}>
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          className="absolute h-10 w-10"
          style={{
            top:    c.startsWith("t") ? 0 : "auto",
            bottom: c.startsWith("b") ? 0 : "auto",
            left:   c.endsWith("l")   ? 0 : "auto",
            right:  c.endsWith("r")   ? 0 : "auto",
            borderColor: color,
            borderStyle: "solid",
            borderTopWidth:    c.startsWith("t") ? 2.5 : 0,
            borderBottomWidth: c.startsWith("b") ? 2.5 : 0,
            borderLeftWidth:   c.endsWith("l")   ? 2.5 : 0,
            borderRightWidth:  c.endsWith("r")   ? 2.5 : 0,
            borderRadius:
              c === "tl" ? "6px 0 0 0" :
              c === "tr" ? "0 6px 0 0" :
              c === "bl" ? "0 0 0 6px" :
                           "0 0 6px 0",
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardScanner() {
  const router = useRouter();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const [state, setState]                 = useState<ScannerState>("idle");
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [result, setResult]               = useState<IdentifyResult | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [photo, setPhoto]                 = useState<string | null>(null);
  const [isAdding, setIsAdding]           = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<CardVersion>(CardVersion.NORMAL);

  // Show onboarding on first visit
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setState("onboarding");
  }, []);

  // Clean up camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Attach stream when scanning state mounts
  useEffect(() => {
    if (state === "scanning" && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      v.srcObject = streamRef.current;
      v.play().catch(() => { setError("Impossible de démarrer la vidéo."); stopStream(); setState("idle"); });
    }
  }, [state, stopStream]);

  const startCamera = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setState("scanning");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") setPermissionDenied(true);
      else setError("Impossible d'accéder à la caméra.");
    }
  }, []);

  const identify = useCallback(async (dataUrl: string) => {
    try {
      const res  = await fetch("/api/scanner/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (res.status === 500) { setError("Scanner temporairement indisponible."); setState("idle"); return; }
      setResult(await res.json());
      setState("result");
    } catch {
      setError("Erreur de connexion. Réessayez.");
      setState("idle");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) { setError("Caméra pas encore prête, réessayez."); return; }
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    setPhoto(dataUrl);
    setState("captured");
    void identify(dataUrl);
  }, [identify, stopStream]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [identify]);

  const addToCollection = useCallback(async () => {
    if (!result?.card) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: [{ cardId: result.card.id, quantity: 1, condition: "NEAR_MINT", language: "FR", version: selectedVersion }] }),
      });
      if (res.ok) { setSuccessBanner(`${result.card.name} ajoutée !`); setTimeout(() => setSuccessBanner(null), 4000); }
      else setError("Impossible d'ajouter la carte.");
    } catch { setError("Erreur de connexion."); }
    setIsAdding(false);
  }, [result, selectedVersion]);

  const reset = useCallback(() => {
    stopStream(); setResult(null); setPhoto(null); setError(null);
    setSelectedVersion(CardVersion.NORMAL); setState("idle");
  }, [stopStream]);

  const goBack = useCallback(() => { stopStream(); router.back(); }, [stopStream, router]);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "1"); setState("idle");
  }, []);

  const formatPrice = (p: number | null | undefined) =>
    p == null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p);

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  if (state === "onboarding") {
    const slide = SLIDES[onboardingSlide];
    return (
      <Screen>
        {/* Skip */}
        <div className="flex justify-end px-5 pt-14">
          <button onClick={finishOnboarding} className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Passer
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="mb-6 text-6xl">{slide.emoji}</span>
          <h1 className="mb-3 text-xl font-bold text-white">{slide.title}</h1>
          <p className="max-w-xs text-sm leading-relaxed text-white/50">{slide.subtitle}</p>
        </div>

        {/* Dots + CTA */}
        <div className="flex flex-col items-center gap-5 pb-16 px-8">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === onboardingSlide ? "w-5 bg-white" : "w-1 bg-white/20"}`} />
            ))}
          </div>
          <button
            onClick={() => onboardingSlide < SLIDES.length - 1 ? setOnboardingSlide((s) => s + 1) : finishOnboarding()}
            className="w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-black transition-opacity active:opacity-80"
          >
            {onboardingSlide < SLIDES.length - 1 ? "Continuer" : "Commencer"}
          </button>
        </div>
      </Screen>
    );
  }

  // ── SCANNING ────────────────────────────────────────────────────────────────
  if (state === "scanning") {
    return (
      <Screen>
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

        {/* Dim overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Viewfinder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Viewfinder />
          <p className="text-[11px] tracking-widest text-white/50 uppercase">Centrez la carte</p>
        </div>

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={() => { stopStream(); setState("idle"); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/80 tracking-wide">Scan d&apos;une carte</span>
          {/* Search placeholder for symmetry */}
          <button onClick={() => fileInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-16 gap-5">
          <button
            onClick={capturePhoto}
            className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/80 bg-transparent active:scale-95 transition-transform"
            aria-label="Prendre la photo"
          >
            <div className="h-[62px] w-[62px] rounded-full bg-white/90" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-[11px] tracking-wide text-white/40 hover:text-white/70 transition-colors">
            Importer depuis la galerie
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <canvas ref={canvasRef} className="hidden" />
      </Screen>
    );
  }

  // ── CAPTURED / LOADING ──────────────────────────────────────────────────────
  if (state === "captured") {
    return (
      <Screen className="items-center justify-center gap-6">
        {photo && (
          <div className="h-52 w-36 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2.5 text-white/70">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-xs tracking-widest uppercase">Identification…</span>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </Screen>
    );
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <Screen>
        <canvas ref={canvasRef} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/70 tracking-wide">Scanner</span>
          <div className="h-9 w-9" />
        </div>

        {/* Center — inactive viewfinder */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <Viewfinder dim />
          <div className="text-center">
            <p className="text-base font-semibold text-white">Scanner une carte</p>
            <p className="mt-1 text-xs text-white/35">Cadrez la carte dans le viseur</p>
          </div>
        </div>

        {/* Errors */}
        {(error || permissionDenied) && (
          <div className="mx-5 mb-4 rounded-xl bg-red-950/60 px-4 py-3 text-xs text-red-400 text-center">
            {permissionDenied ? "Accès caméra refusé — " : ""}{error ?? "Autorisez l'accès à la caméra dans vos réglages."}
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-4 pb-16 px-6">
          <button
            onClick={() => void startCamera()}
            className="w-full rounded-2xl bg-white py-4 text-sm font-semibold text-black transition-opacity active:opacity-80"
          >
            Ouvrir la caméra
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            Choisir depuis la galerie
          </button>
        </div>
      </Screen>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (state === "result" && result) {
    return (
      <Screen>
        {/* Success toast */}
        {successBanner && result.serie && (
          <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-green-600/90 backdrop-blur-sm px-4 py-3 text-xs font-medium text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <Link href={`/collection/cartes/${result.serie.blocSlug}/${result.serie.slug}`} className="underline underline-offset-2">
              {successBanner}
            </Link>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2 shrink-0">
          <button onClick={reset} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/70">Résultat</span>
          <div className="h-9 w-9" />
        </div>

        {result.found && result.card && result.serie ? (
          /* ── FOUND ──────────────────────────────────────────────────────── */
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Card image */}
            <div className="flex justify-center py-6">
              {result.card.imageUrl ? (
                <Image
                  src={result.card.imageUrl}
                  alt={result.card.name}
                  width={160}
                  height={224}
                  className="rounded-xl shadow-2xl shadow-black/60 object-contain"
                />
              ) : (
                <div className="flex h-56 w-40 items-center justify-center rounded-xl bg-white/5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-white/20">
                    <rect x="2" y="3" width="20" height="18" rx="2"/>
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M2 18l4-4 4 4 4-6 4 6"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="mx-4 rounded-2xl bg-white/8 border border-white/10 px-5 py-4 mb-4">
              <h2 className="text-base font-bold text-white mb-0.5">{result.card.name}</h2>
              <p className="text-xs text-white/40 mb-3">{result.serie.name} · #{result.card.number}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {result.card.price != null && (
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                    {formatPrice(result.card.price)}
                  </span>
                )}
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/40 capitalize">
                  {result.card.rarity.toLowerCase().replace(/_/g, " ")}
                </span>
                <span className="ml-auto text-[11px] text-white/25">{result.confidence}% confiance</span>
              </div>
            </div>

            {/* Version picker */}
            {(() => {
              const versions = getSerieVersions(result.serie.slug, result.serie.blocSlug);
              if (versions.length <= 1) return null;
              return (
                <div className="mx-4 mb-4">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">Version</p>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVersion(v)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedVersion === v
                            ? "border-white/80 bg-white text-black"
                            : "border-white/15 bg-white/5 text-white/50 hover:border-white/30"
                        }`}
                      >
                        {CARD_VERSION_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="mx-4 flex flex-col gap-2.5 pb-10">
              <button
                onClick={() => void addToCollection()}
                disabled={isAdding}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-black disabled:opacity-50 transition-opacity active:opacity-80"
              >
                {isAdding ? (
                  <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Ajout…</>
                ) : "Ajouter à ma collection"}
              </button>
              <button
                onClick={reset}
                className="rounded-2xl border border-white/15 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                Rescanner
              </button>
            </div>
          </div>
        ) : (
          /* ── NOT FOUND ──────────────────────────────────────────────────── */
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white/30">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">Carte non reconnue</p>
              <p className="mt-1 text-xs text-white/35">Essayez sous un meilleur éclairage ou repositionnez la carte.</p>
            </div>
            <button
              onClick={reset}
              className="w-full max-w-xs rounded-2xl bg-white py-4 text-sm font-semibold text-black transition-opacity active:opacity-80"
            >
              Réessayer
            </button>
          </div>
        )}
      </Screen>
    );
  }

  return null;
}
