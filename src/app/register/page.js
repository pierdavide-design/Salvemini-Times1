"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account creato con successo!");

    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="bg-[#1A1A1A] p-8 rounded-3xl w-[400px] border border-zinc-800">

        <h1 className="text-3xl font-bold text-[#C5A46D] mb-2">
          Campus Voice
        </h1>

        <p className="text-zinc-400 mb-6">
          Crea il tuo account redattore
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 bg-zinc-900 rounded-xl mb-4 border border-zinc-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 bg-zinc-900 rounded-xl mb-6 border border-zinc-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-[#C5A46D] text-black p-3 rounded-xl font-bold hover:opacity-90 transition"
        >
          {loading ? "Registrazione..." : "Registrati"}
        </button>

        <button
          onClick={() => (window.location.href = "/login")}
          className="w-full mt-4 bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 transition"
        >
          Hai già un account?
        </button>

      </div>
    </div>
  );
}