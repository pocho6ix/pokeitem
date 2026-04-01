"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getDefaultAvatar } from "@/lib/defaultAvatar";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  hasImage: boolean;
  createdAt: string;
}

export function ProfilForm() {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // cache-buster to force img reload after upload
  const [avatarTs, setAvatarTs] = useState<number>(Date.now());

  useEffect(() => {
    fetch("/api/profil")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setUser({
          id:       data.id,
          name:     data.name ?? null,
          email:    data.email,
          hasImage: !!data.image,
          createdAt: data.createdAt,
        });
        setName(data.name ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleSaveName() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("error", data.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setUser((prev) => (prev ? { ...prev, name: data.name } : prev));
      await updateSession({ name: data.name });
      showMessage("success", "Pseudo mis à jour");
    } catch {
      showMessage("error", "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profil/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage("error", data.error ?? "Erreur lors de l'upload");
        return;
      }
      setUser((prev) => (prev ? { ...prev, hasImage: true } : prev));
      setAvatarTs(Date.now()); // force img cache bust
      await updateSession({ hasAvatar: true });
      showMessage("success", "Photo mise à jour");
    } catch {
      showMessage("error", "Erreur réseau");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    if (!user?.hasImage) return;
    setUploading(true);
    try {
      const res = await fetch("/api/profil/avatar", { method: "DELETE" });
      if (!res.ok) {
        showMessage("error", "Erreur lors de la suppression");
        return;
      }
      setUser((prev) => (prev ? { ...prev, hasImage: false } : prev));
      await updateSession({ hasAvatar: false });
      showMessage("success", "Photo supprimée");
    } catch {
      showMessage("error", "Erreur réseau");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-[var(--bg-tertiary)]" />
        <div className="h-40 rounded-xl bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-[var(--text-secondary)]">
        Impossible de charger votre profil.
      </p>
    );
  }

  const hasChanged = name.trim() !== (user.name ?? "");

  // Avatar: use /api/avatar/[id] when user has a custom image, else default Pokémon
  const avatarSrc = user.hasImage
    ? `/api/avatar/${user.id}?t=${avatarTs}`
    : getDefaultAvatar(user.id);

  return (
    <div className="space-y-8">
      {/* S'abonner — Pro banner */}
      <button
        type="button"
        onClick={() => router.push('/pricing')}
        className="w-full rounded-xl p-4 text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, #ffd6e0 0%, #c8b6e2 25%, #b8d8f8 50%, #b8f0d0 75%, #f8f0b8 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-black/80">S&apos;abonner</span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs font-bold text-black/70 backdrop-blur-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-3.5 w-3.5 object-contain" />
            Pro
          </span>
        </div>
        <p className="mt-0.5 text-xs text-black/50">Débloquer toutes les fonctionnalités</p>
      </button>

      {/* Toast message */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar section */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Photo de profil
        </h2>
        <div className="flex items-center gap-6">
          {/* Avatar display */}
          <div className="relative h-20 w-20 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt="Photo de profil"
              className="h-20 w-20 rounded-full object-cover border-2 border-[var(--border-default)]"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-[#E7BA76] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#d4a660] disabled:opacity-50 transition-colors"
              >
                Changer la photo
              </button>
              {user.hasImage && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 hover:border-red-300 disabled:opacity-50 transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              JPG, PNG ou WebP. 2 Mo maximum.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>
      </section>

      {/* Name & Email section */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Informations
        </h2>
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
            >
              Pseudo
            </label>
            <div className="flex gap-2">
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre pseudo"
                maxLength={50}
                className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#E7BA76] focus:outline-none focus:ring-1 focus:ring-[#E7BA76] transition-colors"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={saving || !hasChanged}
                className="rounded-lg bg-[#E7BA76] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4a660] disabled:opacity-50 transition-colors"
              >
                {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Adresse email
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2">
              <svg
                className="h-4 w-4 text-[var(--text-tertiary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              L&apos;adresse email ne peut pas être modifiée
            </p>
          </div>

          {/* Member since */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Membre depuis
            </label>
            <p className="text-sm text-[var(--text-secondary)]">
              {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>
      {/* Logout */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/20 transition-colors"
      >
        Déconnexion
      </button>
    </div>
  );
}
