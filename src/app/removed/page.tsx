"use client";

import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

export default function RemovedPage() {
  const router = useRouter();
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-black p-6">
      <div className="max-w-xl text-center bg-neutral-900 bg-opacity-80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-neutral-800">
        <div className="flex justify-center mb-6">
          <Rocket className="w-16 h-16 text-lime-400 animate-bounce" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4 text-lime-400">
          Opa, temos um problema!
        </h1>
        <p className="mb-8 text-gray-300 text-lg">
          A sala decidiu que você precisava de uma viagem pelo{" "}
          <span className="text-lime-400 font-semibold">espaço profundo</span>{" "}
          🛸
          <br />
          Mas relaxa — vamos te trazer de volta em segurança.
        </p>
        <button
          onClick={() => router.push("/")}
          className="relative inline-flex items-center justify-center px-8 py-4 font-bold text-lg text-neutral-900 bg-lime-400 rounded-full shadow-lg transition-transform hover:scale-105 hover:shadow-2xl hover:cursor-pointer"
        >
          Levar-me de volta
        </button>
      </div>
    </div>
  );
}
