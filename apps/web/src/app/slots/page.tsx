"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { DataTable } from "../../components/DataTable";
import { api } from "../../lib/api";

export default function SlotsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/slots").then(setRows).catch(() => setRows([])); }, []);
  const mapped = rows.map((s) => ({ ...s, date: s.date?.slice(0, 10) }));
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Slots</h1>
      <div className="mt-4"><DataTable columns={["externalId", "doctorName", "department", "date", "startTime", "endTime", "status"]} rows={mapped} /></div>
    </AppShell>
  );
}

