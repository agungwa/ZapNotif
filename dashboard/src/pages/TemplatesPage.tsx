import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Template, TemplateCategory, TemplateStatus } from "../api/types";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { TemplatePreview } from "../components/TemplatePreview";

const CATEGORIES: TemplateCategory[] = ["AUTHENTICATION", "MARKETING", "UTILITY"];
const STATUSES: TemplateStatus[] = ["APPROVED", "PENDING", "REJECTED"];

interface FormState {
  name: string;
  language: string;
  body: string;
  category: TemplateCategory;
  status: TemplateStatus;
}

const EMPTY_FORM: FormState = {
  name: "",
  language: "id",
  body: "",
  category: "MARKETING",
  status: "APPROVED",
};

function categoryTone(cat: TemplateCategory): "cyan" | "signal" | "amber" {
  switch (cat) {
    case "AUTHENTICATION":
      return "cyan";
    case "UTILITY":
      return "amber";
    default:
      return "signal";
  }
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [testValues, setTestValues] = useState<Record<string, string>>({});

  async function refresh() {
    try {
      setTemplates(await api.get<Template[]>("/api/templates"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setEditing({ id: null, form: EMPTY_FORM });
    setTestValues({});
  }

  function openEdit(t: Template) {
    setEditing({
      id: t.id,
      form: { name: t.name, language: t.language, body: t.body, category: t.category, status: t.status },
    });
    setTestValues({});
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      if (editing.id) {
        await api.put(`/api/templates/${editing.id}`, editing.form);
      } else {
        await api.post("/api/templates", editing.form);
      }
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onDelete() {
    if (!deleting) return;
    try {
      await api.del(`/api/templates/${deleting.id}`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error && !templates) {
    return <p className="border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-sm text-danger">⚠ {error}</p>;
  }
  if (!templates) {
    return <p className="pulse-dot font-display text-xs uppercase tracking-[0.3em] text-ink-400">Loading templates…</p>;
  }

  const editingVars = editing ? [...editing.form.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]!) : [];
  const uniqueEditingVars = [...new Set(editingVars)];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Templates</h1>
        <button className="btn-primary" onClick={openCreate}>+ New template</button>
      </div>

      {error && <p className="border border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">⚠ {error}</p>}

      <div className="panel rise overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Lang</th>
              <th>Category</th>
              <th>Vars</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="font-semibold text-ink-900 dark:text-ink-100">{t.name}</td>
                <td>{t.language}</td>
                <td><Badge tone={categoryTone(t.category)}>{t.category.toLowerCase()}</Badge></td>
                <td className="text-ink-400">{t.variables.length > 0 ? t.variables.map((v) => `{{${v}}}`).join(" ") : "—"}</td>
                <td><Badge tone={t.status === "APPROVED" ? "signal" : "amber"}>{t.status.toLowerCase()}</Badge></td>
                <td className="text-ink-400">{t.createdAt.slice(0, 10)}</td>
                <td className="text-right">
                  <button className="btn-ghost !px-2 !py-1" onClick={() => openEdit(t)}>edit</button>
                  <button className="btn-danger !px-2 !py-1 ml-2" onClick={() => setDeleting(t)}>del</button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-400">No templates — create one above</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      <Modal
        open={editing !== null}
        title={editing?.id ? "Edit template" : "New template"}
        onClose={() => setEditing(null)}
        wide
      >
        {editing && (
          <form onSubmit={onSave} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Name</label>
                <input
                  className="input"
                  value={editing.form.name}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })}
                  placeholder="otp_verification"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label mb-1.5 block">Language</label>
                  <input
                    className="input"
                    value={editing.form.language}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, language: e.target.value } })}
                    placeholder="id"
                    required
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Category</label>
                  <select
                    className="input"
                    value={editing.form.category}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, category: e.target.value as TemplateCategory } })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label mb-1.5 block">Status</label>
                <select
                  className="input"
                  value={editing.form.status}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, status: e.target.value as TemplateStatus } })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label mb-1.5 block">Body — use {"{{1}}"}, {"{{2}}"} placeholders</label>
                <textarea
                  className="input min-h-[9rem]"
                  value={editing.form.body}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, body: e.target.value } })}
                  placeholder={"Hai {{1}}, kode OTP kamu: *{{2}}*"}
                  required
                />
              </div>
              {uniqueEditingVars.length > 0 && (
                <div>
                  <label className="label mb-1.5 block">Test values (preview only)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {uniqueEditingVars.map((v) => (
                      <input
                        key={v}
                        className="input"
                        placeholder={`{{${v}}}`}
                        value={testValues[v] ?? ""}
                        onChange={(e) => setTestValues({ ...testValues, [v]: e.target.value })}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing.id ? "Save changes" : "Create"}</button>
              </div>
            </div>
            <TemplatePreview body={editing.form.body} params={testValues} />
          </form>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleting !== null} title="Delete template" onClose={() => setDeleting(null)}>
        <p className="font-mono text-sm">
          Permanently delete <span className="font-semibold text-danger">{deleting?.name}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
          <button className="btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
