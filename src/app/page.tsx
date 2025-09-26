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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 font-sans">
      {currentStep === "landing" && (
        <>
          <h1 className="text-5xl sm:text-7xl text-center font-bold mb-6 sm:mb-8 px-4 sm:px-0">
            Descomplicando suas{" "}
            <span className="text-lime-400">estimativas</span>
          </h1>
          <p className="text-lg sm:text-2xl text-center text-gray-300 max-w-xl sm:max-w-2xl mb-3 sm:mb-4 px-2 sm:px-0">
            Uma ferramenta de planejamento gratuita e em tempo real, para
            equipes modernas e ágeis.
          </p>
          <p className="text-lg sm:text-2xl text-center text-lime-400 mb-8 sm:mb-12 px-2 sm:px-0">
            Sem conta, sem complicações.
          </p>
          <button
            onClick={handleCreateSession}
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-3 px-6 sm:py-4 sm:px-12 rounded"
          >
            Crie uma sessão agora
          </button>
        </>
      )}

      {currentStep === "create-room" && (
        <form
          onSubmit={handleCreateRoom}
          className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-sm sm:max-w-md bg-neutral-900 p-6 sm:p-20 rounded"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Inicie uma sessão
          </h2>
          <input
            type="text"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded border border-gray-300 bg-neutral-800 text-white"
          />
          <button
            type="submit"
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-2 sm:py-3 px-6 sm:px-8 rounded"
          >
            Entrar na sala
          </button>
        </form>
      )}

      {currentStep === "room-created" && (
        <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-sm sm:max-w-md bg-neutral-900 p-6 sm:p-20 rounded">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Sala criada com sucesso
          </h2>
          <p className="text-gray-300 text-center">
            Compartilhe este link com sua equipe:
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <input
              type="text"
              value={roomLink}
              readOnly
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded border border-gray-300 bg-neutral-800 text-white w-full"
            />
            <button
              onClick={handleCopyLink}
              className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-2 px-4 rounded w-full sm:w-auto"
            >
              {linkCopied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <button
            onClick={handleEnterRoom}
            className="bg-lime-400 hover:bg-lime-500 text-gray-700 font-bold py-2 sm:py-3 px-6 sm:px-8 rounded w-full sm:w-auto"
          >
            Entrar na sala
          </button>
        </div>
      )}
    </div>
  );
}
