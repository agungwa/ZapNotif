/** DTOs mirroring the Postman collection "Notification Service API" shapes. */

export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";
export type TemplateCategory = "AUTHENTICATION" | "MARKETING" | "UTILITY";

export interface WhatsappTemplate {
  id: string;
  name: string;
  language: string;
  body: string;
  status: TemplateStatus;
  category: TemplateCategory;
  /** Positional variable slots used in body, e.g. ["1", "2"] */
  variables: string[];
  createdAt: string;
}

export interface BodyParameter {
  key: string;
  value: string;
  valueText?: string;
}

export interface SendTemplateRequest {
  recipientPhoneNumber: string;
  recipientName?: string;
  templateId: string;
  languageCode: string;
  bodyParameters: BodyParameter[];
}

export interface SendTemplateResponse {
  providerMessageId: string;
  providerStatus: string;
}

export interface ApiError {
  message: string;
  requestId: string;
}

export interface TemplateDetailResponse
  extends Pick<WhatsappTemplate, "id" | "name" | "language" | "body" | "status" | "category" | "createdAt"> {}
