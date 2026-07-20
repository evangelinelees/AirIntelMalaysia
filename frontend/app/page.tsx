"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Dashboard from "@/components/Dashboard";
import AqiHero from "@/components/AqiHero";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initOneSignal } from "@/lib/oneSignal";

export default function Home() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const oneSignalInitialized = useRef(false);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setRole(data?.role ?? null);
        if (!oneSignalInitialized.current) {
          oneSignalInitialized.current = true;
          await initOneSignal(user.id);
        }
      }
    }
    fetchUser();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;
        setUserId(user?.id ?? null);
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          setRole(data?.role ?? null);
          if (!oneSignalInitialized.current) {
            oneSignalInitialized.current = true;
            await initOneSignal(user.id);
          }
        } else {
          setRole(null);
        }
      },
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId && role === "admin") {
      router.push("/admin");
    }
  }, [userId, role, router]);

  if (userId === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-haze-400">
        Loading…
      </div>
    );
  }

  if (userId && role === "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center text-haze-400">
        Redirecting to admin…
      </div>
    );
  }

  if (userId) {
    return <Dashboard userId={userId} />;
  }

  // Guest
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <p className="instrument-label">AirIntel Malaysia</p>
        <h1 className="mt-2 font-display text-3xl text-ink">
          Know before the haze arrives.
        </h1>
        <p className="mt-2 max-w-md text-haze-400">
          Check conditions right now, or sign in to pin your favorite spots and
          get proactive alerts on your phone and Telegram.
        </p>
      </div>
      <div className="w-full max-w-sm">
        <AqiHero />
      </div>
      <Link
        href="/login"
        className="text-sm text-brand underline underline-offset-4"
      >
        Sign in / create an account
      </Link>
    </div>
  );
}
