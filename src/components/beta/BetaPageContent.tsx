"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSubscription } from "@/hooks/useSubscription";
import { BackButton } from "@/components/ui/BackButton";
import { BETA_VIDEO_ID, BETA_VIDEO_ENABLED } from "@/config/beta";
import { CheckCircle2, Smartphone, Gift } from "lucide-react";

// ── Typings ──────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

// ── Features list ─────────────────────────────────────────────────────────────

const FEATURES = [
  "Toutes les features Pro",
  "Valeur collection en temps réel",
  "P&L et graphique évolution",
  "Résiliable à tout moment",
  "Aucun paiement requis",
];

// ── iOS share icon (SVG inline) ───────────────────────────────────────────────

function IosSShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block h-4 w-4 align-middle"
      aria-hidden="true"
    >
      <path d="M8 6L12 2l4 4" />
      <path d="M12 2v13" />
      <path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8" />
    </svg>
  );
}

// ── Install instructions modal ────────────────────────────────────────────────

function InstallModal({
  platform,
  onDone,
}: {
  platform: Platform;
  onDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 pb-8">
        <div className="mb-5 flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-[#E7BA76] shrink-0" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Installer PokéItem
          </h2>
        </div>

        {(platform === "ios") && (
          <ol className="space-y-5 text-sm text-[var(--text-primary)]">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-xs font-bold text-[#E7BA76]">
                1
              </span>
              <span>
                Appuie sur le bouton{" "}
                <span className="font-semibold">
                  &laquo;&nbsp;Partager&nbsp;&raquo;
                </span>{" "}
                <IosSShareIcon />{" "}
                en bas de Safari ou de ton navigateur
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-xs font-bold text-[#E7BA76]">
                2
              </span>
              <span>
                Appuie sur{" "}
                <span className="font-semibold">En voir plus</span>, scrolle et
                appuie sur{" "}
                <span className="font-semibold">
                  Sur l&rsquo;écran d&rsquo;accueil
                </span>
              </span>
            </li>
          </ol>
        )}

        {platform === "android" && (
          <ol className="space-y-5 text-sm text-[var(--text-primary)]">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-xs font-bold text-[#E7BA76]">
                1
              </span>
              <span>
                Ouvre le menu <span className="font-semibold">⋮</span> en haut
                à droite de Chrome
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-xs font-bold text-[#E7BA76]">
                2
              </span>
              <span>
                Appuie sur{" "}
                <span className="font-semibold">
                  Ajouter à l&rsquo;écran d&rsquo;accueil
                </span>
              </span>
            </li>
          </ol>
        )}

        {platform === "desktop" && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Ouvre{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              app.pokeitem.fr
            </span>{" "}
            sur ton téléphone pour installer l&rsquo;app et profiter des 2
            semaines offertes.
          </p>
        )}

        <p className="mt-5 text-xs text-[var(--text-tertiary)]">
          L&rsquo;app apparaît sur ton écran d&rsquo;accueil comme une app
          native.
        </p>

        <button
          onClick={onDone}
          className="mt-6 w-full rounded-xl bg-[#E7BA76] py-3 text-sm font-semibold text-black hover:bg-[#d4a660] transition-colors"
        >
          OK, j&rsquo;ai compris
        </button>
      </div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen() {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)] px-6">
      <div className="text-center max-w-xs">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Bienvenue dans la bêta&nbsp;!
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ton abonnement Pro est activé pour 7 jours. Merci de nous aider à
          améliorer PokéItem&nbsp;💪
        </p>
        <button
          onClick={() => router.push("/portfolio")}
          className="mt-6 w-full rounded-xl bg-[#E7BA76] py-3 text-sm font-semibold text-black hover:bg-[#d4a660] transition-colors"
        >
          Accéder à mon classeur
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BetaPageContent() {
  const { data: session, status } = useSession();
  const { isPro, betaTrialUsed, isLoading: subLoading } = useSubscription();
  const router = useRouter();

  const [platform, setPlatform] = useState<Platform>("unknown");
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setAlreadyInstalled(isAlreadyInstalled());

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function activateTrial() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/beta/activate", { method: "POST" });
      if (res.status === 409) {
        router.push("/portfolio");
        return;
      }
      if (!res.ok) throw new Error();
      setShowSuccess(true);
    } catch {
      setError("Une erreur est survenue. Réessaye.");
    } finally {
      setActivating(false);
    }
  }

  async function handleInstallClick() {
    if (!session) {
      router.push("/connexion?callbackUrl=/beta");
      return;
    }
    if (platform === "android" && deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      deferredPrompt.current = null;
      await activateTrial();
      return;
    }
    setShowModal(true);
  }

  async function handleModalDone() {
    setShowModal(false);
    if (platform === "desktop") return;
    await activateTrial();
  }

  const isReady = status !== "loading" && !subLoading;

  return (
    <>
      {showSuccess && <SuccessScreen />}
      {showModal && (
        <InstallModal platform={platform} onDone={handleModalDone} />
      )}

      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        {/* Back */}
        <div className="mb-6">
          <BackButton label="Retour" />
        </div>

        {/* Hero */}
        <div className="mb-6 flex items-center gap-3">
          <Gift className="h-8 w-8 text-[#E7BA76] shrink-0" />
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
            Profite d&apos;1 semaine offerte
          </h1>
        </div>

        {/* YouTube embed */}
        {BETA_VIDEO_ENABLED && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-default)]">
            <iframe
              src={`https://www.youtube.com/embed/${BETA_VIDEO_ID}`}
              title="Présentation PokéItem"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full"
              style={{ aspectRatio: "16/9", display: "block" }}
            />
          </div>
        )}

        {/* Body text */}
        <div className="mb-6 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          <p>
            PokéItem est en cours de développement ! L&rsquo;app arrive bientôt
            sur l&rsquo;App Store et le Play Store.
          </p>
          <p>
            En attendant, tu peux l&rsquo;installer directement sur ton écran
            d&rsquo;accueil et profiter de toutes les fonctionnalités Pro{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              gratuitement pendant 1 semaine
            </span>
            .
          </p>
          <p>
            En échange, aide-nous à améliorer l&rsquo;app en nous faisant tes
            retours dans la section{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              Support
            </span>{" "}
            de ton profil. Chaque feedback compte&nbsp;💪
          </p>
        </div>

        {/* Features */}
        <div className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4">
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-[var(--text-primary)]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        {isReady && (
          <>
            {betaTrialUsed || isPro ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center text-sm text-emerald-400">
                {betaTrialUsed
                  ? "Tu as déjà activé ta semaine offerte."
                  : "Tu es déjà abonné Pro."}
              </div>
            ) : alreadyInstalled ? (
              <button
                onClick={activateTrial}
                disabled={activating}
                className="w-full rounded-xl bg-[#E7BA76] py-3.5 text-sm font-semibold text-black hover:bg-[#d4a660] transition-colors disabled:opacity-60"
              >
                {activating
                  ? "Activation…"
                  : "🎁 Activer mon abonnement Pro 1 semaine offerte"}
              </button>
            ) : (
              <button
                onClick={handleInstallClick}
                disabled={activating}
                className="w-full rounded-xl bg-[#E7BA76] py-3.5 text-sm font-semibold text-black hover:bg-[#d4a660] transition-colors disabled:opacity-60"
              >
                {activating ? "Activation…" : "📲 Installer et commencer"}
              </button>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 text-center text-xs text-red-400">{error}</p>
        )}

        {/* Legal */}
        <p className="mt-4 text-center text-xs text-[var(--text-tertiary)] leading-relaxed">
          En appuyant, tu acceptes de participer à la bêta et de nous aider
          avec tes retours.
          <br />
          Résiliable à tout moment.
        </p>
      </div>
    </>
  );
}
