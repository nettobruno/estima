"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../../lib/firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Round = {
  votes: { [playerId: string]: string };
  createdAt: Date;
};

type Player = {
  id: string;
  name: string;
};

const COLORS = [
  "#84cc16",
  "#22d3ee",
  "#f87171",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
];

export default function DashboardPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId as string);

    getDoc(roomRef).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.createdAt) {
        const created = data.createdAt.toDate();
        const diff = 24 * 60 * 60 * 1000 - (Date.now() - created.getTime());
        setTimeLeft(diff > 0 ? diff : 0);
        if (diff <= 0) router.push("/");
      }
    });

    const playersCol = collection(db, "rooms", roomId as string, "players");
    const roundsCol = collection(db, "rooms", roomId as string, "rounds");

    const unsubPlayers = onSnapshot(playersCol, (qsnap) => {
      setPlayers(qsnap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });

    const unsubRounds = onSnapshot(roundsCol, (qsnap) => {
      setRounds(
        qsnap.docs.map((d) => ({
          votes: d.data().votes,
          createdAt: d.data().createdAt.toDate(),
        }))
      );
    });

    return () => {
      unsubPlayers();
      unsubRounds();
    };
  }, [roomId, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!rounds.length) return;
      const createdAt = rounds[0].createdAt;
      const diff = 24 * 60 * 60 * 1000 - (Date.now() - createdAt.getTime());
      setTimeLeft(diff > 0 ? diff : 0);
      if (diff <= 0) {
        clearInterval(interval);
        router.push("/");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rounds, router]);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 1000 / 60 / 60);
    const m = Math.floor((ms / 1000 / 60) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const voteSummary = rounds.map((round, index) => {
    const counts: { [key: string]: number } = {};
    Object.values(round.votes).forEach((v) => {
      counts[v] = (counts[v] ?? 0) + 1;
    });
    return { round: `Rodada ${index + 1}`, ...counts };
  });

  return (
    <div className="p-6 bg-neutral-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard da sala {roomId}</h1>
        <Button
          onClick={shareLink}
          className="flex items-center gap-2 bg-lime-400 text-zinc-900 hover:bg-lime-500 hover:cursor-pointer"
        >
          <Share2 className="w-4 h-4" /> {copied ? "Copiado!" : "Copiar link"}
        </Button>
      </div>
      <div className="mb-4 text-gray-400">
        {timeLeft > 0 && `Expira em ${formatTime(timeLeft)}`}
      </div>
      {voteSummary.map((r, idx) => (
        <div key={idx} className="mb-8 bg-neutral-900 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">{r.round}</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={[r]}>
              <XAxis dataKey="round" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              {Object.keys(r)
                .filter((k) => k !== "round")
                .map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
