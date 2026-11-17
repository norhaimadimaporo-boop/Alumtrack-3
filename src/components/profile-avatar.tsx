import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { setClientAvatarUrl, useAvatarUrl } from "@/lib/avatar-store";

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
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-brand-foreground ${sizeClassName} ${textClassName}`}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      const response = await fetch("/api/alumni/avatar", { method: "DELETE" });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "The profile photo could not be deleted.");
      }
      setClientAvatarUrl(userId, null);
      setCameraMenuOpen(false);
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
    setViewMenuOpen(false);
    setCameraMenuOpen(false);
    setLightboxOpen(true);
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`Open ${name}'s profile picture options`}
        onClick={() => {
          setCameraMenuOpen(false);
          setViewMenuOpen((open) => !open);
        }}
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-brand-foreground ring-offset-2 transition-shadow hover:ring-2 hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${sizeClassName} ${textClassName}`}
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
            type="button"
            aria-label="Profile photo options"
            title="Profile photo options"
            disabled={busy}
            onClick={() => {
              setViewMenuOpen(false);
              setCameraMenuOpen((open) => !open);
            }}
            className="absolute bottom-0 right-0 z-10 flex size-8 items-center justify-center rounded-full border-2 border-background bg-white text-brand shadow-md transition-transform hover:scale-105 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </button>
        </>
      )}

      {viewMenuOpen && (
        <span className="absolute left-0 top-full z-40 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 text-left shadow-xl">
          <button
            type="button"
            onClick={openLightbox}
            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
          >
            View profile picture
          </button>
        </span>
      )}

      {cameraMenuOpen && editable && (
        <span className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 text-left shadow-xl">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCameraMenuOpen(false);
              inputRef.current?.click();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            <ImageUp className="size-4 text-brand" /> Upload Profile Photo
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void removePhoto()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-4" /> Delete Profile Photo
            </button>
          )}
        </span>
      )}

      {lightboxOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${name}'s profile picture`}
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col items-center rounded-2xl border border-white/15 bg-card p-4 shadow-2xl sm:p-6"
          >
            <button
              type="button"
              aria-label="Close profile picture"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              <X className="size-5" />
            </button>
            <h2 className="max-w-[calc(100%-3rem)] truncate pr-2 text-center text-base font-bold text-foreground">
              {name}
            </h2>
            <div className="mt-4 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/70 p-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${name}'s profile picture`}
                  className="max-h-[72dvh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <span className="flex size-[min(72vw,360px)] max-h-[72dvh] max-w-full items-center justify-center rounded-full bg-brand text-7xl font-bold text-brand-foreground sm:text-8xl">
                  {initials || "AL"}
                </span>
              )}
            </div>
          </section>
        </div>
      )}
    </span>
  );
}
