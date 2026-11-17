import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImageUp, LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  closeAvatarMenu,
  setActiveAvatarMenu,
  setClientAvatarUrl,
  useActiveAvatarMenu,
  useAvatarUrl,
} from "@/lib/avatar-store";

type AvatarImageProps = {
  userId: number;
  name: string;
  initials: string;
  avatarUrl: string | null;
  sizeClassName: string;
  textClassName?: string;
};

export function AvatarImage({
  userId,
  name,
  initials,
  avatarUrl: initialUrl,
  sizeClassName,
  textClassName = "text-sm",
}: AvatarImageProps) {
  const avatarUrl = useAvatarUrl(userId, initialUrl);
  return (
    <span
      className={`flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-brand-foreground ${sizeClassName} ${textClassName}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={`${name}'s profile photo`} className="size-full object-cover" />
      ) : (
        initials || "AL"
      )}
    </span>
  );
}

type ProfileAvatarProps = AvatarImageProps & { editable?: boolean };

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This image could not be compressed."))),
      mime,
      quality,
    );
  });
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This image could not be prepared for upload."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("This image could not be prepared for upload."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file to continue.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.");
  if (typeof createImageBitmap !== "function") {
    throw new Error("Image compression is not supported in this browser. Try a newer browser.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 500;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This image could not be compressed.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.84, 0.76, 0.68, 0.6]) {
      let blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob.type !== "image/webp") blob = await canvasBlob(canvas, "image/jpeg", quality);
      if (blob.size <= 350_000) return blobDataUrl(blob);
    }
    throw new Error("This photo is still too large after compression. Choose another image.");
  } finally {
    bitmap.close();
  }
}

export function ProfileAvatar({
  userId,
  name,
  initials,
  avatarUrl: initialUrl,
  sizeClassName,
  textClassName = "text-sm",
  editable = false,
}: ProfileAvatarProps) {
  const avatarUrl = useAvatarUrl(userId, initialUrl);
  const instanceId = useId();
  const activeMenu = useActiveAvatarMenu();
  const menuOpen = activeMenu?.instanceId === instanceId;
  const cameraMenuOpen = menuOpen && activeMenu.kind === "camera";
  const viewMenuOpen = menuOpen && activeMenu.kind === "view";
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const cameraButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => closeAvatarMenu(instanceId), [instanceId]);

  const toggleMenu = (kind: "camera" | "view", anchor: HTMLButtonElement | null) => {
    if (activeMenu?.instanceId === instanceId && activeMenu.kind === kind) {
      closeAvatarMenu(instanceId);
      return;
    }
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = kind === "camera" ? 208 : 192;
    const height = kind === "camera" ? (avatarUrl ? 92 : 48) : 44;
    const rawLeft = kind === "camera" ? rect.right - width : rect.left;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top =
      below + height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - height - 8);
    setMenuPosition({ top, left });
    setActiveAvatarMenu({ instanceId, kind });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        avatarButtonRef.current?.contains(target) ||
        cameraButtonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      closeAvatarMenu(instanceId);
    };
    const onScroll = () => closeAvatarMenu(instanceId);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAvatarMenu(instanceId);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [instanceId, menuOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lightboxOpen]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      const response = await fetch("/api/alumni/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        avatarUrl?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.avatarUrl) {
        throw new Error(result.message ?? "The profile photo could not be uploaded.");
      }
      setClientAvatarUrl(userId, result.avatarUrl);
      toast.success("Profile photo uploaded successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The profile photo could not be uploaded.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    closeAvatarMenu(instanceId);
    setBusy(true);
    try {
      const response = await fetch("/api/alumni/avatar", { method: "DELETE" });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "The profile photo could not be deleted.");
      }
      setClientAvatarUrl(userId, null);
      toast.success("Profile photo deleted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The profile photo could not be deleted.",
      );
    } finally {
      setBusy(false);
    }
  };

  const openLightbox = () => {
    closeAvatarMenu(instanceId);
    setLightboxOpen(true);
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        ref={avatarButtonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={viewMenuOpen}
        aria-label={`Open ${name}'s profile picture options`}
        onClick={() => toggleMenu("view", avatarButtonRef.current)}
        className={`flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-brand-foreground ring-offset-2 transition-shadow hover:ring-2 hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${sizeClassName} ${textClassName}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials || "AL"
        )}
      </button>

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label="Choose a profile photo"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            ref={cameraButtonRef}
            type="button"
            aria-label="Profile photo options"
            title="Profile photo options"
            aria-haspopup="menu"
            aria-expanded={cameraMenuOpen}
            disabled={busy}
            onClick={() => toggleMenu("camera", cameraButtonRef.current)}
            className="absolute bottom-0 right-0 z-10 flex aspect-square size-8 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-white text-brand shadow-md transition-transform hover:scale-105 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </button>
        </>
      )}

      {menuOpen &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={`fixed z-[9999] ${cameraMenuOpen ? "w-52" : "w-48"} rounded-xl border border-border bg-card p-1.5 text-left shadow-xl`}
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {viewMenuOpen ? (
              <button
                type="button"
                role="menuitem"
                onClick={openLightbox}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
              >
                View profile picture
              </button>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    closeAvatarMenu(instanceId);
                    inputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <ImageUp className="size-4 text-brand" /> Upload Profile Photo
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => void removePhoto()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" /> Delete Profile Photo
                  </button>
                )}
              </>
            )}
          </div>,
          document.body,
        )}

      {lightboxOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setLightboxOpen(false);
            }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Profile picture"
              className="relative flex aspect-square h-[min(85vw,85vh,560px)] w-[min(85vw,85vh,560px)] items-center justify-center"
            >
              <button
                type="button"
                aria-label="Close profile picture"
                onClick={() => setLightboxOpen(false)}
                className="absolute -right-1 -top-1 z-10 flex aspect-square size-10 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white shadow-lg transition-colors hover:bg-black sm:-right-2 sm:-top-2"
              >
                <X className="size-5" />
              </button>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${name}'s profile picture`}
                  className="aspect-square size-full rounded-full object-cover"
                />
              ) : (
                <span className="flex aspect-square size-full items-center justify-center overflow-hidden rounded-full bg-brand text-7xl font-bold text-brand-foreground sm:text-8xl md:text-9xl">
                  {initials || "AL"}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
