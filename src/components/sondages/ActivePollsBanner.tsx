import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import type { Poll } from "@/types/sondages";

export default function ActivePollsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unvotedPolls, setUnvotedPolls] = useState<Poll[]>([]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    // Active polls
    const { data: pollsData } = await supabase
      .from("polls")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!pollsData?.length) return;

    // Find member in directory
    const { data: memberData } = await supabase
      .from("club_members_directory")
      .select("id")
      .eq("email", user!.email!)
      .maybeSingle();

    if (!memberData?.id) {
      // Not in directory — show all active polls as unvoted
      setUnvotedPolls(pollsData as Poll[]);
      return;
    }

    // Votes already cast
    const { data: votesData } = await supabase
      .from("votes")
      .select("poll_id")
      .eq("member_id", memberData.id);

    const votedIds = new Set(votesData?.map(v => v.poll_id) ?? []);
    setUnvotedPolls((pollsData as Poll[]).filter(p => !votedIds.has(p.id)));
  }

  if (!unvotedPolls.length) return null;

  return (
    <section className="container mx-auto px-4 pt-6">
      <div className="space-y-3">
        {unvotedPolls.map(poll => (
          <div
            key={poll.id}
            className="flex items-center justify-between gap-4 rounded-xl border-2 border-orange-300 bg-orange-50 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-orange-900">{poll.title}</p>
                <p className="text-xs text-orange-600 mt-0.5">Sondage en cours — votre vote est attendu</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
              onClick={() => navigate(`/sondages/${poll.id}`)}
            >
              Voter →
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
