"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { DataTable } from "../../components/DataTable";
import { api } from "../../lib/api";

export default function CallsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/call-attempts").then(setRows).catch(() => setRows([])); }, []);
  const mapped = rows.map((r) => ({ id: r.id, lead: r.lead?.phone, campaign: r.campaign?.name, status: r.status, attemptNumber: r.attemptNumber, transcript: <Link href={`/calls/${r.id}`}>Open</Link> }));
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Call Logs</h1>
      <div className="mt-4"><DataTable columns={["lead", "campaign", "status", "attemptNumber", "id"]} rows={mapped} /></div>
    </AppShell>
  );
}

