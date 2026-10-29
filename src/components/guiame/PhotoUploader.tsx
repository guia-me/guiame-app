import { useEffect, useMemo } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type CommunityPhoto = File;

export function PhotoUploader({
  files,
  onChange,
  title = "Fotos",
  help = "JPG, PNG, WEBP o AVIF · máximo 5 fotos de 5 MB cada una",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title?: string;
  help?: string;
}) {
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES);
    const merged = [...files];
    for (const file of valid) {
      if (merged.length >= MAX_PHOTOS) break;
      if (!merged.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified)) merged.push(file);
    }
    onChange(merged);
  };

  return (
    <section className="py-5">
      <p className="eyebrow">{title}</p>
      <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--gold)]/70 bg-[#fbf8f1] px-4 py-5 text-center text-[#263b32] transition hover:bg-[#f3eee2]">
        <ImagePlus size={25} aria-hidden="true" />
        <span className="text-sm font-semibold">Elegir fotos del dispositivo</span>
        <span className="text-xs text-[#77715f]">Puedes seleccionar varias imágenes</span>
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">{help}</p>
      {files.some((file) => !ACCEPTED.includes(file.type) || file.size > MAX_BYTES) && (
        <p className="mt-2 text-xs text-destructive">Usa imágenes compatibles de hasta 5 MB.</p>
      )}
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map(({ file, url }, index) => (
            <div key={file.name + file.size + file.lastModified} className="relative overflow-hidden rounded-xl border border-border bg-white">
              <img src={url} alt={file.name} className="h-28 w-full object-cover" />
              <button
                type="button"
                aria-label={`Quitar foto ${index + 1}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#263b32] text-white shadow"
              >
                <X size={14} />
              </button>
              <p className="truncate px-2 py-1 text-xs text-[#625f56]">{file.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export async function subirFotosComunidad(files: File[], folder: "locales" | "platos", anonId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const uploaded: string[] = [];
  for (const file of files) {
    if (!ACCEPTED.includes(file.type)) throw new Error("Formato de imagen no compatible.");
    if (file.size > MAX_BYTES) throw new Error("Cada foto debe pesar 5 MB o menos.");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `community/${folder}/${anonId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("restaurantes").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("restaurantes").getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}
