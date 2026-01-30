"use client";

import { motion } from "framer-motion";
import { Flame, ThumbsDown, Scale, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

interface ReactionBarProps {
  targetType: "post" | "comment";
  targetId: string | number;
  isOwner: boolean;
  onMuzakereClick: () => void;
}

export default function ReactionBar({
  targetType,
  targetId,
  isOwner,
  onMuzakereClick,
}: ReactionBarProps) {
  const supabase = createClient();

  const [activeReaction, setActiveReaction] = useState<
    "woow" | "doow" | "adil" | null
  >(null);

  const [counts, setCounts] = useState({
    woow: 0,
    doow: 0,
    adil: 0,
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user && !isOwner) {
          const { data } = await supabase
            .from("reactions")
            .select("type")
            .eq("target_type", targetType)
            .eq("target_id", targetId)
            .eq("user_id", user.id)
            .single();

          if (!mounted) return;
          setActiveReaction((data?.type as any) || null);
        }

        const { data: reactionData } = await supabase
          .from("reactions")
          .select("type")
          .eq("target_type", targetType)
          .eq("target_id", targetId);

        if (!mounted) return;

        const countMap = { woow: 0, doow: 0, adil: 0 };
        reactionData?.forEach(
          (r) => (countMap[r.type as keyof typeof countMap] += 1)
        );

        setCounts(countMap);
      } catch {
        // abort edilen istekler sessizce yutulur
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [supabase, targetType, targetId, isOwner]);

  const handleReaction = async (type: "woow" | "doow" | "adil") => {
    if (isOwner) return;

    let user;
    try {
      const res = await supabase.auth.getUser();
      user = res.data.user;
    } catch {
      return;
    }

    if (!user) return;

    if (activeReaction) {
      await supabase
        .from("reactions")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("user_id", user.id);

      setCounts((prev) => ({
        ...prev,
        [activeReaction]: prev[activeReaction] - 1,
      }));
    }

    if (activeReaction !== type) {
      await supabase.from("reactions").insert({
        target_type: targetType,
        target_id: targetId,
        type,
        user_id: user.id,
      });

      setCounts((prev) => ({
        ...prev,
        [type]: prev[type] + 1,
      }));

      setActiveReaction(type);
    } else {
      setActiveReaction(null);
    }
  };

  const ReactionButton = ({
    type,
    label,
    icon,
    activeBg,
  }: {
    type: "woow" | "doow" | "adil";
    label: string;
    icon: React.ReactNode;
    activeBg: string;
  }) => (
    <button
      onClick={() => handleReaction(type)}
      disabled={isOwner}
      className="flex flex-col items-center gap-1 group"
    >
      <motion.div
        whileTap={
          isOwner
            ? { scale: 1 }
            : { scale: 0.94, transition: { duration: 0.08 } }
        }
        animate={{
          scale: activeReaction === type ? 1.06 : 1,
          transition: { duration: 0.16, ease: [0.2, 0, 0, 1] },
        }}
        className={`p-3 rounded-full transition-colors ${
          activeReaction === type ? activeBg : ""
        }`}
      >
        {icon}
      </motion.div>

      <span className="text-[9px] uppercase font-black tracking-tighter text-slate-400">
        {label} {counts[type] > 0 && `(${counts[type]})`}
      </span>
    </button>
  );

  return (
    <div className="px-2 py-3 bg-slate-50/50 flex items-center justify-around border-t border-slate-100/50">
      <ReactionButton
        type="woow"
        label="Woow"
        activeBg="bg-amber-500/10"
        icon={
          <Flame
            size={22}
            className={
              activeReaction === "woow"
                ? "text-amber-500"
                : "text-slate-400 group-hover:text-amber-500"
            }
          />
        }
      />

      <ReactionButton
        type="doow"
        label="Doow"
        activeBg="bg-red-500/10"
        icon={
          <ThumbsDown
            size={22}
            className={
              activeReaction === "doow"
                ? "text-red-500"
                : "text-slate-400 group-hover:text-red-500"
            }
          />
        }
      />

      <ReactionButton
        type="adil"
        label="Adil"
        activeBg="bg-blue-500/10"
        icon={
          <Scale
            size={22}
            className={
              activeReaction === "adil"
                ? "text-blue-500"
                : "text-slate-400 group-hover:text-blue-500"
            }
          />
        }
      />

      <button
        onClick={onMuzakereClick}
        className="flex flex-col items-center gap-1 group"
      >
        <div className="p-3 rounded-full group-hover:bg-slate-200/60">
          <MessageSquare size={22} className="text-slate-400" />
        </div>
        <span className="text-[9px] uppercase font-black tracking-tighter text-slate-400">
          Müzakere
        </span>
      </button>
    </div>
  );
}
