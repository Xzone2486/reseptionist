"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";

export function UploadBox({ endpoint, label }: { endpoint: string; label: string }) {
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setMessage("Uploading...");
    const result = await api(endpoint, { method: "POST", body: formData });
    setMessage(`Imported ${result.imported ?? 0} rows`);
  }
  return (
    <form action={submit} className="rounded-md border border-gray-200 bg-white p-4">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input name="file" type="file" accept=".csv,.xlsx,.xls" className="rounded-md border border-gray-300 bg-white px-3 py-2" />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-white" type="submit">
          <Upload size={16} /> Upload
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </form>
  );
}

