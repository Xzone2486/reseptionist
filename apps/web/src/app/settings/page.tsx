"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { api } from "../../lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => { api("/settings").then(setSettings).catch(() => null); }, []);
  async function save(formData: FormData) {
    const next = {
      ...settings,
      clinicName: formData.get("clinicName"),
      clinicAddress: formData.get("clinicAddress"),
      voice: { ...settings.voice, providerMode: formData.get("providerMode") }
    };
    setSettings(await api("/settings", { method: "PUT", body: JSON.stringify(next) }));
  }
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Settings</h1>
      {settings && <form action={save} className="mt-4 grid max-w-2xl gap-4 rounded-md border bg-white p-4">
        <label className="text-sm font-medium">Clinic name<input name="clinicName" defaultValue={settings.clinicName} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
        <label className="text-sm font-medium">Clinic address<textarea name="clinicAddress" defaultValue={settings.clinicAddress} className="mt-1 min-h-24 w-full rounded-md border px-3 py-2" /></label>
        <label className="text-sm font-medium">Calling provider<select name="providerMode" defaultValue={settings.voice.providerMode} className="mt-1 w-full rounded-md border px-3 py-2"><option value="mock">Mock</option><option value="vobiz_sip">Vobiz SIP via LiveKit</option><option value="vobiz_api">Vobiz Voice API</option></select></label>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-gray-50 p-3">No answer retry: {settings.retryRules.no_answer.delayMinutes} min</div>
          <div className="rounded-md bg-gray-50 p-3">Busy retry: {settings.retryRules.busy.delayMinutes} min</div>
          <div className="rounded-md bg-gray-50 p-3">Call later retry: {settings.retryRules.call_later.delayMinutes} min</div>
          <div className="rounded-md bg-gray-50 p-3">Silence timeout: {settings.voice.silenceTimeoutMs} ms</div>
        </div>
        <button className="inline-flex w-fit items-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-white"><Save size={16} /> Save</button>
      </form>}
    </AppShell>
  );
}
