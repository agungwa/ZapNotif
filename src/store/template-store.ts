import { readFile, writeFile } from "node:fs/promises";
import type { TemplateCategory, TemplateStatus, WhatsappTemplate } from "../types.ts";

const STORE_PATH = new URL("./templates.json", import.meta.url);

function parseStore(raw: string): WhatsappTemplate[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("templates.json must be an array");
  return parsed as WhatsappTemplate[];
}

export class TemplateStore {
  private templates: WhatsappTemplate[] = [];

  async load(): Promise<void> {
    this.templates = parseStore(await readFile(STORE_PATH, "utf8"));
  }

  list(): WhatsappTemplate[] {
    return this.templates;
  }

  findById(id: string): WhatsappTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  findByName(name: string): WhatsappTemplate | undefined {
    return this.templates.find((t) => t.name === name);
  }

  async create(input: {
    name: string;
    language: string;
    body: string;
    category?: TemplateCategory;
    status?: TemplateStatus;
  }): Promise<WhatsappTemplate> {
    // Derive positional variables from {{n}} placeholders in the body
    const variables = [...input.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]!);
    const template: WhatsappTemplate = {
      id: crypto.randomUUID(),
      name: input.name,
      language: input.language,
      body: input.body,
      status: input.status ?? "APPROVED",
      category: input.category ?? "MARKETING",
      variables: [...new Set(variables)].sort(),
      createdAt: new Date().toISOString(),
    };
    this.templates.push(template);
    await this.persist();
    return template;
  }

  private async persist(): Promise<void> {
    await writeFile(STORE_PATH, JSON.stringify(this.templates, null, 2), "utf8");
  }
}

/** Render a template body by substituting {{n}} placeholders with parameter values. */
export function renderTemplateBody(body: string, params: Map<string, string>): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, key: string) => params.get(key) ?? "");
}
