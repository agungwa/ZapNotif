import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { mkdir, rm } from "node:fs/promises";
import { normalizePhone } from "../utils/phone.ts";
import qrcode from "qrcode-terminal";

const SESSION_DIR = process.env.SESSION_DIR ?? "./session";

const silentLogger = {
  level: "silent" as const,
  child() {
    return silentLogger;
  },
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Thin wrapper around a Baileys socket with automatic reconnect,
 * exposing the latest QR code for pairing.
 */
export class WhatsappClient {
  private socket: WASocket | null = null;
  private latestQr: string | null = null;
  private status: ConnectionStatus = "disconnected";

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getQr(): string | null {
    return this.latestQr;
  }

  isConnected(): boolean {
    return this.status === "connected" && this.socket !== null;
  }

  async start(): Promise<void> {
    await mkdir(SESSION_DIR, { recursive: true });
    await this.connect();
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this.status = "connecting";
    const socket = makeWASocket({
      version,
      auth: state,
      logger: silentLogger,
      printQRInTerminal: false,
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.latestQr = qr;
        qrcode.generate(qr, { small: true });
        console.log("[whatsapp] Scan the QR above to pair this session.");
      }
      if (connection === "open") {
        this.status = "connected";
        this.latestQr = null;
        console.log("[whatsapp] Connected and paired.");
      }
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
          ?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.status = "disconnected";
        this.socket = null;
        if (shouldReconnect) {
          console.log("[whatsapp] Connection closed, reconnecting...");
          setTimeout(() => void this.connect(), 3_000);
        } else {
          console.log("[whatsapp] Device logged out. Delete the session folder and re-pair.");
        }
      }
    });
  }

  /**
   * Normalize an Indonesian-friendly phone number to a JID.
   * e.g. "08123456789" -> "628123456789@s.whatsapp.net"
   */
  private toJid(phoneNumber: string): string {
    return `${normalizePhone(phoneNumber)}@s.whatsapp.net`;
  }

  /** Unpair the device: server logout, clear session files, reconnect (fresh QR). */
  async unpair(): Promise<void> {
    if (this.socket) {
      try {
        await this.socket.logout("Unpaired via dashboard");
      } catch (err) {
        // Logout can fail if already disconnected — session files still need clearing
        console.warn("[whatsapp] logout call failed during unpair:", err);
      }
      try {
        this.socket.end(undefined);
      } catch {
        // ignore
      }
    }
    this.socket = null;
    this.status = "disconnected";
    this.latestQr = null;
    await rm(SESSION_DIR, { recursive: true, force: true });
    await this.connect();
  }

  async sendText(phoneNumber: string, text: string): Promise<{ messageId: string }> {
    if (!this.socket || !this.isConnected()) {
      throw new Error("WhatsApp session is not connected");
    }
    const result = await this.socket.sendMessage(this.toJid(phoneNumber), { text });
    return { messageId: result?.key.id ?? crypto.randomUUID() };
  }
}
