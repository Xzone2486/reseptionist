"use client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.WEB_PUBLIC_API_URL || "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}/api${path}`, { ...init, headers, credentials: "include" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

