"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/profilo");
      }
    }

    checkUser();
  }, [router]);

  async function handleLogin() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/profilo");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-8 w-[420px]">

        <h1 className="text-3xl font-bold text-[#C5A46D] mb-2">
          Campus Voice
        </h1>

        <p className="text-zinc-400 mb-6">
          Accedi al tuo account
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 mb-4"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 mb-6"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#C5A46D] text-black py-3 rounded-xl font-semibold hover:opacity-90"
        >
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <button
          onClick={() => router.push("/register")}
          className="w-full mt-4 bg-zinc-800 py-3 rounded-xl hover:bg-zinc-700"
        >
          Registrati
        </button>

        <button
          onClick={() => router.push("/")}
          className="w-full mt-4 border border-zinc-700 py-3 rounded-xl hover:bg-zinc-800 transition"
        >
          ← Torna alla Home
        </button>

      </div>
    </div>
  );
}