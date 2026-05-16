import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Poll, DirectoryMember } from "@/types/sondages";

type Step = "loading" | "not_found" | "no_member" | "closed" | "already" | "vote" | "done";

export default function SondageVote() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [member, setMember] = useState<DirectoryMember | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) init();
  }, [id, authLoading, user]);

  async function init() {
    // Always get fresh user from Supabase auth (not stale React state)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { navigate("/auth"); return; }

    // Load poll
    const { data: pollData } = await supabase.from("polls").select("*").eq("id", id).single();
    if (!pollData) { setStep("not_found"); return; }
    const p = pollData as Poll;
    setPoll(p);
    if (!p.is_active) { setStep("closed"); return; }

    // Find member in directory by email
    const email = currentUser.email!.toLowerCase();
    const { data: memberData, error: memberError } = await supabase
      .from("club_members_directory")
      .select("id, first_name, last_name, email, phone")
      .eq("email", email)
      .maybeSingle();

    if (!memberData) {
      setStep("no_member"); return;
    }
    setMember(memberData as DirectoryMember);

    // Check already voted
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", id)
      .eq("member_id", memberData.id)
      .maybeSingle();

    if (existing) { setStep("already"); return; }
    setStep("vote");
  }

  function toggleOption(optId: string) {
    if (!poll) return;
    if (poll.allow_multiple) {
      setSelectedOptions(prev => prev.includes(optId) ? prev.filter(o => o !== optId) : [...prev, optId]);
    } else {
      setSelectedOptions([optId]);
    }
  }

  async function handleVote() {
    if (!poll || !member || !selectedOptions.length) return;
    setSubmitting(true);
    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id,
      member_id: member.id,
      user_id: user?.id ?? null,
      selected_options: selectedOptions,
    });
    if (error?.code === "23505") { setStep("already"); return; }
    setStep("done");
    setSubmitting(false);
  }

  if (step === "loading") return (
    <Layout><div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>
  );

  if (step === "not_found") return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-3 text-gray-500">
        <p className="text-4xl">🔍</p>
        <p className="font-medium">Sondage introuvable ou fermé.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Accueil</Button>
      </div>
    </Layout>
  );

  if (step === "no_member") return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-3 text-gray-500">
        <p className="text-4xl">👤</p>
        <p className="font-medium">Compte non reconnu dans l'annuaire.</p>
        <p className="text-xs text-gray-400">Email connecté : {user?.email}</p>
        <Button variant="outline" onClick={() => navigate("/")}>Accueil</Button>
      </div>
    </Layout>
  );

  if (step === "closed") return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-3 text-gray-500">
        <p className="text-4xl">🔒</p>
        <p className="font-medium">Ce sondage est fermé.</p>
      </div>
    </Layout>
  );

  if (step === "already") return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-3 text-gray-500">
        <p className="text-4xl">✅</p>
        <p className="font-medium">Tu as déjà voté pour ce sondage.</p>
        <Button variant="outline" onClick={() => navigate("/sondages")}>Voir les sondages</Button>
      </div>
    </Layout>
  );

  if (step === "done") return (
    <Layout>
      <div className="flex min-h-[50vh] items-center justify-center flex-col gap-3 text-gray-600">
        <p className="text-4xl">🎉</p>
        <p className="text-xl font-bold">Vote enregistré !</p>
        <p className="text-gray-400">Merci {member?.first_name}.</p>
        <Button variant="outline" onClick={() => navigate("/sondages")}>Retour</Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex items-start justify-center pt-8 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold">{poll?.title}</h1>
            <p className="text-sm text-gray-400 mt-1">Bonjour {member?.first_name} {member?.last_name}</p>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {poll?.allow_multiple ? "Sélectionnez une ou plusieurs options" : "Sélectionnez une option"}
          </p>

          <div className="space-y-2 mb-6">
            {poll?.options.map(opt => {
              const checked = selectedOptions.includes(opt.id);
              return (
                <button key={opt.id} type="button" onClick={() => toggleOption(opt.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${checked ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className={`w-5 h-5 rounded-${poll.allow_multiple ? "sm" : "full"} border-2 flex items-center justify-center flex-shrink-0 ${checked ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                    {checked && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <Button className="w-full" disabled={!selectedOptions.length || submitting} onClick={handleVote}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</> : "Valider mon vote"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
