"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type OnboardingSteps = "landing" | "create-room" | "room-created";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<OnboardingSteps>("landing");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();

  const handleCreateSession = () => setCurrentStep("create-room");

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generateRoomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const uid = auth.currentUser!.uid;

    await setDoc(doc(db, "rooms", generateRoomId), {
      ownerId: uid,
      revealed: false,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "rooms", generateRoomId, "players", uid), {
      name,
      vote: null,
      joinedAt: serverTimestamp(),
      removed: false,
    });

    setRoomId(generateRoomId);
    setRoomLink(`${window.location.origin}/room/${generateRoomId}`);
    setCurrentStep("room-created");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnterRoom = () => router.push(`/room/${roomId}`);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 font-sans">
      {currentStep === "landing" && (
        <>
          <h1 className="text-7xl text-center font-bold mb-8">
            Descomplicando suas{" "}
            <span className="text-lime-400">estimativas</span>
          </h1>
          <p className="text-2xl text-center text-gray-300 max-w-2xl mb-4">
            Uma ferramenta de planejamento gratuita e em tempo real, para
            equipes modernas e ágeis.
          </p>
          <p className="text-2xl text-center text-lime-400 mb-12">
            Sem conta, sem complicações.
          </p>
          <button
            onClick={handleCreateSession}
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-4 px-12 rounded"
          >
            Crie uma sessão agora
          </button>
        </>
      )}

      {currentStep === "create-room" && (
        <form
          onSubmit={handleCreateRoom}
          className="flex flex-col items-center gap-6 w-full max-w-md bg-neutral-900 p-20 rounded"
        >
          <h2 className="text-2xl font-bold text-white">Inicie uma sessão</h2>
          <input
            type="text"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded border border-gray-300 bg-neutral-800 text-white"
          />
          <button
            type="submit"
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-3 px-8 rounded"
          >
            Entrar na sala
          </button>
        </form>
      )}

      {currentStep === "room-created" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md bg-neutral-900 p-20 rounded">
          <h2 className="text-2xl font-bold text-white">
            Sala criada com sucesso
          </h2>
          <p className="text-gray-300">Compartilhe este link com sua equipe:</p>

          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={roomLink}
              readOnly
              className="w-full px-4 py-3 rounded border border-gray-300 bg-neutral-800 text-white"
            />
            <button
              onClick={handleCopyLink}
              className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-2 px-4 rounded"
            >
              {linkCopied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <button
            onClick={handleEnterRoom}
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-3 px-8 rounded"
          >
            Entrar na sala
          </button>
        </div>
      )}
    </div>
  );
}
