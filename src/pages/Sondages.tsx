import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { Poll } from "@/types/sondages";

export default function Sondages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate("/auth"); return; }
      load();
    }
  }, [authLoading, user]);

  async function load() {
    const [{ data: pollsData }, { data: memberData }] = await Promise.all([
      supabase.from("polls").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      user ? supabase.from("club_members_directory").select("id").eq("email", user.email!).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setPolls((pollsData as Poll[]) ?? []);

    if (memberData?.id) {
      const { data: myVotes } = await supabase.from("votes").select("poll_id").eq("member_id", memberData.id);
      setVotedIds(new Set(myVotes?.map(v => v.poll_id) ?? []));
    }
    setLoading(false);
  }

  if (authLoading || loading) return (
    <Layout><div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>
  );

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-3xl font-bold mb-8">Sondages du club</h1>
          {polls.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Aucun sondage actif pour le moment.</div>
          ) : (
            <div className="space-y-4">
              {polls.map(poll => {
                const voted = votedIds.has(poll.id);
                return (
                  <div key={poll.id} className="bg-white rounded-xl border p-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{poll.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(poll.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {voted
                        ? <Badge variant="secondary" className="bg-green-50 text-green-700">✓ Voté</Badge>
                        : <Button size="sm" onClick={() => navigate(`/sondages/${poll.id}`)}>Voter →</Button>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
