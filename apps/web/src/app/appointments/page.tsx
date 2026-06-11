"use client";

import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { api } from "../../lib/api";

export default function AppointmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() { setRows(await api("/appointments").catch(() => [])); }
  useEffect(() => { load(); }, []);
  async function cancel(id: string) { await api(`/appointments/${id}/cancel`, { method: "POST" }); await load(); }
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Appointments</h1>
      <div className="mt-4 overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50"><tr>{["Patient", "Phone", "Email", "Doctor", "Date", "Time", "Reason", "Mail", "Status", ""].map((h) => <th className="table-cell" key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((a) => <tr key={a.id}>
            <td className="table-cell">{a.patientName}</td><td className="table-cell">{a.phone}</td><td className="table-cell">{a.email || ""}</td><td className="table-cell">{a.slot?.doctorName}</td>
            <td className="table-cell">{a.slot?.date?.slice(0, 10)}</td><td className="table-cell">{a.slot?.startTime}</td><td className="table-cell">{a.reason}</td><td className="table-cell">{a.confirmationEmailSent ? "sent" : ""}</td><td className="table-cell">{a.status}</td>
            <td className="table-cell"><button title="Cancel booking" onClick={() => cancel(a.id)} className="rounded-md p-2 text-red-700 hover:bg-red-50"><XCircle size={17} /></button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
