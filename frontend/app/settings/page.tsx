"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [username, setUsername] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? "");

      const { data } = await supabase
        .from("users")
        .select("username")
        .eq("id", session.user.id)
        .single();
      setUsername(data?.username ?? "");
    }
    load();
  }, [router]);

  async function saveUsername() {
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update username.");
      setUsernameMsg({ type: "ok", text: "Username updated." });
    } catch (e: any) {
      setUsernameMsg({ type: "error", text: e.message });
    } finally {
      setUsernameSaving(false);
    }
  }

  async function savePassword() {
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords don't match." });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPasswordMsg({ type: "ok", text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setPasswordMsg({
        type: "error",
        text: e.message || "Couldn't update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete account.");
      await supabase.auth.signOut();
      router.push("/login");
    } catch (e: any) {
      setDeleteError(e.message);
      setDeleting(false);
    }
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-haze-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-haze-400 hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="instrument-label">Account</p>
          <h1 className="font-display text-2xl text-ink">Settings</h1>
        </div>
      </div>

      <p className="text-sm text-haze-200">Signed in as {email}</p>

      {/* Username */}
      <section className="rounded-instrument border border-haze-50 bg-panelRaised p-6 shadow-instrument">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <User size={18} className="text-brand" />
          Username
        </h2>
        <p className="mt-1 text-sm text-haze-200">
          Shown instead of your email in places the app addresses you directly.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className="flex-1 rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            onClick={saveUsername}
            disabled={usernameSaving}
            className="rounded-instrument bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {usernameSaving ? "Saving…" : "Save"}
          </button>
        </div>
        {usernameMsg && (
          <p
            className={`mt-2 text-sm ${usernameMsg.type === "ok" ? "text-clear" : "text-alert"}`}
          >
            {usernameMsg.text}
          </p>
        )}
      </section>

      {/* Password */}
      <section className="rounded-instrument border border-haze-50 bg-panelRaised p-6 shadow-instrument">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Lock size={18} className="text-brand" />
          Change password
        </h2>
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            className="w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            onClick={savePassword}
            disabled={passwordSaving}
            className="rounded-instrument bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {passwordSaving ? "Saving…" : "Update password"}
          </button>
        </div>
        {passwordMsg && (
          <p
            className={`mt-2 text-sm ${passwordMsg.type === "ok" ? "text-clear" : "text-alert"}`}
          >
            {passwordMsg.text}
          </p>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-instrument border border-alert/40 bg-panelRaised p-6">
        <h2 className="flex items-center gap-2 font-display text-lg text-alert">
          <Trash2 size={18} />
          Delete account
        </h2>
        <p className="mt-1 text-sm text-haze-200">
          Permanently deletes your account, pinned locations, alert history, and
          push registrations. This can't be undone.
        </p>
        <p className="mt-3 text-sm text-ink">
          Type <span className="font-mono">DELETE</span> to confirm:
        </p>
        <input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          className="mt-2 w-full max-w-xs rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-alert"
        />
        <button
          onClick={deleteAccount}
          disabled={deleteConfirmText !== "DELETE" || deleting}
          className="mt-3 w-full rounded-instrument bg-alert py-2.5 font-display text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {deleting ? "Deleting…" : "Permanently delete my account"}
        </button>
        {deleteError && (
          <p className="mt-2 text-sm text-alert">{deleteError}</p>
        )}
      </section>
    </div>
  );
}
