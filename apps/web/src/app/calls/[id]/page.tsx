"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { params.then((p) => api(`/call-attempts/${p.id}/transcript`).then(setData).catch(() => null)); }, [params]);
  const turns = data?.transcript?.turns || [];
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Transcript</h1>
      <section className="mt-4 rounded-md border bg-white p-4">
        <div className="text-sm text-gray-600">Status: {data?.status || "loading"} · Lead: {data?.lead?.phone || ""}</div>
        <div className="mt-4 space-y-2">
          {turns.map((turn: any, index: number) => <div key={index} className="rounded-md bg-gray-50 p-3"><b>{turn.speaker}:</b> {turn.text}</div>)}
        </div>
        <pre className="mt-4 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-white">{JSON.stringify(data?.extractedData, null, 2)}</pre>
      </section>
    </AppShell>
  );
}

