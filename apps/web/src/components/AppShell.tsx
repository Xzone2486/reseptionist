"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, FileUp, Home, ListChecks, PhoneCall, Settings, Users } from "lucide-react";

const nav = [
  ["Dashboard", "/", Home],
  ["Leads", "/leads", Users],
  ["Upload Slots", "/slots/upload", FileUp],
  ["Slots", "/slots", ListChecks],
  ["Appointments", "/appointments", CalendarDays],
  ["Campaigns", "/campaigns", PhoneCall],
  ["Call Logs", "/calls", ClipboardList],
  ["Settings", "/settings", Settings]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-r border-gray-200 bg-white md:w-64">
        <div className="px-4 py-4 text-lg font-semibold">Clinic Voice Desk</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-1">
          {nav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm ${pathname === href ? "bg-cyan-50 text-cyan-800" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

