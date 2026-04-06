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

type ScannerState = "idle" | "scanning" | "captured" | "result" | "search" | "confirm";
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

// ─── Shared fullscreen wrapper ─────────────────────────────────────────────────

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-black ${className}`}>
      {children}
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

// ─── Tips bottom sheet ────────────────────────────────────────────────────────

function TipsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[81] rounded-t-3xl bg-[#0d1f38] border-t border-white/10 transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-base font-bold text-white">Astuces du scanner</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="px-5 text-xs text-white/40 mb-5">Pour de meilleurs résultats, suivez ces conseils</p>

        <div className="px-5 pb-8 space-y-6">
          {/* Tip 1 */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Alignez bien la carte</p>
            <div className="flex gap-3">
              <div className="relative flex-1 overflow-hidden rounded-xl border border-green-400/30" style={{ aspectRatio: "3/4" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/scan-correct.jpg" alt="Correct" className="h-full w-full object-contain" />
                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow">
                  <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 7 5.5 11 12 3"/></svg>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden rounded-xl border border-red-400/30" style={{ aspectRatio: "3/4" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/scan-incorrect.jpg" alt="Incorrect" className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow">
                  <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tip 2 */}
          <div>
            <p className="text-sm font-semibold text-white mb-2">Évitez reflets et ombres</p>
            <p className="text-xs text-white/40 leading-relaxed">Placez votre carte dans un endroit bien éclairé, sans lumière directe qui crée des reflets sur les cartes holographiques.</p>
          </div>

          {/* Tip 3 */}
          <div>
            <p className="text-sm font-semibold text-white mb-2">Posez la carte à plat</p>
            <p className="text-xs text-white/40 leading-relaxed">Ne tenez pas la carte en main. Posez-la sur une surface plane et stable pour un scan optimal.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Viewfinder with animated corners ─────────────────────────────────────────

function Viewfinder({ feedback }: { feedback: "idle" | "success" | "error" }) {
  const w = 260;
  const h = Math.round(w * (88 / 63)); // card ratio ≈ 364

  const color =
    feedback === "success" ? "#22c55e" :
    feedback === "error"   ? "#ef4444" : "white";

  return (
    <div
      className={`relative transition-all duration-200 ${feedback === "error" ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      style={{ width: w, height: h }}
    >
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          className="absolute h-12 w-12 transition-colors duration-300"
          style={{
            top:    c.startsWith("t") ? 0 : "auto",
            bottom: c.startsWith("b") ? 0 : "auto",
            left:   c.endsWith("l")   ? 0 : "auto",
            right:  c.endsWith("r")   ? 0 : "auto",
            borderColor: color,
            borderStyle: "solid",
            borderTopWidth:    c.startsWith("t") ? 3 : 0,
            borderBottomWidth: c.startsWith("b") ? 3 : 0,
            borderLeftWidth:   c.endsWith("l")   ? 3 : 0,
            borderRightWidth:  c.endsWith("r")   ? 3 : 0,
            borderRadius:
              c === "tl" ? "12px 0 0 0" :
              c === "tr" ? "0 12px 0 0" :
              c === "bl" ? "0 0 0 12px" :
                           "0 0 12px 0",
          }}
        />
      ))}

      {/* Scan line animation */}
      {feedback === "idle" && (
        <div
          className="absolute left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 animate-[scanline_2.5s_ease-in-out_infinite]"
          style={{ top: "30%" }}
        />
      )}

      <style jsx>{`
        @keyframes scanline {
          0%, 100% { top: 20%; opacity: 0.3; }
          50% { top: 75%; opacity: 0.7; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

// ─── Pre-scan illustration ────────────────────────────────────────────────────

function ScanIllustration() {
  return (
    <svg viewBox="0 0 200 180" className="w-full max-w-[200px] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Card shape */}
      <rect x="55" y="25" width="90" height="126" rx="8" fill="#142238" stroke="#1e3a5f" strokeWidth="1.5"/>
      <rect x="62" y="35" width="76" height="106" rx="4" fill="#1b3660" opacity="0.5"/>
      {/* Pokéball */}
      <circle cx="100" cy="80" r="20" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6"/>
      <path d="M80 80 A20 20 0 0 1 120 80 Z" fill="#cc3333" opacity="0.25"/>
      <line x1="80" y1="80" x2="120" y2="80" stroke="#3b82f6" strokeWidth="1" opacity="0.5"/>
      <circle cx="100" cy="80" r="6" fill="#0a1525" stroke="#3b82f6" strokeWidth="1" opacity="0.6"/>
      {/* Viewfinder corners */}
      <path d="M58 32 V42 M58 32 H68" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M142 32 V42 M142 32 H132" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M58 144 V134 M58 144 H68" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M142 144 V134 M142 144 H132" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Scan line */}
      <line x1="62" y1="88" x2="138" y2="88" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7">
        <animate attributeName="y1" values="65;110;65" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="y2" values="65;110;65" dur="3s" repeatCount="indefinite"/>
      </line>
      {/* Glow */}
      <ellipse cx="100" cy="160" rx="50" ry="8" fill="#3b82f6" opacity="0.08"/>
    </svg>
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
  const [tipsOpen, setTipsOpen]         = useState(false);
  const [vfFeedback, setVfFeedback]     = useState<"idle" | "success" | "error">("idle");
  const [showHint, setShowHint]         = useState(true);

  // Search state
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<SearchCard[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Fade out "Centrez la carte" after 3s
  useEffect(() => {
    if (state === "scanning") {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

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
      setVfFeedback("idle");
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
    // Flash feedback
    setVfFeedback("success");
    setTimeout(() => {
      stopStream();
      setPhoto(dataUrl);
      setState("captured");
      void identify(dataUrl);
    }, 300);
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

  const formatPrice = (p: number | null | undefined) =>
    p == null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p);

  // ── SCANNING ────────────────────────────────────────────────────────────────
  if (state === "scanning") {
    const vfW = 260;
    const vfH = Math.round(vfW * (88 / 63));
    return (
      <Screen>
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

        {/* Dark overlay with transparent cutout */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse ${vfW + 30}px ${vfH + 30}px at center 45%, transparent 60%, rgba(0,0,0,0.55) 100%)`,
        }} />

        {/* Viewfinder centered */}
        <div className="absolute inset-0 flex flex-col items-center" style={{ paddingTop: "calc(45% - 182px)" }}>
          <Viewfinder feedback={vfFeedback} />
          <p className={`mt-3 text-[11px] tracking-widest text-white/50 uppercase transition-opacity duration-700 ${showHint ? "opacity-100" : "opacity-0"}`}>
            Centrez la carte
          </p>
        </div>

        {/* Top bar — close ✕ + help ❓ */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-14 pb-4">
          <button onClick={() => { stopStream(); setState("idle"); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button onClick={() => setTipsOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Bottom bar — scans badge + capture + gallery */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-6 pb-14">
          {/* Scans remaining badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5">
            <span className="text-[11px] text-white/60">🔍</span>
            {!isPro && remainingScans !== null ? (
              <span className={`text-[11px] font-medium ${remainingScans <= 3 ? "text-orange-400" : "text-white/60"}`}>
                {remainingScans}/{usage.scans.limit ?? 10}
              </span>
            ) : (
              <span className="text-[11px] text-white/60">∞</span>
            )}
          </div>

          {/* Capture button — iOS style */}
          <button
            onClick={capturePhoto}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white/80 active:scale-95 transition-transform"
            aria-label="Prendre la photo"
          >
            <div className="h-[58px] w-[58px] rounded-full bg-white" />
          </button>

          {/* Gallery button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21"/>
            </svg>
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <canvas ref={canvasRef} className="hidden" />
        <TipsSheet open={tipsOpen} onClose={() => setTipsOpen(false)} />
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

        {/* ── LEVEL HIGH ──────────────────────────────────────────────────────── */}
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

            {/* Version picker */}
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

        /* ── SUGGESTIONS ──────────────────────────────────────────────────────── */
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

        /* ── LOW / NO CANDIDATES ──────────────────────────────────────────────── */
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
    <Screen className="bg-[#07111f]">
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

        {/* Illustration */}
        <div className="flex justify-center py-4 mb-2">
          <ScanIllustration />
        </div>

        {/* Tips — compact chips */}
        <div className="space-y-2 mb-8">
          {[
            { icon: "💡", text: "Éclairage uniforme, pas de reflets" },
            { icon: "✋", text: "Carte posée à plat, pas tenue en main" },
            { icon: "🎯", text: "Cadrez toute la carte dans le viseur" },
          ].map((tip) => (
            <div key={tip.text} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-2.5">
              <span className="text-sm shrink-0">{tip.icon}</span>
              <p className="text-xs text-white/60">{tip.text}</p>
            </div>
          ))}
        </div>

        {/* Search bar */}
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
          <p className={`text-xs text-center ${
            remainingScans === 0 ? "text-red-400" :
            remainingScans <= 3 ? "text-orange-400" :
            "text-white/40"
          }`}>
            {remainingScans === 0
              ? "⚠️ Limite mensuelle atteinte"
              : `🔍 ${remainingScans} scan${remainingScans > 1 ? "s" : ""} restant${remainingScans > 1 ? "s" : ""}`}
          </p>
        )}
        <button
          onClick={() => void startCamera()}
          className="w-full rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-opacity active:opacity-80"
        >
          Ouvrir la caméra
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          Importer depuis la galerie
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
