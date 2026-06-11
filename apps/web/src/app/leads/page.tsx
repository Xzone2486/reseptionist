"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Edit3, PhoneCall, Save, Trash2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { UploadBox } from "../../components/UploadBox";
import { api } from "../../lib/api";

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  source: string;
  appointmentReason: string;
  department: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  doNotCall: boolean;
};

const emptyForm: LeadForm = {
  name: "",
  phone: "",
  email: "",
  source: "manual",
  appointmentReason: "",
  department: "",
  preferredDate: "",
  preferredTime: "",
  notes: "",
  doNotCall: false
};

function latestStatus(lead: any) {
  return lead.attempts?.[0]?.status || lead.status || "queued";
}

function formFromLead(lead: any): LeadForm {
  return {
    name: lead.name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    source: lead.source || "manual",
    appointmentReason: lead.appointmentReason || "",
    department: lead.department || "",
    preferredDate: lead.preferredDate || "",
    preferredTime: lead.preferredTime || "",
    notes: lead.notes || "",
    doNotCall: Boolean(lead.doNotCall)
  };
}

export default function LeadsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [callingId, setCallingId] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (!form.name.trim()) return "Name is required.";
    if (!/^\+?[0-9][0-9\s\-()]{6,}$/.test(form.phone.trim())) return "Enter a valid phone number.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
    return "";
  }, [form]);

  async function refresh() {
    const leads = await api("/leads");
    setRows(leads);
  }

  useEffect(() => {
    refresh().catch(() => setRows([]));
  }, []);

  function updateField<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    return {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      source: form.source.trim() || "manual",
      appointmentReason: form.appointmentReason.trim() || undefined,
      department: form.department.trim() || undefined,
      preferredDate: form.preferredDate || undefined,
      preferredTime: form.preferredTime || undefined,
      notes: form.notes.trim() || undefined
    };
  }

  async function saveLead() {
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return null;
    }
    setSaving(true);
    setMessage(null);
    try {
      const lead = editingId
        ? await api(`/leads/${editingId}`, { method: "PATCH", body: JSON.stringify(payload()) })
        : await api("/leads", { method: "POST", body: JSON.stringify(payload()) });
      setMessage({ type: "success", text: editingId ? "Lead updated." : "Lead saved." });
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
      return lead;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not save lead." });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndCallNow() {
    const lead = await saveLead();
    if (!lead) return;
    await callNow(lead.id);
  }

  async function callNow(id: string) {
    setCallingId(id);
    setMessage(null);
    try {
      await api(`/leads/${id}/call-now`, { method: "POST", body: JSON.stringify({}) });
      setMessage({ type: "success", text: "Call queued. Mock mode will create a transcript/status through the voice worker." });
      await refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not create call." });
    } finally {
      setCallingId(null);
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Delete this lead and its call logs?")) return;
    setMessage(null);
    try {
      await api(`/leads/${id}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Lead deleted." });
      await refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not delete lead." });
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Leads</h1>
        {message && (
          <div className={`rounded-md px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}
      </div>

      <section className="mt-4 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{editingId ? "Edit Lead" : "Add Lead Manually"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium">Name<input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Phone number<input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Email<input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Source<input value={form.source} onChange={(e) => updateField("source", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Appointment reason<input value={form.appointmentReason} onChange={(e) => updateField("appointmentReason", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Department<input value={form.department} onChange={(e) => updateField("department", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Preferred date<input type="date" value={form.preferredDate} onChange={(e) => updateField("preferredDate", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium">Preferred time<input type="time" value={form.preferredTime} onChange={(e) => updateField("preferredTime", e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm font-medium md:col-span-2 xl:col-span-3">Notes<textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={form.doNotCall} onChange={(e) => updateField("doNotCall", e.target.checked)} /> Do-not-call</label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving || Boolean(validationError)} onClick={saveLead} className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Save size={16} /> Save Lead</button>
          <button disabled={saving || Boolean(validationError)} onClick={saveAndCallNow} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><PhoneCall size={16} /> Save & Call Now</button>
          {editingId && <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-md border px-3 py-2 text-sm">Cancel Edit</button>}
          {validationError && <span className="self-center text-sm text-red-700">{validationError}</span>}
        </div>
      </section>

      <div className="mt-4"><UploadBox endpoint="/leads/import" label="Import lead CSV with name, phone, email, source, notes" /></div>

      <section className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {["Name", "Phone", "Email", "Source", "Reason", "Department", "Preferred", "Status", "Do Not Call", "Actions"].map((column) => <th className="table-cell font-medium" key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const latestAttempt = lead.attempts?.[0];
              const disabledCall = callingId === lead.id || lead.doNotCall;
              return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="table-cell">{lead.name}</td>
                  <td className="table-cell">{lead.phone}</td>
                  <td className="table-cell">{lead.email || ""}</td>
                  <td className="table-cell">{lead.source}</td>
                  <td className="table-cell">{lead.appointmentReason || ""}</td>
                  <td className="table-cell">{lead.department || ""}</td>
                  <td className="table-cell">{[lead.preferredDate, lead.preferredTime].filter(Boolean).join(" ")}</td>
                  <td className="table-cell">{latestStatus(lead)}</td>
                  <td className="table-cell">{lead.doNotCall ? "Yes" : "No"}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={disabledCall} onClick={() => callNow(lead.id)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-50"><PhoneCall size={14} /> Call Now</button>
                      <button onClick={() => { setEditingId(lead.id); setForm(formFromLead(lead)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1"><Edit3 size={14} /> Edit</button>
                      <button onClick={() => deleteRow(lead.id)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-red-700"><Trash2 size={14} /> Delete</button>
                      {latestAttempt ? <Link className="rounded-md border px-2 py-1" href={`/calls/${latestAttempt.id}`}>View Logs</Link> : <span className="rounded-md border px-2 py-1 text-gray-400">View Logs</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
