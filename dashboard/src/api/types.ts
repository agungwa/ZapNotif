export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";
export type TemplateCategory = "AUTHENTICATION" | "MARKETING" | "UTILITY";
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface Template {
  id: string;
  name: string;
  language: string;
  body: string;
  status: TemplateStatus;
  category: TemplateCategory;
  variables: string[];
  createdAt: string;
}

export interface MessageRow {
  id: string;
  request_id: string;
  template_id: string | null;
  template_name: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  provider_message_id: string | null;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
}

export interface MessageList {
  items: MessageRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  totalSent: number;
  totalFailed: number;
  sentToday: number;
  successRate: number;
  last14Days: { date: string; sent: number; failed: number }[];
  whatsapp: ConnectionStatus;
}

export interface SendTemplateRequest {
  recipientPhoneNumber: string;
  recipientName?: string;
  templateId: string;
  languageCode: string;
  bodyParameters: { key: string; value: string; valueText?: string }[];
}

export interface SendTemplateResponse {
  providerMessageId: string;
  providerStatus: string;
}

/** Render {{n}} placeholders — mirrors backend renderTemplateBody. */
export function renderPreview(body: string, params: Record<string, string>): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, key: string) => params[key] ?? `{{${key}}}`);
}
