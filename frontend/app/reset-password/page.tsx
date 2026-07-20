"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated successfully!");
      setTimeout(() => router.push("/login"), 2000);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-instrument border border-haze-50 bg-panelRaised p-6">
        <h1 className="font-display text-xl text-ink">Set new password</h1>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="instrument-label">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-ink"
              required
              minLength={6}
            />
          </label>
          {error && <p className="text-sm text-alert">{error}</p>}
          {message && <p className="text-sm text-clear">{message}</p>}
          <button
            type="submit"
            className="mt-2 w-full rounded-instrument bg-brand py-2.5 font-display text-white hover:opacity-90"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
