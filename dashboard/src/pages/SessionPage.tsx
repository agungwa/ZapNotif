import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api/client";
import type { ConnectionStatus } from "../api/types";
import { StatusBadge } from "../components/Badge";
import { Modal } from "../components/Modal";

export function SessionPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let qrMisses = 0;
    const tick = async () => {
      try {
        const s = await api.get<{ status: ConnectionStatus }>("/v1/whatsapp/session/status");
        if (!mounted.current) return;
        setStatus(s.status);
        if (s.status !== "connected") {
          try {
            const qr = await api.get<{ qr: string }>("/v1/whatsapp/session/qr");
            if (!mounted.current) return;
            setQrDataUrl(await QRCode.toDataURL(qr.qr, { margin: 1, width: 260 }));
            qrMisses = 0;
          } catch {
            qrMisses++;
            if (qrMisses >= 2) setQrDataUrl(null);
          }
        } else {
          setQrDataUrl(null);
        }
      } catch {
        // backend unreachable — keep last state
      }
    };
    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  async function unpair() {
    setConfirmUnpair(false);
    try {
      await api.post("/v1/whatsapp/session/logout");
      setNotice("Device unpaired — a fresh QR will appear shortly.");
      setQrDataUrl(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unpair failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Session</h1>
        <button className="btn-danger" onClick={() => setConfirmUnpair(true)} disabled={status === "disconnected"}>
          Unpair device
        </button>
      </div>

      {notice && (
        <p className="border border-amber/40 bg-amber/10 px-4 py-2 font-mono text-xs text-amber">ℹ {notice}</p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel rise p-6">
          <p className="label mb-3">Connection</p>
          <div className="flex items-center gap-4">
            <StatusBadge status={status} />
            <p className="font-mono text-xs text-ink-400">polling every 3s</p>
          </div>
          <dl className="mt-6 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-ink-700/30 pb-2 dark:border-ink-800/70">
              <dt className="text-ink-400">transport</dt>
              <dd>baileys · multi-device</dd>
            </div>
            <div className="flex justify-between border-b border-ink-700/30 pb-2 dark:border-ink-800/70">
              <dt className="text-ink-400">session storage</dt>
              <dd>./session (multi-file)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">reconnect</dt>
              <dd>automatic · 3s backoff</dd>
            </div>
          </dl>
          {status === "connected" && (
            <p className="mt-6 border border-signal-dim/40 bg-signal/10 px-3 py-2 font-mono text-xs text-signal-dim dark:text-signal">
              ✓ Paired and online — messages will dispatch.
            </p>
          )}
        </div>

        <div className="panel rise rise-1 grid place-items-center p-6">
          {status === "connected" ? (
            <div className="py-10 text-center">
              <p className="font-display text-4xl text-signal">✓</p>
              <p className="mt-3 font-mono text-xs text-ink-400">
                Device paired — no QR needed.
                <br />
                Unpair to link a different number.
              </p>
            </div>
          ) : qrDataUrl ? (
            <div className="text-center">
              <p className="label mb-4">Scan to pair — WhatsApp → Linked devices</p>
              <div className="inline-block border border-signal/40 bg-white p-3 shadow-[0_0_40px_-10px_var(--color-signal)]">
                <img src={qrDataUrl} alt="WhatsApp pairing QR" width={260} height={260} />
              </div>
              <p className="mt-3 font-mono text-[10px] text-ink-400">auto-refreshes while awaiting scan</p>
            </div>
          ) : (
            <p className="pulse-dot py-10 font-mono text-xs text-ink-400">waiting for QR…</p>
          )}
        </div>
      </div>

      <Modal open={confirmUnpair} title="Unpair device" onClose={() => setConfirmUnpair(false)}>
        <p className="font-mono text-sm">
          This logs the device out of WhatsApp and <span className="text-danger">deletes the local session</span>. You
          will need to scan a new QR to send messages again. Continue?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirmUnpair(false)}>Cancel</button>
          <button className="btn-danger" onClick={unpair}>Unpair now</button>
        </div>
      </Modal>
    </div>
  );
}
