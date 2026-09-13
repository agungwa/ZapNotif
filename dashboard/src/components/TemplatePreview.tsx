import { renderPreview } from "../api/types";

interface TemplatePreviewProps {
  body: string;
  params: Record<string, string>;
}

/** Renders the final WhatsApp text like a chat bubble. */
export function TemplatePreview({ body, params }: TemplatePreviewProps) {
  const rendered = renderPreview(body, params);
  return (
    <div className="panel p-4">
      <p className="label mb-3">Live preview — WhatsApp render</p>
      <div className="mx-auto max-w-sm rounded-md bg-[#0b141a] p-1">
        <div className="relative rounded bg-[#005c4b] px-3 py-2 shadow-lg">
          <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white">
            {rendered}
          </p>
          <span className="mt-1 block text-right font-mono text-[9px] text-white/50">
            {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
          </span>
        </div>
      </div>
    </div>
  );
}
