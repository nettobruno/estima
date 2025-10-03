"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type OnboardingSteps = "landing" | "create-room" | "room-created";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<OnboardingSteps>("landing");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const router = useRouter();

  const handleCreateSession = () => setCurrentStep("create-room");

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);

    const generateRoomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    if (!auth.currentUser) await signInAnonymously(auth);
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
    setIsCreating(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  const handleEnterRoom = () => {
    setIsEntering(true);
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="bg-zinc-900 flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 font-sans w-full overflow-x-hidden">
      {currentStep === "landing" && (
        <div className="w-full max-w-screen-sm">
          <h1 className="text-white text-4xl sm:text-7xl text-center font-bold mb-6 sm:mb-8 px-2 sm:px-0 break-words">
            Descomplicando suas{" "}
            <span className="text-lime-400">estimativas</span>
          </h1>
          <p className="text-base sm:text-2xl text-center text-gray-300 max-w-xl sm:max-w-2xl mb-3 sm:mb-4 px-2 sm:px-0">
            Uma ferramenta de planejamento gratuita e em tempo real, para
            equipes modernas e ágeis.
          </p>
          <p className="text-base sm:text-2xl text-center text-lime-400 mb-8 sm:mb-12 px-2 sm:px-0">
            Sem conta, sem complicações.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreateSession}
              className="bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold text-md py-3 px-6 sm:py-8 sm:px-12 rounded w-full sm:w-auto hover:cursor-pointer"
            >
              Crie uma sessão agora
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={currentStep === "create-room"}
        onOpenChange={() => setCurrentStep("landing")}
      >
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          showCloseButton={false}
          className="sm:max-w-md bg-zinc-900 text-white border border-zinc-800 shadow-xl"
        >
          <DialogHeader>
            <DialogTitle>Inicie uma sessão</DialogTitle>
            <DialogDescription>
              Digite seu nome para criar a sala
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Criando..." : "Entrar na sala"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={currentStep === "room-created"}
        onOpenChange={() => setCurrentStep("landing")}
      >
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          showCloseButton={false}
          className="sm:max-w-md bg-zinc-900 text-white border border-zinc-800 shadow-xl"
        >
          <DialogHeader>
            <DialogTitle>Sala criada com sucesso</DialogTitle>
            <DialogDescription>
              Compartilhe este link com sua equipe:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <Input type="text" value={roomLink} readOnly className="w-full" />
            <Button
              onClick={handleCopyLink}
              className="bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold w-full sm:w-auto hover:cursor-pointer"
            >
              {linkCopied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <Button
            onClick={handleEnterRoom}
            className="bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold w-full sm:w-auto hover:cursor-pointer"
          >
            {isEntering ? "Entrando..." : "Entrar na sala"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
