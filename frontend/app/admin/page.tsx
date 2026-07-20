"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminPanel from "@/components/AdminPanel";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">(
    "loading",
  );
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus("denied");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (data?.role === "admin") {
        setStatus("authorized");
      } else {
        setStatus("denied");
      }
    }
    check();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (status === "loading")
    return <div className="p-6 text-haze-400">Checking access…</div>;
  if (status === "denied") {
    router.push("/");
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="instrument-label">AirIntel Malaysia</p>
          <h1 className="font-display text-2xl text-ink">Admin console</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-instrument border border-haze-50 bg-panel px-4 py-2 text-sm text-ink hover:bg-panelRaised"
        >
          Logout
        </button>
      </div>
      <AdminPanel />
    </div>
  );
}
