"use client";

import { useRouter } from "next/navigation";

export default function RemovedPage() {
  const router = useRouter();
  return (
    <div className="h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="max-w-xl text-center bg-neutral-900 p-12 rounded shadow">
        <h1 className="text-3xl font-bold mb-4">Opa, temos um problema!</h1>
        <p className="mb-6 text-gray-300">
          A sala decidiu que você precisava de uma viagem pro espaço profundo.
          🛸
          <br />
          Mas relaxa — a gente te leva de volta.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-lime-400 text-gray-900 font-bold px-6 py-3 rounded"
        >
          Levar-me de volta
        </button>
      </div>
    </div>
  );
}
