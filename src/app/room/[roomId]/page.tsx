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
  DocumentData,
  getDocs,
} from "firebase/firestore";

type Player = {
  id: string;
  name: string;
  vote: string | null;
  removed?: boolean;
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

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;

    const initAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Erro signin anon:", err);
        }
      }
      unsubAuth = onAuthStateChanged(auth, () => {});
    };

    initAuth();
    return () => unsubAuth && unsubAuth();
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);
    const playersCol = collection(db, "rooms", roomId, "players");
    const q = query(playersCol, orderBy("joinedAt"));

    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as DocumentData;

      setRoomRevealed(Boolean(data.revealed));
      setOwnerId(data.ownerId ?? null);

      if (auth.currentUser) {
        setIsHost(data.ownerId === auth.currentUser.uid);
      }
    });

    const unsubPlayers = onSnapshot(q, (qsnap) => {
      const list: Player[] = qsnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((p) => !p.removed);

      setPlayers(list);

      if (auth.currentUser) {
        const me =
          qsnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .find((p) => p.id === auth.currentUser!.uid) ?? null;

        setCurrentPlayer(me);
        setJoined(Boolean(me && !me.removed));

        if (me?.removed) {
          router.push("/removed");
        }
      }
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomId, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomId) return;
    if (!auth.currentUser) await signInAnonymously(auth);

    const uid = auth.currentUser!.uid;
    await setDoc(doc(db, "rooms", roomId, "players", uid), {
      name,
      vote: null,
      joinedAt: serverTimestamp(),
      removed: false,
    });

    setJoined(true);
  };

  const handleVote = async (vote: string) => {
    if (!auth.currentUser || roomRevealed) return;
    const uid = auth.currentUser.uid;
    await updateDoc(doc(db, "rooms", roomId, "players", uid), { vote });
  };

  const handleReveal = async () => {
    if (!ownerId || !auth.currentUser || auth.currentUser.uid !== ownerId)
      return;
    await updateDoc(doc(db, "rooms", roomId), { revealed: true });
  };

  const handleReset = async () => {
    if (!ownerId || !auth.currentUser || auth.currentUser.uid !== ownerId)
      return;

    const playersCol = collection(db, "rooms", roomId, "players");
    const snapshot = await getDocs(playersCol);
    const batch = writeBatch(db);

    snapshot.forEach((d) => {
      batch.update(d.ref, { vote: null });
    });

    batch.update(doc(db, "rooms", roomId), { revealed: false });
    await batch.commit();
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!ownerId || !auth.currentUser || auth.currentUser.uid !== ownerId)
      return;
    if (playerId === ownerId) return;

    await updateDoc(doc(db, "rooms", roomId, "players", playerId), {
      removed: true,
    });
  };

  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <form
          onSubmit={handleJoin}
          className="flex flex-col items-center gap-6 w-full max-w-md bg-neutral-900 p-12 rounded"
        >
          <h2 className="text-2xl font-bold text-white mb-4">
            Entrar na sala {roomId}
          </h2>
          <input
            type="text"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded border border-gray-300 bg-neutral-800 text-white"
          />
          <button
            type="submit"
            className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold py-3 px-8 rounded"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white">
      <aside className="w-64 bg-neutral-900 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-4">Jogadores</h2>
          <ul className="space-y-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex justify-between items-center bg-neutral-800 px-3 py-2 rounded"
              >
                <span>
                  {player.name}
                  {player.id === ownerId ? " (host)" : ""}
                </span>
                {roomRevealed ? (
                  <span className="font-bold text-lime-400">
                    {player.vote ?? "-"}
                  </span>
                ) : player.vote ? (
                  <span className="text-gray-400">✔</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
                {isHost && player.id !== ownerId && (
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="ml-2 text-sm px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="flex flex-col gap-2">
            {!roomRevealed ? (
              <button
                onClick={handleReveal}
                className="bg-lime-400 text-gray-900 font-bold px-4 py-2 rounded hover:bg-lime-500"
              >
                Revelar votos
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="bg-red-400 text-gray-900 font-bold px-4 py-2 rounded hover:bg-red-500"
              >
                Nova votação
              </button>
            )}
          </div>
        )}
      </aside>

      <main className="flex flex-1 items-center justify-center">
        <div className="grid grid-cols-2 gap-6">
          {["P", "M", "G", "GG"].map((size) => {
            const isSelected = currentPlayer?.vote === size;
            return (
              <button
                key={size}
                onClick={() => handleVote(size)}
                disabled={roomRevealed}
                className={`w-40 h-40 flex items-center justify-center text-4xl font-bold rounded-lg border-2 transition
                  ${
                    isSelected
                      ? "border-lime-400 bg-neutral-800 scale-105"
                      : "border-transparent bg-neutral-800 hover:border-lime-400 hover:scale-105"
                  }
                  ${roomRevealed ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
