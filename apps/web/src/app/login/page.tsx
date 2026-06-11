"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function login(formData: FormData) {
    setError("");
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      credentials: "include"
    });
    if (!response.ok) {
      setError("Login failed");
      return;
    }
    const data = await response.json();
    localStorage.setItem("token", data.token);
    router.push("/");
  }
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 p-4">
      <form action={login} className="w-full max-w-sm rounded-md border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input name="email" type="email" defaultValue="admin@clinic.local" className="mt-4 w-full rounded-md border px-3 py-2" />
        <input name="password" type="password" defaultValue="ChangeMe123!" className="mt-3 w-full rounded-md border px-3 py-2" />
        <button className="mt-4 w-full rounded-md bg-cyan-700 px-4 py-2 text-white">Login</button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}

