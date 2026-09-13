import { readFile, writeFile } from "node:fs/promises";
import type { TemplateCategory, TemplateStatus, WhatsappTemplate } from "../types.ts";

const STORE_PATH = new URL("./templates.json", import.meta.url);

function parseStore(raw: string): WhatsappTemplate[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("templates.json must be an array");
  return parsed as WhatsappTemplate[];
}

export interface TemplateInput {
  name: string;
  language: string;
  body: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
}

function deriveVariables(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]!))].sort();
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

  async create(input: TemplateInput): Promise<WhatsappTemplate> {
    const template: WhatsappTemplate = {
      id: crypto.randomUUID(),
      name: input.name,
      language: input.language,
      body: input.body,
      status: input.status ?? "APPROVED",
      category: input.category ?? "MARKETING",
      variables: deriveVariables(input.body),
      createdAt: new Date().toISOString(),
    };
    this.templates.push(template);
    await this.persist();
    return template;
  }

  async update(id: string, input: TemplateInput): Promise<WhatsappTemplate | undefined> {
    const template = this.findById(id);
    if (!template) return undefined;
    template.name = input.name;
    template.language = input.language;
    template.body = input.body;
    if (input.category) template.category = input.category;
    if (input.status) template.status = input.status;
    template.variables = deriveVariables(input.body);
    await this.persist();
    return template;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.templates.length;
    this.templates = this.templates.filter((t) => t.id !== id);
    if (this.templates.length === before) return false;
    await this.persist();
    return true;
  }

  private async persist(): Promise<void> {
    await writeFile(STORE_PATH, JSON.stringify(this.templates, null, 2), "utf8");
  }
}

/** Render a template body by substituting {{n}} placeholders with parameter values. */
export function renderTemplateBody(body: string, params: Map<string, string>): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, key: string) => params.get(key) ?? "");
}
