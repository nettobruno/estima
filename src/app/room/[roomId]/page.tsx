"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
  DocumentData,
  QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Check, Eye, RefreshCcw, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  vote: string | null;
  removed?: boolean;
};

type RoomData = {
  ownerId?: string;
  revealed?: boolean;
  voteOptions?: string[];
  createdAt?: Timestamp;
};

const SCALE_OPTIONS: { [key: string]: string[] } = {
  default: ["P", "M", "G", "GG"],
  fibonacci: ["1", "2", "3", "5", "8", "13", "20"],
  named: ["XS", "P", "M", "G", "XL", "XXL"],
  symbols: ["☕", "☕☕", "☕☕☕", "☕☕☕☕"],
  special: ["?", "P", "M", "G", "GG", "∞"],
};

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [roomRevealed, setRoomRevealed] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);
  const [voteOptions, setVoteOptions] = useState<string[]>(
    SCALE_OPTIONS.default
  );
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    const initAuth = async () => {
      if (!auth.currentUser) await signInAnonymously(auth);
      unsubAuth = onAuthStateChanged(auth, () => {});
    };
    initAuth();
    return () => unsubAuth && unsubAuth();
  }, []);

  useEffect(() => {
    if (!roomId || typeof roomId !== "string") return;
    const roomRef = doc(db, "rooms", roomId as string);
    const playersCol = collection(db, "rooms", roomId as string, "players");
    const q = query(playersCol, orderBy("joinedAt"));

    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as RoomData;
      setRoomRevealed(Boolean(data.revealed));
      setOwnerId(data.ownerId ?? null);
      setVoteOptions(data.voteOptions ?? SCALE_OPTIONS.default);
      if (auth.currentUser) setIsHost(data.ownerId === auth.currentUser.uid);
      if (data.createdAt) {
        const created = data.createdAt.toDate();
        setCreatedAt(created);
        const diff = 24 * 60 * 60 * 1000 - (Date.now() - created.getTime());
        setTimeLeft(diff > 0 ? diff : 0);
        if (diff <= 0) router.push("/");
      }
    });

    const unsubPlayers = onSnapshot(q, (qsnap: QuerySnapshot<DocumentData>) => {
      const list: Player[] = qsnap.docs
        .map((d) => ({
          id: d.id,
          name: d.data().name,
          vote: d.data().vote ?? null,
          removed: d.data().removed ?? false,
        }))
        .filter((p) => !p.removed);
      setPlayers(list);
      if (auth.currentUser) {
        const me =
          qsnap.docs
            .map((d) => ({
              id: d.id,
              name: d.data().name,
              vote: d.data().vote ?? null,
              removed: d.data().removed ?? false,
            }))
            .find((p) => p.id === auth.currentUser!.uid) ?? null;
        setCurrentPlayer(me);
        setJoined(Boolean(me && !me.removed));
        if (me?.removed) router.push("/removed");
      }
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomId, router]);

  useEffect(() => {
    if (!createdAt) return;
    const interval = setInterval(() => {
      const diff = 24 * 60 * 60 * 1000 - (Date.now() - createdAt.getTime());
      setTimeLeft(diff > 0 ? diff : 0);
      if (diff <= 0) {
        clearInterval(interval);
        router.push("/");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomId || typeof roomId !== "string") return;
    setIsJoining(true);
    if (!auth.currentUser) await signInAnonymously(auth);
    const uid = auth.currentUser!.uid;
    await setDoc(doc(db, "rooms", roomId as string, "players", uid as string), {
      name,
      vote: null,
      joinedAt: serverTimestamp(),
      removed: false,
    });
    setJoined(true);
    setIsJoining(false);
  };

  const handleVote = async (vote: string) => {
    if (
      !auth.currentUser ||
      roomRevealed ||
      !roomId ||
      typeof roomId !== "string"
    )
      return;
    const uid = auth.currentUser.uid;
    await updateDoc(
      doc(db, "rooms", roomId as string, "players", uid as string),
      { vote }
    );
  };

  const handleReveal = async () => {
    if (
      !ownerId ||
      !auth.currentUser ||
      auth.currentUser.uid !== ownerId ||
      !roomId ||
      typeof roomId !== "string"
    )
      return;
    const votes: { [key: string]: string } = {};
    players.forEach((p) => (votes[p.id] = p.vote ?? "-"));
    await setDoc(doc(collection(db, "rooms", roomId as string, "rounds")), {
      votes,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "rooms", roomId as string), { revealed: true });
  };

  const handleReset = async () => {
    if (
      !ownerId ||
      !auth.currentUser ||
      auth.currentUser.uid !== ownerId ||
      !roomId ||
      typeof roomId !== "string"
    )
      return;
    const playersCol = collection(db, "rooms", roomId as string, "players");
    const snapshot = await getDocs(playersCol);
    const batch = writeBatch(db);
    snapshot.forEach((d) => batch.update(d.ref, { vote: null }));
    batch.update(doc(db, "rooms", roomId as string), { revealed: false });
    await batch.commit();
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (
      !ownerId ||
      !auth.currentUser ||
      auth.currentUser.uid !== ownerId ||
      !roomId ||
      typeof roomId !== "string"
    )
      return;
    if (playerId === ownerId) return;
    await updateDoc(
      doc(db, "rooms", roomId as string, "players", playerId as string),
      { removed: true }
    );
  };

  const handleChangeVoteOptions = async (options: string[]) => {
    if (
      !ownerId ||
      !auth.currentUser ||
      auth.currentUser.uid !== ownerId ||
      !roomId ||
      typeof roomId !== "string"
    )
      return;
    await updateDoc(doc(db, "rooms", roomId as string), {
      voteOptions: options,
    });
  };

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 1000 / 60 / 60);
    const m = Math.floor((ms / 1000 / 60) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      router.push(`/room/${roomId}/dashboard`);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 p-4">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md bg-neutral-900 text-white">
            <DialogHeader>
              <DialogTitle>Entrar na sala {roomId}</DialogTitle>
              <DialogDescription>
                Digite seu nome para entrar na sala
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoin} className="flex flex-col gap-4 mt-4">
              <Input
                type="text"
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                type="submit"
                disabled={isJoining}
                className="flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                {isJoining ? (
                  "Entrando..."
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Entrar
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-white">
      <Dialog
        open={!!playerToRemove}
        onOpenChange={() => setPlayerToRemove(null)}
      >
        <DialogContent className="sm:max-w-sm bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>Remover participantes</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover ´${playerToRemove?.name}´ da sala?
              Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              className="hover:cursor-pointer"
              variant="ghost"
              onClick={() => setPlayerToRemove(null)}
            >
              Cancelar
            </Button>
            <Button
              className="hover:cursor-pointer"
              variant="destructive"
              onClick={async () => {
                if (playerToRemove) {
                  await handleRemovePlayer(playerToRemove.id);
                  setPlayerToRemove(null);
                }
              }}
            >
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <aside className="w-full md:w-64 bg-neutral-900 p-4 sm:p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2 sm:mb-4">Participantes</h2>
          <ul className="space-y-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex flex-col sm:flex-row justify-between items-center bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-sm hover:bg-neutral-700 transition gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{player.name}</span>
                  {player.id === ownerId && (
                    <span className="text-sm text-lime-400 font-semibold">
                      (host)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {roomRevealed ? (
                    <span className="font-bold text-lime-400 text-lg">
                      {player.vote ?? "-"}
                    </span>
                  ) : player.vote ? (
                    <Check className="text-green-400 w-5 h-5" />
                  ) : (
                    <Minus className="text-gray-500 w-5 h-5" />
                  )}
                  {isHost && player.id !== ownerId && (
                    <Button
                      onClick={() => setPlayerToRemove(player)}
                      variant="destructive"
                      className="w-8 h-8 p-0 rounded-full flex items-center justify-center hover:cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {isHost && (
            <div className="mt-12 flex flex-col gap-2">
              <label className="text-sm text-gray-300">
                Escala de votação:
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SCALE_OPTIONS).map(([key, options]) => (
                  <Button
                    key={key}
                    onClick={() => handleChangeVoteOptions(options)}
                    className={cn(
                      "text-sm rounded-full px-3 transition-all hover:scale-105 hover:cursor-pointer",
                      voteOptions.join() === options.join()
                        ? "bg-lime-400 text-zinc-900 hover:bg-lime-500"
                        : "bg-neutral-800 text-white hover:bg-neutral-700"
                    )}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isHost && (
          <div className="flex flex-col gap-2 mt-4">
            {!roomRevealed ? (
              <Button
                onClick={handleReveal}
                className="flex items-center gap-2 bg-lime-400 hover:bg-lime-500 text-zinc-900 font-bold hover:cursor-pointer"
              >
                <Eye className="w-4 h-4" /> Revelar votos
              </Button>
            ) : (
              <Button
                onClick={handleReset}
                className="flex items-center gap-2 bg-red-400 hover:bg-red-500 text-zinc-900 font-bold hover:cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" /> Nova votação
              </Button>
            )}

            <Button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold mt-2 hover:cursor-pointer"
            >
              Finalizar estimativa
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent className="sm:max-w-sm bg-neutral-900 text-white">
                <DialogHeader>
                  <DialogTitle>Confirmar ação</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja finalizar a estimativa? Esta ação irá
                    gerar a dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    className="hover:cursor-pointer"
                    variant="ghost"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="flex items-center gap-2 hover:cursor-pointer"
                    variant="secondary"
                  >
                    {loading ? "Finalizando..." : "Confirmar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="mt-4 text-sm text-gray-400">
              {timeLeft > 0 && `Expira em ${formatTime(timeLeft)}`}
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {voteOptions.map((size) => {
            const isSelected = currentPlayer?.vote === size;
            return (
              <Button
                key={size}
                onClick={() => handleVote(size)}
                disabled={roomRevealed}
                className={`w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold hover:cursor-pointer rounded-full border-2 transition break-words whitespace-normal ${
                  isSelected
                    ? "border-lime-400 bg-neutral-800 scale-105"
                    : "border-transparent bg-neutral-800 hover:border-lime-400 hover:scale-105"
                } ${roomRevealed ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {size}
              </Button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
