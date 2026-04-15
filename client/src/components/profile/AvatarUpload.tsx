// ABOUTME: Click-to-upload square avatar field with optimistic local preview and inline error state.
// ABOUTME: 120x120 square matches ProfileHeader, typographic placeholder, no spinner, no library.

"use client";

import { useRef, useState } from "react";
import { profileService } from "@/services/profileService";

interface AvatarUploadProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await profileService.uploadAvatar(file);
      setPreview(url);
      onUploaded(url);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(axiosErr.response?.data?.error?.message ?? "Failed to upload.");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div>
      <span className="type-label text-paper-dim block uppercase">Avatar</span>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative block"
          style={{
            width: 120,
            height: 120,
            background: "var(--ink-1)",
            border: "1px solid var(--paper)",
            cursor: uploading ? "wait" : "pointer",
            padding: 0,
          }}
          aria-label="Upload avatar"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              outline: "1px solid var(--line)",
              outlineOffset: -4,
            }}
            aria-hidden
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="type-eyebrow text-paper-muted">no image</span>
            </div>
          )}
          {uploading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(9,9,11,0.72)" }}
            >
              <span className="type-eyebrow text-paper">uploading</span>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onInputChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-3 type-body-s text-rust">{error}</p>
      )}
      <p className="mt-3 type-body-s text-paper-muted">
        Click to replace. jpg, png, or webp.
      </p>
    </div>
  );
}
