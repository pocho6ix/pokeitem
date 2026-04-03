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
import { useSubscription } from "@/hooks/useSubscription";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/subscription/PaywallModal";
import type { CardCandidate, IdentifyResponse } from "@/app/api/scanner/identify/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScannerState = "idle" | "onboarding" | "scanning" | "captured" | "result" | "search" | "confirm";
type ConfirmSource = "auto" | "suggestion" | "search";

interface SearchCard {
  id: string;
  name: string;
  number: string;
  imageUrl: string | null;
  price: number | null;
  rarity: string;
  serie: {
    id: string;
    slug: string;
    name: string;
    bloc: { slug: string };
  };
}

// ─── Onboarding slides ────────────────────────────────────────────────────────

const SLIDES = [
  {
    title: "Prêt à scanner tes cartes ?",
    description: "Nous allons vous montrer, étape par étape, comment scanner dans les meilleures conditions.",
  },
  {
    title: "Un bon éclairage, c'est l'idéal !",
    description: "Placez votre carte dans un environnement bien éclairé afin d'optimiser la reconnaissance et d'assurer un scan rapide et précis.",
  },
  {
    title: "Une carte bien posée, c'est la clé !",
    description: "Déposez votre carte à plat, sans bouger, pour que le scan fonctionne parfaitement.",
  },
];

const ONBOARDING_KEY = "pokeitem_scanner_onboarding_done";

// ─── Onboarding illustrations ─────────────────────────────────────────────────

function SlideVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 220 200" className="w-full max-w-[240px] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="65" y="15" width="90" height="155" rx="14" fill="#142238" stroke="#1e3a5f" strokeWidth="2"/>
        <rect x="73" y="28" width="74" height="120" rx="4" fill="#0a1525"/>
        <rect x="82" y="42" width="56" height="78" rx="5" fill="#1b3660"/>
        <rect x="82" y="42" width="56" height="78" rx="5" fill="url(#cardGrad)" opacity="0.5"/>
        <circle cx="110" cy="76" r="16" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.5"/>
        <path d="M94 76 A16 16 0 0 1 126 76 Z" fill="#cc3333" opacity="0.35"/>
        <line x1="94" y1="76" x2="126" y2="76" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
        <circle cx="110" cy="76" r="5" fill="#0a1525" stroke="#3b82f6" strokeWidth="1" opacity="0.6"/>
        <path d="M85 45 L85 52 M85 45 L92 45" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <path d="M135 45 L135 52 M135 45 L128 45" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <path d="M85 117 L85 110 M85 117 L92 117" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <path d="M135 117 L135 110 M135 117 L128 117" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="82" y1="81" x2="138" y2="81" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7"/>
        <rect x="98" y="151" width="24" height="3" rx="1.5" fill="#1e3a5f"/>
        <circle cx="110" cy="23" r="2.5" fill="#0a1525"/>
        <ellipse cx="110" cy="180" rx="55" ry="10" fill="#3b82f6" opacity="0.08"/>
        <path d="M65 120 Q50 130 52 150 Q55 165 75 165 L145 165 Q165 165 168 150 Q170 130 155 120" fill="#1a2d45" stroke="#1e3a5f" strokeWidth="1.5"/>
        <defs>
          <linearGradient id="cardGrad" x1="82" y1="42" x2="138" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (index === 1) {
    return (
      <div className="flex w-full max-w-xs items-end justify-center gap-5 pb-2">
        <div className="relative flex-1">
          <div className="w-full rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "63/88" }}>
            <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#05090e] to-[#0d1520]">
              <div className="flex-1 flex items-center justify-center opacity-20">
                <svg viewBox="0 0 56 78" className="w-10 h-14" fill="none">
                  <circle cx="28" cy="34" r="14" stroke="white" strokeWidth="1.5"/>
                  <path d="M14 34 A14 14 0 0 1 42 34 Z" fill="white" opacity="0.4"/>
                  <line x1="14" y1="34" x2="42" y2="34" stroke="white" strokeWidth="1.5"/>
                  <circle cx="28" cy="34" r="5" fill="white" opacity="0.5"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
            </svg>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="w-full rounded-xl overflow-hidden border border-blue-400/30" style={{ aspectRatio: "63/88" }}>
            <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#1a3a6e] to-[#2a5a9e]">
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 56 78" className="w-10 h-14" fill="none">
                  <circle cx="28" cy="34" r="14" stroke="white" strokeWidth="1.5" opacity="0.9"/>
                  <path d="M14 34 A14 14 0 0 1 42 34 Z" fill="white" opacity="0.6"/>
                  <line x1="14" y1="34" x2="42" y2="34" stroke="white" strokeWidth="1.5" opacity="0.8"/>
                  <circle cx="28" cy="34" r="5" fill="white" opacity="0.8"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 7 5.5 11 12 3"/>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full max-w-xs">
      <div className="relative w-44 h-36 rounded-xl overflow-hidden border border-blue-400/30 bg-gradient-to-br from-[#1a3a6e] to-[#2a5a9e]">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 56 56" className="w-12 h-12 opacity-60" fill="none">
            <circle cx="28" cy="28" r="24" stroke="white" strokeWidth="2"/>
            <path d="M4 28 A24 24 0 0 1 52 28 Z" fill="white" opacity="0.3"/>
            <line x1="4" y1="28" x2="52" y2="28" stroke="white" strokeWidth="2"/>
            <circle cx="28" cy="28" r="7" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <div className="absolute top-2 left-2 h-5 w-5 border-t-[2.5px] border-l-[2.5px] border-white rounded-tl-sm" />
        <div className="absolute top-2 right-2 h-5 w-5 border-t-[2.5px] border-r-[2.5px] border-white rounded-tr-sm" />
        <div className="absolute bottom-2 left-2 h-5 w-5 border-b-[2.5px] border-l-[2.5px] border-white rounded-bl-sm" />
        <div className="absolute bottom-2 right-2 h-5 w-5 border-b-[2.5px] border-r-[2.5px] border-white rounded-br-sm" />
        <div className="absolute left-3 right-3 top-1/2 h-[1.5px] bg-blue-400 opacity-80 rounded-full" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-44 h-36 rounded-xl bg-blue-400 blur-2xl opacity-10" />
      </div>
    </div>
  );
}

