"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>({ leads: [], appointments: [], attempts: [], slots: [] });
  useEffect(() => {
    Promise.all([
      api("/leads").catch(() => []),
      api("/appointments").catch(() => []),
      api("/call-attempts").catch(() => []),
      api("/slots").catch(() => [])
    ]).then(([leads, appointments, attempts, slots]) => setData({ leads, appointments, attempts, slots }));
  }, []);
  const stats = [
    ["Leads", data.leads.length],
    ["Available Slots", data.slots.filter((s: any) => s.status === "available").length],
    ["Booked", data.appointments.length],
    ["Retry Scheduled", data.attempts.filter((a: any) => a.status === "retry_scheduled").length]
  ];
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-md border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

