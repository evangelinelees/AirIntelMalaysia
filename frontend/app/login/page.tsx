"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset email sent! Check your inbox.");
      }
      return;
    }

    if (mode === "signUp" && username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    const { data, error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            // Read by the handle_new_user() DB trigger at insert time —
            // see database/schema.sql. This avoids calling /api/account
            // right after signUp(), which raced with (and lost to)
            // "Confirm email" projects: signUp() returns no session at
            // all until the email is confirmed, so an authenticated
            // PATCH immediately after it would 401 every time on such
            // projects, regardless of any client-side timing fix.
            options: { data: { username: username.trim() } },
          });

    if (error) {
      setError(error.message);
      return;
    }

    if (mode === "signUp" && !data.session) {
      // "Confirm email" is on for this project — the account exists but
      // there's no session to redirect into yet.
      setMessage("Account created — check your email to confirm it before signing in.");
      return;
    }

    router.push("/");
  }

  function toggleMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setUsername("");
    setError(null);
    setMessage(null);
  }

  function showReset() {
    setMode("reset");
    setError(null);
    setMessage(null);
  }

  function backToSignIn() {
    setMode("signIn");
    setError(null);
    setMessage(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-instrument border border-haze-50 bg-panelRaised p-6">
        <h1 className="font-display text-xl text-ink">
          {mode === "signIn"
            ? "Sign in"
            : mode === "signUp"
              ? "Create account"
              : "Reset password"}
        </h1>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="instrument-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-ink"
              required
            />
          </label>

          {mode === "signUp" && (
            <label className="block">
              <span className="instrument-label">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                className="mt-1 w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-ink"
                required
              />
            </label>
          )}

          {mode !== "reset" && (
            <label className="block">
              <span className="instrument-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-ink"
                required
              />
            </label>
          )}

          {error && <p className="text-sm text-alert">{error}</p>}
          {message && <p className="text-sm text-clear">{message}</p>}

          <button
            type="submit"
            className="mt-2 w-full rounded-instrument bg-brand py-2.5 font-display text-white hover:opacity-90"
          >
            {mode === "signIn"
              ? "Sign in"
              : mode === "signUp"
                ? "Create account"
                : "Send reset email"}
          </button>
        </form>

        {mode === "reset" ? (
          <button
            onClick={backToSignIn}
            className="mt-3 w-full text-center text-sm text-haze-200 underline underline-offset-4"
          >
            Back to sign in
          </button>
        ) : (
          <>
            <button
              onClick={toggleMode}
              className="mt-3 w-full text-center text-sm text-haze-200 underline underline-offset-4"
            >
              {mode === "signIn"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
            {mode === "signIn" && (
              <button
                onClick={showReset}
                className="mt-1 w-full text-center text-sm text-haze-200 underline underline-offset-4"
              >
                Forgot password?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
