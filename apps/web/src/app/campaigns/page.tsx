"use client";

import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { api } from "../../lib/api";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  async function load() {
    setCampaigns(await api("/campaigns").catch(() => []));
    setLeads(await api("/leads").catch(() => []));
  }
  useEffect(() => { load(); }, []);
  async function create(formData: FormData) {
    await api("/campaigns", { method: "POST", body: JSON.stringify({ name: formData.get("name"), leadIds: leads.map((l) => l.id) }) });
    await load();
  }
  async function act(id: string, action: "start" | "stop") { await api(`/campaigns/${id}/${action}`, { method: "POST" }); await load(); }
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <form action={create} className="mt-4 flex gap-2 rounded-md border bg-white p-4">
        <input name="name" placeholder="Campaign name" className="min-w-0 flex-1 rounded-md border px-3 py-2" />
        <button className="rounded-md bg-cyan-700 px-4 py-2 text-white">Create</button>
      </form>
      <div className="mt-4 grid gap-3">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border bg-white p-4">
            <div><div className="font-medium">{c.name}</div><div className="text-sm text-gray-500">{c.status} · {c.leads?.length || 0} leads · {c.attempts?.length || 0} attempts</div></div>
            <div className="flex gap-2">
              <button title="Start campaign" onClick={() => act(c.id, "start")} className="rounded-md p-2 text-cyan-800 hover:bg-cyan-50"><Play size={17} /></button>
              <button title="Stop campaign" onClick={() => act(c.id, "stop")} className="rounded-md p-2 text-red-700 hover:bg-red-50"><Square size={17} /></button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

