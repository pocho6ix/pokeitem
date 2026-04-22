"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  lazy,
  Suspense,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardVersion } from "@/data/card-versions";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/subscription/PaywallModal";
import { getCardImageAlt } from "@/lib/seo/card-image";
import type { CardCandidate, IdentifyResponse } from "@/types/scanner";
import { fetchApi } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { haptics } from "@/lib/haptics";

const CardDetailModal = lazy(() =>
  import("@/components/cards/CardDetailModal").then((m) => ({ default: m.CardDetailModal }))
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ScannerState = "scanning" | "result" | "search" | "confirm";
type IdentifyPhase = "waiting" | "identifying" | "result";
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

function Screen({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-black ${className}`} style={style}>
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
        <img src={imageUrl} alt={getCardImageAlt({ name })} className="w-full h-full object-cover" />
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

// ─── Tips bubble ──────────────────────────────────────────────────────────────

function TipsBubble({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <div
      className="absolute left-4 right-4 z-[70] transition-all duration-300 ease-out"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 88px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="rounded-2xl px-5 py-5" style={{ background: "rgba(0,0,0,0.88)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="space-y-3 mb-5">
          {[
            { icon: "💡", text: "Évitez les reflets et les ombres sur la carte" },
            { icon: "📐", text: "Alignez la carte dans le cadre, bien droite" },
            { icon: "📷", text: "Gardez votre téléphone stable pendant la détection" },
          ].map((tip) => (
            <div key={tip.text} className="flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">{tip.icon}</span>
              <p className="text-sm text-white leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="btn-gold w-full rounded-xl py-3 text-sm font-semibold text-black active:scale-[0.98] transition-all"
        >
          Compris !
        </button>
      </div>
    </div>
  );
}

// ─── Gold viewfinder ──────────────────────────────────────────────────────────

function GoldViewfinder() {
  const GOLD = "#D4A853";
  const CORNER = 28;
  const BORDER = 3;
  const RADIUS = 12;

  const corners = [
    { id: "tl", style: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: RADIUS } },
    { id: "tr", style: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: RADIUS } },
    { id: "bl", style: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: RADIUS } },
    { id: "br", style: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: RADIUS } },
  ] as const;

  return (
    <div
      className="relative"
      style={{
        width: "75vw",
        height: "calc(75vw * 1.397)",
        animation: "vfPulse 2s ease-in-out infinite",
      }}
    >
      {corners.map(({ id, style }) => (
        <div
          key={id}
          className="absolute"
          style={{
            width: CORNER,
            height: CORNER,
            borderColor: GOLD,
            borderStyle: "solid",
            borderTopWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 0,
            ...style,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes vfPulse {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// Native Capacitor path: use the system camera UI (full-screen native
// camera + review step) instead of wiring getUserMedia into a <video>.
// Same identify pipeline once we have the base64 image.
const IS_NATIVE =
  typeof window !== "undefined" && Capacitor.isNativePlatform();

// ─── Component ────────────────────────────────────────────────────────────────

export function CardScanner() {
  const router = useRouter();
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const searchTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isPro, canScan, remainingScans, usage, refresh: refreshSubscription } = useSubscription();
  const { paywallState, showPaywall, closePaywall } = usePaywall();

  // Main state
  const [state, setState]               = useState<ScannerState>("scanning");
  const [identifyPhase, setIdentifyPhase] = useState<IdentifyPhase>("waiting");
  const [panelCard, setPanelCard]       = useState<CardCandidate | null>(null);

  // Result / confirm
  const [result, setResult]             = useState<IdentifyResponse | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardCandidate | null>(null);
  const [confirmSource, setConfirmSource] = useState<ConfirmSource>("auto");
  const [prevState, setPrevState]       = useState<ScannerState>("scanning");

  // Camera
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError]   = useState<string | null>(null);
  const [flashOn, setFlashOn]           = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [vfFeedback, setVfFeedback]     = useState<"idle" | "success" | "error">("idle");

  // UI
  const [successBanner, setSuccessBanner] = useState<{ text: string; href: string } | null>(null);
  const [isAdding, setIsAdding]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [tipsVisible, setTipsVisible]   = useState(false);
  const [tipsAutoOpen, setTipsAutoOpen] = useState(false);

  // Card detail
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<SearchCard[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Stop stream on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Auto-start camera on mount + show tips if first visit
  useEffect(() => {
    void startCamera();
    try {
      const seen = localStorage.getItem("hasSeenScannerTips");
      if (!seen) {
        const t = setTimeout(() => {
          setTipsVisible(true);
          setTipsAutoOpen(true);
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss tips after 4s when auto-opened
  useEffect(() => {
    if (tipsVisible && tipsAutoOpen) {
      const t = setTimeout(() => setTipsVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [tipsVisible, tipsAutoOpen]);

  // Wire video stream when scanning
  useEffect(() => {
    if (state === "scanning" && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      v.srcObject = streamRef.current;
      v.play().catch(() => {
        setCameraError("Impossible de démarrer la vidéo.");
      });
    }
  }, [state]);

  // ── Camera controls ──────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!canScan) {
      showPaywall("SCAN_LIMIT_REACHED", usage.scans.current, usage.scans.limit ?? 10);
      return;
    }
    setPermissionDenied(false);
    setCameraError(null);
    // Native iOS uses the system camera UI (Camera.getPhoto) per-capture,
    // so we skip the getUserMedia preview stream entirely.
    if (IS_NATIVE) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      // Wire to video element immediately (state is already "scanning" at mount,
      // so the state-change effect won't re-fire after the async stream resolves)
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          setCameraError("Impossible de démarrer la vidéo.");
        });
      }
      // Detect torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        setFlashSupported(!!caps.torch);
      }
      setVfFeedback("idle");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermissionDenied(true);
      } else {
        setCameraError("Impossible d'accéder à la caméra.");
      }
    }
  }, [canScan, showPaywall, usage.scans.current, usage.scans.limit]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> })
        .applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn((v) => !v);
    } catch {}
  }, [flashOn]);

  // ── Identify ─────────────────────────────────────────────────────────────────

  const identify = useCallback(async (dataUrl: string) => {
    try {
      const res = await fetchApi("/api/scanner/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (res.status === 403) {
        const data = await res.json();
        setIdentifyPhase("waiting");
        showPaywall("SCAN_LIMIT_REACHED", data.current, data.limit ?? 10);
        return;
      }
      if (!res.ok) {
        setIdentifyPhase("waiting");
        setError("Scanner temporairement indisponible.");
        return;
      }
      const data: IdentifyResponse = await res.json();
      setResult(data);
      setShowSuggestions(false);
      if (data.candidates.length > 0) {
        setPanelCard(data.candidates[0]);
        setIdentifyPhase("result");
        refreshSubscription();
        // Go directly to the full result screen
        setState("result");
      } else {
        setIdentifyPhase("waiting");
        setState("result");
      }
    } catch {
      setIdentifyPhase("waiting");
      setError("Erreur de connexion. Réessayez.");
    }
  }, [showPaywall, refreshSubscription]);

  const capturePhoto = useCallback(async () => {
    if (IS_NATIVE) {
      try {
        const { Camera, CameraSource, CameraResultType } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          source: CameraSource.Camera,
          resultType: CameraResultType.Base64,
          quality: 85,
          correctOrientation: true,
        });
        if (!photo.base64String) return;
        const dataUrl = `data:image/${photo.format || "jpeg"};base64,${photo.base64String}`;
        setVfFeedback("success");
        setError(null);
        setTimeout(() => setVfFeedback("idle"), 300);
        setIdentifyPhase("identifying");
        void identify(dataUrl);
      } catch {
        // User cancelled — no-op
      }
      return;
    }
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
    setError(null);
    setTimeout(() => setVfFeedback("idle"), 300);
    setIdentifyPhase("identifying");
    void identify(dataUrl);
    // Camera stays running for the next scan
  }, [identify]);

  const pickFromGallery = useCallback(async () => {
    if (IS_NATIVE) {
      try {
        const { Camera, CameraSource, CameraResultType } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.Base64,
          quality: 85,
          correctOrientation: true,
        });
        if (!photo.base64String) return;
        const dataUrl = `data:image/${photo.format || "jpeg"};base64,${photo.base64String}`;
        setError(null);
        setIdentifyPhase("identifying");
        void identify(dataUrl);
      } catch {
        // User cancelled — no-op
      }
      return;
    }
    fileInputRef.current?.click();
  }, [identify]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setError(null);
      setIdentifyPhase("identifying");
      void identify(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [identify]);

  // ── Collection actions ────────────────────────────────────────────────────────

  const recordCorrection = useCallback((card: CardCandidate, source: ConfirmSource) => {
    void fetchApi("/api/scanner/correction", {
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

  // Add from the bottom panel (no version picker — uses NORMAL)
  const addFromPanel = useCallback(async (card: CardCandidate) => {
    setIsAdding(true);
    try {
      const res = await fetchApi("/api/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: [{ cardId: card.card.id, quantity: 1, condition: "NEAR_MINT", language: "FR", version: CardVersion.NORMAL }],
        }),
      });
      if (res.ok) {
        void haptics.tap();
        recordCorrection(card, "auto");
        setSuccessBanner({
          text: `${card.card.name} ajoutée !`,
          href: `/collection/cartes/${card.serie.blocSlug}/${card.serie.slug}`,
        });
        setTimeout(() => setSuccessBanner(null), 4000);
        // Reset panel — ready for next card
        setIdentifyPhase("waiting");
        setPanelCard(null);
        setResult(null);
      } else {
        setError("Impossible d'ajouter la carte.");
      }
    } catch {
      setError("Erreur de connexion.");
    }
    setIsAdding(false);
  }, [recordCorrection]);

  // Confirm screen now delegates the POST to CardDetailModal (full picker:
  // version + quantity + condition + language + price mode). We still fire
  // recordCorrection via the onAdded callback, so scanner training data
  // stays accurate.

  const goToConfirm = useCallback((card: CardCandidate, source: ConfirmSource, from: ScannerState) => {
    setSelectedCard(card);
    setConfirmSource(source);
    setPrevState(from);
    setState("confirm");
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetchApi(`/api/scanner/search?q=${encodeURIComponent(q)}`);
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

  // ── Navigation ────────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    stopStream();
    router.back();
  }, [stopStream, router]);

  const backToScanning = useCallback(() => {
    setResult(null);
    setShowSuggestions(false);
    setIdentifyPhase("waiting");
    setPanelCard(null);
    setError(null);
    setSelectedCard(null);
    setState("scanning");
  }, []);

  const formatPrice = (p: number | null | undefined) =>
    p == null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p);

  // ── SEARCH screen ────────────────────────────────────────────────────────────
  if (state === "search") {
    return (
      <Screen>
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

        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {searchLoading ? (
            <div className="flex justify-center py-10">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#D4A853" }}>
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
                        <p className="text-[11px] font-semibold" style={{ color: "#D4A853" }}>{formatPrice(card.price)}</p>
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

  // ── CONFIRM screen ───────────────────────────────────────────────────────────
  // Renders the shared CardDetailModal inline so the scanner's add-to-collection
  // flow matches the one reached from /collection/cartes (same gold CTA, same
  // bottom sheet with Version/Qty/Condition/Language/Price). Keeps our fullscreen
  // chrome (back button + success banner) around it.
  if (state === "confirm" && selectedCard) {
    return (
      <Screen className="bg-[var(--bg-primary)]">
        {successBanner && (
          <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-green-600/90 backdrop-blur-sm px-4 py-3 text-xs font-medium text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <Link href={successBanner.href} className="underline underline-offset-2">{successBanner.text}</Link>
          </div>
        )}

        <div
          className="flex items-center justify-between px-5 pb-2 shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
        >
          <button onClick={() => setState(prevState)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-[var(--text-secondary)]">Ajouter à ma collection</span>
          <div className="h-9 w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          <Suspense fallback={<div className="py-24 text-center text-sm text-[var(--text-tertiary)]">Chargement…</div>}>
            <CardDetailModal
              cardId={selectedCard.cardId}
              variant="inline"
              onClose={() => setState(prevState)}
              onWrongCard={backToScanning}
              onAdded={() => {
                void haptics.tap();
                recordCorrection(selectedCard, confirmSource);
                setSuccessBanner({
                  text: `${selectedCard.card.name} ajoutée !`,
                  href: `/collection/cartes/${selectedCard.serie.blocSlug}/${selectedCard.serie.slug}`,
                });
                setTimeout(() => setSuccessBanner(null), 4000);
              }}
            />
          </Suspense>
        </div>
      </Screen>
    );
  }

  // ── RESULT screen (multiple candidates / medium confidence) ──────────────────
  if (state === "result" && result) {
    const top = result.candidates[0];
    const showSuggestionsView = showSuggestions || result.level === "medium";

    return (
      <Screen>
        {successBanner && top && (
          <div className="absolute top-14 left-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-green-600/90 backdrop-blur-sm px-4 py-3 text-xs font-medium text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <Link href={successBanner.href} className="underline underline-offset-2">{successBanner.text}</Link>
          </div>
        )}

        <div className="flex items-center justify-between px-5 pt-14 pb-2 shrink-0">
          <button onClick={backToScanning} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-white/70">Résultat</span>
          <div className="h-9 w-9" />
        </div>

        {result.level === "high" && top && !showSuggestionsView ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-2 pb-10">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="rounded-full border-2 border-t-transparent animate-spin" style={{ width: 32, height: 32, borderColor: "#D4A853", borderTopColor: "transparent" }} /></div>}>
              <CardDetailModal
                cardId={top.cardId}
                onClose={backToScanning}
                variant="inline"
                onWrongCard={() => setShowSuggestions(true)}
              />
            </Suspense>
          </div>

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
                        <span className="text-[11px] font-semibold" style={{ color: "#D4A853" }}>{formatPrice(candidate.card.price)}</span>
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

        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white/30">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">Carte non reconnue</p>
              <p className="mt-1 text-xs text-white/35 leading-relaxed">Essayez sous un meilleur éclairage,<br />sans reflets, avec la carte bien cadrée.</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button onClick={backToScanning} className="btn-gold rounded-2xl py-4 text-sm font-semibold text-black active:scale-[0.98] transition-all">
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

  // ── SCANNING — main view ─────────────────────────────────────────────────────

  // Permission denied / camera error fallback
  const showFallback = permissionDenied || !!cameraError;

  return (
    <Screen style={{ background: "#0A0E14" } as React.CSSProperties}>
      {/* Camera feed — web only.
          On iOS WKWebView an empty <video> is promoted to its own GPU
          compositor layer that paints OVER the non-composited overlays
          (viewfinder, top bar, capture button), even though CSS stacking
          order says otherwise. Result: full black screen with no UI.
          The native build uses Camera.getPhoto() (system camera modal)
          per-capture, so we don't need the inline preview element. */}
      {!showFallback && !IS_NATIVE && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />
      )}

      {/* Fallback when camera unavailable */}
      {showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center" style={{ background: "#0A0E14" }}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.2)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10" style={{ color: "#D4A853" }}>
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white mb-2">
              {permissionDenied ? "Accès caméra refusé" : "Caméra indisponible"}
            </p>
            <p className="text-sm text-[#8B95A5] leading-relaxed">
              {permissionDenied
                ? "Autorisez l'accès à la caméra dans les réglages de votre appareil."
                : cameraError}
            </p>
          </div>
          <button
            onClick={() => void pickFromGallery()}
            className="btn-gold w-full max-w-xs rounded-2xl py-4 text-sm font-semibold text-black active:scale-[0.98] transition-all"
          >
            Importer depuis la galerie
          </button>
        </div>
      )}

      {/* Dark gradient overlay — top fade */}
      {!showFallback && (
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }}
        />
      )}

      {/* Top toolbar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)", paddingBottom: 12 }}
      >
        {/* Back */}
        <button
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm text-white"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Help */}
        <button
          onClick={() => { setTipsVisible(true); setTipsAutoOpen(false); }}
          className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm text-white"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="17" r=".5" fill="currentColor"/>
          </svg>
        </button>

        <div className="flex-1" />

        {/* Scans remaining badge */}
        {!isPro && remainingScans !== null && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.45)" }}>
            <span className={`text-[11px] font-medium ${remainingScans <= 3 ? "text-orange-400" : "text-white/60"}`}>
              {remainingScans}/{usage.scans.limit ?? 10}
            </span>
          </div>
        )}

        {/* Flash toggle */}
        {flashSupported && (
          <button
            onClick={() => void toggleFlash()}
            className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm text-white"
            style={{ background: flashOn ? "rgba(212,168,83,0.3)" : "rgba(0,0,0,0.45)", border: flashOn ? "1px solid rgba(212,168,83,0.6)" : "none" }}
          >
            <svg viewBox="0 0 24 24" fill={flashOn ? "#D4A853" : "none"} stroke={flashOn ? "#D4A853" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </button>
        )}

        {/* Gallery import */}
        <button
          onClick={() => void pickFromGallery()}
          className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm text-white"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21"/>
          </svg>
        </button>
      </div>

      {/* Tips bubble overlay */}
      <TipsBubble
        visible={tipsVisible}
        onDismiss={() => {
          setTipsVisible(false);
          try { localStorage.setItem("hasSeenScannerTips", "1"); } catch {}
        }}
      />

      {/* Viewfinder area — centered in the camera zone (above bottom panel) */}
      {!showFallback && (
        <div
          className="absolute left-0 right-0 flex flex-col items-center justify-center"
          style={{ top: 80, bottom: "30vh" }}
        >
          <GoldViewfinder />
          <p
            className="mt-4 text-sm"
            style={{ color: "#A0A0A0", fontSize: 14 }}
          >
            {IS_NATIVE
              ? "Appuyez pour prendre une photo"
              : "Placez votre carte dans le cadre"}
          </p>
        </div>
      )}

      {/* Capture button — floating above bottom panel */}
      {!showFallback && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ bottom: "calc(30vh + 16px)" }}
        >
          <button
            onClick={capturePhoto}
            disabled={identifyPhase === "identifying"}
            className="flex items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50"
            style={{
              width: 72,
              height: 72,
              border: "3px solid rgba(255,255,255,0.8)",
              background: "transparent",
            }}
            aria-label="Scanner la carte"
          >
            <div
              className="rounded-full"
              style={{
                width: 58,
                height: 58,
                background: identifyPhase === "identifying" ? "#D4A853" : "white",
                transition: "background 300ms",
              }}
            />
          </button>
        </div>
      )}

      {/* Bottom results panel */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex flex-col rounded-t-2xl"
        style={{
          height: "30vh",
          background: "#0D1117",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Waiting */}
        {identifyPhase === "waiting" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            {error ? (
              <>
                <p className="text-sm font-medium" style={{ color: "#ef4444" }}>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-white/40 mt-1"
                >
                  Fermer
                </button>
              </>
            ) : (
              <p className="text-sm" style={{ color: "#8B95A5" }}>En attente d&apos;une carte…</p>
            )}
          </div>
        )}

        {/* Identifying */}
        {identifyPhase === "identifying" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div
              className="rounded-full border-2 border-t-transparent animate-spin"
              style={{ width: 32, height: 32, borderColor: "#D4A853", borderTopColor: "transparent" }}
            />
            <p className="text-sm" style={{ color: "#8B95A5" }}>Identification…</p>
          </div>
        )}

        {/* Result */}
        {identifyPhase === "result" && panelCard && (
          <div
            className="flex flex-1 items-center gap-3 px-4"
            style={{
              animation: "panelSlideUp 0.4s ease-out",
            }}
          >
            <CardThumb imageUrl={panelCard.card.imageUrl} name={panelCard.card.name} size={52} />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">{panelCard.card.name}</p>
              <p className="text-xs truncate" style={{ color: "#8B95A5" }}>{panelCard.serie.name}</p>
              {panelCard.card.price != null && (
                <p className="text-lg font-bold" style={{ color: "#D4A853" }}>{formatPrice(panelCard.card.price)}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0 items-end">
              <button
                onClick={() => void addFromPanel(panelCard)}
                disabled={isAdding}
                className="btn-gold rounded-xl px-3 py-2 text-sm font-semibold text-black active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isAdding ? "…" : "+ Collection"}
              </button>
              {result && (
                <button
                  onClick={() => setState("result")}
                  className="text-[11px]"
                  style={{ color: "#8B95A5" }}
                >
                  Est-ce la bonne carte ?
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success banner */}
      {successBanner && (
        <div
          className="absolute left-4 right-4 z-20 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium text-white shadow-lg backdrop-blur-sm"
          style={{
            top: "max(env(safe-area-inset-top, 12px), 12px)",
            background: "rgba(34,197,94,0.9)",
            marginTop: 72,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <Link href={successBanner.href} className="underline underline-offset-2">{successBanner.text}</Link>
          <span className="ml-1 text-white/60">Ajoutée !</span>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <canvas ref={canvasRef} className="hidden" />

      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        current={paywallState.current}
        limit={paywallState.limit}
        onClose={closePaywall}
      />

      {detailCardId && (
        <Suspense fallback={null}>
          <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
        </Suspense>
      )}

      <style jsx global>{`
        @keyframes panelSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Screen>
  );
}