// ─── Shared fullscreen wrapper ─────────────────────────────────────────────────

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-black ${className}`}>
      {children}
    </div>
  );
}

// ─── Corner viewfinder ─────────────────────────────────────────────────────────

function Viewfinder() {
  const color = "white";
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

// ─── Card thumbnail ────────────────────────────────────────────────────────────

function CardThumb({ imageUrl, name, size = 56 }: { imageUrl: string | null; name: string; size?: number }) {
  if (imageUrl) {
    return (
      <div className="shrink-0 rounded-lg overflow-hidden bg-white/5" style={{ width: size, height: Math.round(size * 1.4) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="shrink-0 rounded-lg bg-white/5 flex items-center justify-center" style={{ width: size, height: Math.round(size * 1.4) }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-white/20">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardScanner() {
  const router = useRouter();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isPro, canScan, remainingScans, usage, refresh: refreshSubscription } = useSubscription();
  const { paywallState, showPaywall, closePaywall } = usePaywall();

  const [state, setState]               = useState<ScannerState>("idle");
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [result, setResult]             = useState<IdentifyResponse | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardCandidate | null>(null);
  const [confirmSource, setConfirmSource] = useState<ConfirmSource>("auto");
  const [prevState, setPrevState]       = useState<ScannerState>("result");
  const [photo, setPhoto]               = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isAdding, setIsAdding]         = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<CardVersion>(CardVersion.NORMAL);

  // Search state
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<SearchCard[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setState("onboarding");
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (state === "scanning" && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      v.srcObject = streamRef.current;
      v.play().catch(() => { setError("Impossible de démarrer la vidéo."); stopStream(); setState("idle"); });
    }
  }, [state, stopStream]);

  const startCamera = useCallback(async () => {
    if (!canScan) {
      showPaywall("SCAN_LIMIT_REACHED", usage.scans.current, usage.scans.limit ?? 10);
      return;
    }
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
  }, [canScan, showPaywall, usage.scans.current, usage.scans.limit]);

  const identify = useCallback(async (dataUrl: string) => {
    try {
      const res = await fetch("/api/scanner/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (res.status === 403) {
        const data = await res.json();
        setPhoto(null);
        setState("idle");
        showPaywall("SCAN_LIMIT_REACHED", data.current, data.limit ?? 10);
        return;
      }
      if (res.status === 500) { setError("Scanner temporairement indisponible."); setState("idle"); return; }
      const data: IdentifyResponse = await res.json();
      setResult(data);
      setShowSuggestions(false);
      setSelectedVersion(CardVersion.NORMAL);
      setState("result");
      if (data.candidates.length > 0) refreshSubscription();
    } catch {
      setError("Erreur de connexion. Réessayez.");
      setState("idle");
    }
  }, [showPaywall, refreshSubscription]);

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

  const recordCorrection = useCallback((card: CardCandidate, source: ConfirmSource) => {
    void fetch("/api/scanner/correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiTopCardId: result?.candidates[0]?.cardId ?? null,
        aiTopConfidence: result?.topConfidence ?? null,
        userSelectedCardId: card.cardId,
        selectionSource: source,
        ocrName: result?.raw?.name ?? null,
        ocrNumber: result?.raw?.number ?? null,
        ocrSetCode: result?.raw?.setCode ?? null,
      }),
    });
  }, [result]);

  const addToCollection = useCallback(async (card: CardCandidate, source: ConfirmSource) => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: [{ cardId: card.card.id, quantity: 1, condition: "NEAR_MINT", language: "FR", version: selectedVersion }],
        }),
      });
      if (res.ok) {
        recordCorrection(card, source);
        setSuccessBanner(`${card.card.name} ajoutée !`);
        setTimeout(() => setSuccessBanner(null), 4000);
      } else {
        setError("Impossible d'ajouter la carte.");
      }
    } catch {
      setError("Erreur de connexion.");
    }
    setIsAdding(false);
  }, [selectedVersion, recordCorrection]);

  const goToConfirm = useCallback((card: CardCandidate, source: ConfirmSource, from: ScannerState) => {
    setSelectedCard(card);
    setConfirmSource(source);
    setPrevState(from);
    setSelectedVersion(CardVersion.NORMAL);
    setState("confirm");
  }, []);

  // Search with debounce
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/scanner/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => void runSearch(q), 300);
  }, [runSearch]);

  const openSearch = useCallback((from: ScannerState) => {
    setPrevState(from);
    setSearchQuery("");
    setSearchResults([]);
    setState("search");
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setResult(null);
    setPhoto(null);
    setError(null);
    setShowSuggestions(false);
    setSelectedCard(null);
    setSelectedVersion(CardVersion.NORMAL);
    setSearchQuery("");
    setSearchResults([]);
    setState("idle");
  }, [stopStream]);

  const goBack = useCallback(() => { stopStream(); router.back(); }, [stopStream, router]);
  const finishOnboarding = useCallback(() => { localStorage.setItem(ONBOARDING_KEY, "1"); setState("idle"); }, []);

  const formatPrice = (p: number | null | undefined) =>
    p == null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p);

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  if (state === "onboarding") {
    const slide = SLIDES[onboardingSlide];
    const isLast = onboardingSlide === SLIDES.length - 1;
    return (
      <Screen className="bg-[#07111f]">
        <div className="flex items-center justify-between px-5 pt-14 pb-3 shrink-0">
          <button onClick={finishOnboarding} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/70 tracking-wide">Scan d&apos;une carte</span>
          <div className="h-9 w-9" />
        </div>
        <div className="mx-4 flex-1 flex flex-col rounded-3xl bg-[#0d1f38] border border-white/5 overflow-hidden">
          <div className="flex flex-1 items-center justify-center px-6 pt-6 pb-2">
            <SlideVisual index={onboardingSlide} />
          </div>
          <div className="px-6 pt-4 text-center">
            <h2 className="text-xl font-bold text-white leading-snug">{slide.title}</h2>
            <p className="mt-2 text-sm text-white/45 leading-relaxed">{slide.description}</p>
          </div>
          <div className="flex justify-center gap-2 py-5">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setOnboardingSlide(i)}>
                <div className={`h-2 rounded-full transition-all duration-300 ${i === onboardingSlide ? "w-6 bg-blue-500" : "w-2 bg-white/20"}`} />
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 px-5 pb-7">
            <button
              onClick={() => isLast ? finishOnboarding() : setOnboardingSlide((s) => s + 1)}
              className="w-full rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-opacity active:opacity-80"
            >
              {isLast ? "Commencer" : "Continuer"}
            </button>
            <button onClick={finishOnboarding} className="text-xs text-white/35 hover:text-white/60 transition-colors">
              Passer l&apos;onboarding
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-white/25">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1.5 L14 4 V8 C14 11.5 11 13.5 8 14.5 C5 13.5 2 11.5 2 8 V4 Z"/>
          </svg>
          Vous n&apos;arrivez pas à scanner ?
        </div>
      </Screen>
    );
  }

  // ── SCANNING ────────────────────────────────────────────────────────────────
  if (state === "scanning") {
    return (
      <Screen>
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Viewfinder />
          <p className="text-[11px] tracking-widest text-white/50 uppercase">Centrez la carte</p>
        </div>
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={() => { stopStream(); setState("idle"); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/80 tracking-wide">Scan d&apos;une carte</span>
          <button onClick={() => fileInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </button>
        </div>
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

  // ── SEARCH ──────────────────────────────────────────────────────────────────
  if (state === "search") {
    return (
      <Screen>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 pt-14 pb-4 shrink-0">
          <button onClick={() => setState(prevState)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Nom de la carte…"
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {searchLoading ? (
            <div className="flex justify-center py-10">
              <svg className="h-5 w-5 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
            <p className="text-center py-10 text-sm text-white/30">Aucune carte trouvée</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((card) => {
                const candidate: CardCandidate = {
                  cardId: card.id,
                  confidence: 0,
                  card: { id: card.id, name: card.name, number: card.number, imageUrl: card.imageUrl, price: card.price, rarity: card.rarity },
                  serie: { id: card.serie.id, slug: card.serie.slug, name: card.serie.name, blocSlug: card.serie.bloc.slug },
                };
                return (
                  <div key={card.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/8 px-3 py-2.5">
                    <CardThumb imageUrl={card.imageUrl} name={card.name} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{card.serie.name} · #{card.number}</p>
                      {card.price != null && (
                        <p className="text-[11px] font-semibold text-blue-400">{formatPrice(card.price)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => goToConfirm(candidate, "search", "search")}
                      className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                    >
                      Sélectionner
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Screen>
    );
  }

  // ── CONFIRM ──────────────────────────────────────────────────────────────────
  if (state === "confirm" && selectedCard) {
    const versions = getSerieVersions(selectedCard.serie.slug, selectedCard.serie.blocSlug);
    return (
      <Screen>
        {/* Success toast */}
        {successBanner && (
          <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-green-600/90 backdrop-blur-sm px-4 py-3 text-xs font-medium text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <Link href={`/collection/cartes/${selectedCard.serie.blocSlug}/${selectedCard.serie.slug}`} className="underline underline-offset-2">
              {successBanner}
            </Link>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2 shrink-0">
          <button onClick={() => setState(prevState)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/70">Ajouter à ma collection</span>
          <div className="h-9 w-9" />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Card image */}
          <div className="flex justify-center py-6">
            {selectedCard.card.imageUrl ? (
              <Image
                src={selectedCard.card.imageUrl}
                alt={selectedCard.card.name}
                width={160}
                height={224}
                className="rounded-xl shadow-2xl shadow-black/60 object-contain"
              />
            ) : (
              <div className="flex h-56 w-40 items-center justify-center rounded-xl bg-white/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-white/20">
                  <rect x="2" y="3" width="20" height="18" rx="2"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mx-4 rounded-2xl bg-white/8 border border-white/10 px-5 py-4 mb-4">
            <h2 className="text-base font-bold text-white mb-0.5">{selectedCard.card.name}</h2>
            <p className="text-xs text-white/40 mb-3">{selectedCard.serie.name} · #{selectedCard.card.number}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCard.card.price != null && (
                <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                  {formatPrice(selectedCard.card.price)}
                </span>
              )}
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/40 capitalize">
                {selectedCard.card.rarity.toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Version picker */}
          {versions.length > 1 && (
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
          )}

          {/* Actions */}
          <div className="mx-4 flex flex-col gap-2.5 pb-10">
            <button
              onClick={() => void addToCollection(selectedCard, confirmSource)}
              disabled={isAdding}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-black disabled:opacity-50 transition-opacity active:opacity-80"
            >
              {isAdding ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Ajout…</>
              ) : "Ajouter à ma collection"}
            </button>
            <button onClick={reset} className="rounded-2xl border border-white/15 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              Rescanner
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (state === "result" && result) {
    const top = result.candidates[0];
    const showSuggestionsView = showSuggestions || result.level === "medium";

    return (
      <Screen>
        {/* Success toast */}
        {successBanner && top && (
          <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-green-600/90 backdrop-blur-sm px-4 py-3 text-xs font-medium text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <Link href={`/collection/cartes/${top.serie.blocSlug}/${top.serie.slug}`} className="underline underline-offset-2">
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

        {/* ── LEVEL HIGH (auto result) ───────────────────────────────────────── */}
        {result.level === "high" && top && !showSuggestionsView ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex justify-center py-6">
              {top.card.imageUrl ? (
                <Image src={top.card.imageUrl} alt={top.card.name} width={160} height={224} className="rounded-xl shadow-2xl shadow-black/60 object-contain" />
              ) : (
                <div className="flex h-56 w-40 items-center justify-center rounded-xl bg-white/5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-white/20"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
              )}
            </div>
            <div className="mx-4 rounded-2xl bg-white/8 border border-white/10 px-5 py-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-[11px] text-green-400 font-medium">Carte identifiée</span>
                <span className="ml-auto text-[11px] text-white/25">{top.confidence}%</span>
              </div>
              <h2 className="text-base font-bold text-white mb-0.5">{top.card.name}</h2>
              <p className="text-xs text-white/40 mb-3">{top.serie.name} · #{top.card.number}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {top.card.price != null && (
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400">{formatPrice(top.card.price)}</span>
                )}
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/40 capitalize">{top.card.rarity.toLowerCase().replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* Version picker for inline high-confidence add */}
            {(() => {
              const versions = getSerieVersions(top.serie.slug, top.serie.blocSlug);
              if (versions.length <= 1) return null;
              return (
                <div className="mx-4 mb-4">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">Version</p>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((v) => (
                      <button key={v} onClick={() => setSelectedVersion(v)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${selectedVersion === v ? "border-white/80 bg-white text-black" : "border-white/15 bg-white/5 text-white/50 hover:border-white/30"}`}
                      >
                        {CARD_VERSION_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mx-4 flex flex-col gap-2.5 pb-10">
              <button
                onClick={() => void addToCollection(top, "auto")}
                disabled={isAdding}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-black disabled:opacity-50 transition-opacity active:opacity-80"
              >
                {isAdding ? (
                  <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Ajout…</>
                ) : "Ajouter à ma collection"}
              </button>
              <button
                onClick={() => setShowSuggestions(true)}
                className="text-center text-xs text-white/35 hover:text-white/60 transition-colors py-2"
              >
                Ce n&apos;est pas la bonne carte →
              </button>
            </div>
          </div>

        /* ── LEVEL HIGH+SUGGESTIONS or MEDIUM (suggestions list) ─────────────── */
        ) : showSuggestionsView && result.candidates.length > 0 ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="px-4 py-4">
              <p className="text-sm font-semibold text-white mb-1">
                {result.level === "high" ? "Autres suggestions" : "Est-ce l'une de ces cartes ?"}
              </p>
              <p className="text-xs text-white/40">Sélectionne la bonne carte</p>
            </div>
            <div className="px-4 space-y-2 pb-4">
              {result.candidates.map((candidate) => (
                <div key={candidate.cardId} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/8 px-3 py-2.5">
                  <CardThumb imageUrl={candidate.card.imageUrl} name={candidate.card.name} size={52} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{candidate.card.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{candidate.serie.name} · #{candidate.card.number}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {candidate.card.price != null && (
                        <span className="text-[11px] font-semibold text-blue-400">{formatPrice(candidate.card.price)}</span>
                      )}
                      <span className="text-[10px] text-white/25">{candidate.confidence}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToConfirm(candidate, "suggestion", "result")}
                    className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                  >
                    Sélectionner
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 pb-10">
              <div className="border-t border-white/8 pt-4">
                <button
                  onClick={() => openSearch("result")}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/15 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Rechercher manuellement
                </button>
              </div>
            </div>
          </div>

        /* ── LEVEL LOW or no candidates ──────────────────────────────────────── */
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white/30">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">Carte non reconnue</p>
              <p className="mt-1 text-xs text-white/35 leading-relaxed">Essayez sous un meilleur éclairage,<br />sans reflets, avec la carte bien cadrée.</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button onClick={reset} className="rounded-2xl bg-white py-4 text-sm font-semibold text-black transition-opacity active:opacity-80">
                Réessayer
              </button>
              <button
                onClick={() => openSearch("result")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 py-3.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Rechercher manuellement
              </button>
            </div>
          </div>
        )}
      </Screen>
    );
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────────
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

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col px-5 pt-2 pb-2 overflow-y-auto">

        {/* Good vs bad examples */}
        <p className="mb-4 text-center text-sm font-semibold text-white/80">Comment bien scanner ?</p>
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <div className="w-full overflow-hidden rounded-2xl border border-green-400/30" style={{ aspectRatio: "3/4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/scan-correct.jpg" alt="Correct" className="h-full w-full object-contain" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-lg">
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 7 5.5 11 12 3"/></svg>
            </div>
          </div>
          <div className="relative flex-1">
            <div className="w-full overflow-hidden rounded-2xl border border-red-400/30" style={{ aspectRatio: "3/4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/scan-incorrect.jpg" alt="Incorrect" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 shadow-lg">
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 space-y-2.5 mb-8">
          {[
            "Placez la carte dans un endroit bien éclairé",
            "Posez la carte à plat, sans la tenir en main",
            "Cadrez toute la carte dans le viseur",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              <p className="text-xs text-white/60">{text}</p>
            </div>
          ))}
        </div>

        {/* Search bar — permanent */}
        <div className="border-t border-white/8 pt-6 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3">Ou rechercher une carte</p>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (searchQuery.length >= 2) void runSearch(searchQuery); }}
              placeholder="Nom de la carte…"
              className="w-full rounded-xl bg-white/10 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>

          {/* Inline search results */}
          {searchLoading && (
            <div className="flex justify-center py-4">
              <svg className="h-4 w-4 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}
          {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-center py-4 text-xs text-white/30">Aucune carte trouvée</p>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.slice(0, 5).map((card) => {
                const candidate: CardCandidate = {
                  cardId: card.id,
                  confidence: 0,
                  card: { id: card.id, name: card.name, number: card.number, imageUrl: card.imageUrl, price: card.price, rarity: card.rarity },
                  serie: { id: card.serie.id, slug: card.serie.slug, name: card.serie.name, blocSlug: card.serie.bloc.slug },
                };
                return (
                  <div key={card.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/8 px-3 py-2">
                    <CardThumb imageUrl={card.imageUrl} name={card.name} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{card.serie.name} · #{card.number}</p>
                      {card.price != null && (
                        <p className="text-[11px] font-semibold text-blue-400">{formatPrice(card.price)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => goToConfirm(candidate, "search", "idle")}
                      className="shrink-0 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                    >
                      Sélectionner
                    </button>
                  </div>
                );
              })}
              {searchResults.length > 5 && (
                <button onClick={() => openSearch("idle")} className="w-full text-center text-xs text-white/35 hover:text-white/60 py-2 transition-colors">
                  Voir les {searchResults.length - 5} autres résultats →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {(error || permissionDenied) && (
        <div className="mx-5 mb-4 rounded-xl bg-red-950/60 px-4 py-3 text-xs text-red-400 text-center">
          {permissionDenied ? "Accès caméra refusé — " : ""}{error ?? "Autorisez l'accès à la caméra dans vos réglages."}
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-4 pb-16 px-6 shrink-0">
        {!isPro && remainingScans !== null && (
          <p className={`text-sm text-center ${
            remainingScans === 0 ? "text-red-400" :
            remainingScans <= 3 ? "text-orange-400" :
            "text-white/50"
          }`}>
            {remainingScans === 0
              ? "⚠️ Limite mensuelle atteinte"
              : `${remainingScans} scan${remainingScans > 1 ? "s" : ""} restant${remainingScans > 1 ? "s" : ""} ce mois`}
          </p>
        )}
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

      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        current={paywallState.current}
        limit={paywallState.limit}
        onClose={closePaywall}
      />
    </Screen>
  );
}
