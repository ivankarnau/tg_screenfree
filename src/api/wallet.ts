import { apiFetch } from "./client";

export interface Balance {
  user_id: number;
  balance: number;
}

export async function getBalance(): Promise<Balance> {
  const r = await apiFetch("/wallet/balance");
  if (!r.ok) throw new Error("Failed to load balance");
  return r.json();
}
