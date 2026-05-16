import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import { useClubMembersDirectory } from "@/hooks/useClubMembersDirectory";
import { useMembershipYearlyStatus, getCurrentSeasonYear, getSeasonLabel, getAvailableSeasons } from "@/hooks/useMembershipYearlyStatus";
import type { Poll, Vote, DirectoryMember, PollOption } from "@/types/sondages";

interface UndoToast { voteId: string; memberName: string; timerId: ReturnType<typeof setTimeout> }

type View = "list" | "create" | "results";

export default function SondagesAdmin() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("list");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<(Vote & { member?: DirectoryMember })[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeasonYear());
  const availableSeasons = getAvailableSeasons();
  const [loading, setLoading] = useState(true);

  const { members: allMembersRaw = [] } = useClubMembersDirectory();
  const allMembers = allMembersRaw as unknown as DirectoryMember[];

  const { statuses: seasonStatuses = [] } = useMembershipYearlyStatus(selectedSeason);

  const activeMembers = useMemo(() => {
    if (!seasonStatuses.length) return allMembers;
    const activeIds = new Set(seasonStatuses.map(s => s.member_id));
    return allMembers.filter(m => activeIds.has(m.id));
  }, [allMembers, seasonStatuses]);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newOptions, setNewOptions] = useState([{ id: uuidv4(), label: "" }, { id: uuidv4(), label: "" }]);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [creating, setCreating] = useState(false);

  // Results / manual entry
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<UndoToast | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Poll | null>(null);

  useEffect(() => {
    loadPolls();
    return () => { if (toast) clearTimeout(toast.timerId); };
  }, []);

  async function loadPolls() {
    setLoading(true);
    const { data } = await supabase.from("polls").select("*").order("created_at", { ascending: false });
    setPolls((data as Poll[]) ?? []);
    setLoading(false);
  }

  async function loadVotes(pollId: string) {
    const { data } = await supabase.from("votes").select("*").eq("poll_id", pollId);
    if (!data) return;
    const memberMap = new Map(allMembers.map(m => [m.id, m]));
    setVotes(data.map(v => ({ ...(v as Vote), member: memberMap.get(v.member_id) })));
  }

  function openResults(poll: Poll) {
    setSelectedPoll(poll);
    loadVotes(poll.id);
    setView("results");
    setShowManual(false);
    setSearch("");
  }

  async function toggleActive(poll: Poll) {
    await supabase.from("polls").update({ is_active: !poll.is_active }).eq("id", poll.id);
    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, is_active: !p.is_active } : p));
    if (selectedPoll?.id === poll.id) setSelectedPoll(p => p ? { ...p, is_active: !p.is_active } : p);
  }

  async function createPoll() {
    const validOptions = newOptions.filter(o => o.label.trim());
    if (!newTitle.trim() || validOptions.length < 2) return;
    setCreating(true);
    const { data } = await supabase.from("polls").insert({
      title: newTitle,
      options: validOptions,
      allow_multiple: allowMultiple,
      is_active: true,
      created_by: user?.id,
    }).select().single();
    if (data) {
      setPolls(prev => [data as Poll, ...prev]);
      setNewTitle(""); setNewOptions([{ id: uuidv4(), label: "" }, { id: uuidv4(), label: "" }]); setAllowMultiple(true);
      openResults(data as Poll);
    }
    setCreating(false);
  }

  // Manual vote entry — only active members for selected season
  const votedMemberIds = new Set(votes.map(v => v.member_id));
  const notVotedMembers = activeMembers.filter(m => !votedMemberIds.has(m.id));
  const filteredMembers = search.trim()
    ? notVotedMembers.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : notVotedMembers;

  async function saveVote(memberId: string, selectedOptions: string[], memberName: string) {
    if (!selectedPoll || !selectedOptions.length) return;
    setSaving(s => ({ ...s, [memberId]: true }));
    const { data, error } = await supabase.from("votes").insert({
      poll_id: selectedPoll.id,
      member_id: memberId,
      user_id: null,
      selected_options: selectedOptions,
    }).select().single();
    setSaving(s => ({ ...s, [memberId]: false }));
    if (error || !data) return;
    const member = allMembers.find(m => m.id === memberId);
    setVotes(prev => [{ ...(data as Vote), member }, ...prev]);
    setPending(p => { const n = { ...p }; delete n[memberId]; return n; });
    if (toast) clearTimeout(toast.timerId);
    const timerId = setTimeout(() => setToast(null), 4000);
    setToast({ voteId: data.id, memberName, timerId });
  }

  async function deletePoll(poll: Poll) {
    await supabase.from("votes").delete().eq("poll_id", poll.id);
    await supabase.from("polls").delete().eq("id", poll.id);
    setPolls(prev => prev.filter(p => p.id !== poll.id));
    setDeleteConfirm(null);
    if (selectedPoll?.id === poll.id) setView("list");
  }

  async function undoVote() {
    if (!toast) return;
    clearTimeout(toast.timerId);
    await supabase.from("votes").delete().eq("id", toast.voteId);
    setVotes(prev => prev.filter(v => v.id !== toast.voteId));
    setToast(null);
  }

  function togglePending(memberId: string, optId: string, allowMultiple: boolean) {
    setPending(p => {
      const cur = p[memberId] ?? [];
      return { ...p, [memberId]: allowMultiple ? (cur.includes(optId) ? cur.filter(o => o !== optId) : [...cur, optId]) : [optId] };
    });
  }

  // Stats
  const optionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const voters: Record<string, string[]> = {};
    if (!selectedPoll) return { counts, voters };
    for (const opt of selectedPoll.options) { counts[opt.id] = 0; voters[opt.id] = []; }
    for (const v of votes) {
      for (const oid of v.selected_options) {
        counts[oid] = (counts[oid] ?? 0) + 1;
        voters[oid] = [...(voters[oid] ?? []), v.member ? `${v.member.first_name} ${v.member.last_name}` : "?"];
      }
    }
    return { counts, voters };
  }, [votes, selectedPoll]);

  const sortedOptions = selectedPoll
    ? [...selectedPoll.options].sort((a, b) => (optionCounts.counts[b.id] ?? 0) - (optionCounts.counts[a.id] ?? 0))
    : [];
  const maxCount = Math.max(...(selectedPoll?.options.map(o => optionCounts.counts[o.id] ?? 0) ?? []), 1);
  const totalActiveMembers = activeMembers.length;
  const participationPct = totalActiveMembers > 0 ? Math.round((votes.length / totalActiveMembers) * 100) : 0;

  // H/F breakdown
  const genderStats = useMemo(() => {
    const voterIds = new Set(votes.map(v => v.member_id));
    const voted = activeMembers.filter(m => voterIds.has(m.id));
    const h = { voted: voted.filter(m => m.gender === "Homme").length, total: activeMembers.filter(m => m.gender === "Homme").length };
    const f = { voted: voted.filter(m => m.gender === "Femme").length, total: activeMembers.filter(m => m.gender === "Femme").length };
    return { h, f };
  }, [votes, activeMembers]);

  // ── VIEWS ──

  if (view === "create") return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setView("list")}>← Retour</Button>
        <h2 className="text-xl font-bold">Nouveau sondage</h2>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Titre</label>
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Commande tshirt TO2" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Options</label>
        <div className="space-y-2">
          {newOptions.map((opt, i) => (
            <div key={opt.id} className="flex gap-2">
              <Input value={opt.label} onChange={e => setNewOptions(o => o.map(x => x.id === opt.id ? { ...x, label: e.target.value } : x))} placeholder={`Option ${i + 1}`} />
              {newOptions.length > 2 && (
                <Button variant="ghost" size="sm" onClick={() => setNewOptions(o => o.filter(x => x.id !== opt.id))}>✕</Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2 text-blue-600" onClick={() => setNewOptions(o => [...o, { id: uuidv4(), label: "" }])}>
          + Ajouter une option
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="rounded" />
        Permettre plusieurs choix
      </label>
      <div className="flex gap-3">
        <Button onClick={createPoll} disabled={creating || !newTitle.trim() || newOptions.filter(o => o.label.trim()).length < 2}>
          {creating ? "Création..." : "Créer le sondage"}
        </Button>
        <Button variant="outline" onClick={() => setView("list")}>Annuler</Button>
      </div>
    </div>
  );

  if (view === "results" && selectedPoll) return (
    <div className="max-w-3xl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl flex items-center gap-4 shadow-lg text-sm">
          <span>Vote de <strong>{toast.memberName}</strong> enregistré</span>
          <button onClick={undoVote} className="underline text-blue-300 hover:text-blue-200">Annuler</button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView("list")}>← Sondages</Button>
        <h2 className="text-xl font-bold flex-1">{selectedPoll.title}</h2>
        <Button variant={selectedPoll.is_active ? "destructive" : "outline"} size="sm" onClick={() => toggleActive(selectedPoll)}>
          {selectedPoll.is_active ? "Fermer" : "Rouvrir"}
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2" onClick={() => setDeleteConfirm(selectedPoll)}>🗑</Button>
      </div>

      {/* Share link */}
      <div className="bg-blue-50 rounded-xl p-3 mb-5 flex items-center gap-3">
        <code className="flex-1 text-xs text-blue-800 truncate">{window.location.origin}/sondages/{selectedPoll.id}</code>
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/sondages/${selectedPoll.id}`)}>
          Copier
        </Button>
      </div>

      {/* Season selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Saison :</span>
        <Select value={selectedSeason.toString()} onValueChange={v => setSelectedSeason(parseInt(v))}>
          <SelectTrigger className="w-[130px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSeasons.map(y => (
              <SelectItem key={y} value={y.toString()}>{getSeasonLabel(y)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{totalActiveMembers} membres actifs</span>
      </div>

      {/* Participation */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <div className="flex items-end justify-between mb-2">
          <h3 className="font-semibold">Participation</h3>
          <span className="text-3xl font-bold text-blue-600">{participationPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
          <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${participationPct}%` }} />
        </div>
        <p className="text-xs text-gray-500">{votes.length} / {totalActiveMembers} membres ({getSeasonLabel(selectedSeason)})</p>
        {(genderStats.h.total > 0 || genderStats.f.total > 0) && (
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>H : {genderStats.h.voted} / {genderStats.h.total}{genderStats.h.total > 0 ? ` (${Math.round(genderStats.h.voted / genderStats.h.total * 100)}%)` : ""}</span>
            <span>F : {genderStats.f.voted} / {genderStats.f.total}{genderStats.f.total > 0 ? ` (${Math.round(genderStats.f.voted / genderStats.f.total * 100)}%)` : ""}</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <h3 className="font-semibold mb-4">Résultats <span className="text-xs font-normal text-gray-400">sur {votes.length} votant{votes.length > 1 ? "s" : ""}</span></h3>
        <div className="space-y-4">
          {sortedOptions.map((opt, i) => {
            const count = optionCounts.counts[opt.id] ?? 0;
            const pctVoters = votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
            const pctTotal = totalActiveMembers > 0 ? Math.round((count / totalActiveMembers) * 100) : 0;
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={opt.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {i === 0 && count > 0 && <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">N°1</Badge>}
                    <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{count}</span>
                    <span className="text-blue-600 font-medium">{pctVoters}%</span>
                    <span className="text-gray-400 text-xs">({pctTotal}% total)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${i === 0 && count > 0 ? "bg-blue-500" : "bg-gray-300"}`} style={{ width: `${barWidth}%` }} />
                </div>
                {(optionCounts.voters[opt.id] ?? []).length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{optionCounts.voters[opt.id].join(", ")}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voted / not voted */}
      {votes.length > 0 && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h3 className="font-semibold text-sm mb-2">Ont voté ({votes.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {votes.map(v => (
              <span key={v.id} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                {v.member ? `${v.member.first_name} ${v.member.last_name}` : "?"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Manual entry table */}
      {notVotedMembers.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Saisie manuelle — {notVotedMembers.length} restant{notVotedMembers.length > 1 ? "s" : ""}</h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowManual(s => !s); setSearch(""); }}>
              {showManual ? "Masquer" : "Afficher"}
            </Button>
          </div>
          {showManual && (
            <>
              <div className="px-4 py-2.5 border-b">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre..." className="pl-9" />
                  {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">×</button>}
                </div>
                {search && <p className="text-xs text-gray-400 mt-1">{filteredMembers.length} résultat{filteredMembers.length > 1 ? "s" : ""} sur {notVotedMembers.length}</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 min-w-[180px]">Nom</th>
                      {selectedPoll.options.map(opt => (
                        <th key={opt.id} className="px-3 py-2.5 font-medium text-gray-600 text-center min-w-[100px] leading-tight text-xs">{opt.label}</th>
                      ))}
                      {selectedPoll.allow_multiple && <th className="w-12" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={selectedPoll.options.length + 2} className="px-4 py-6 text-center text-sm text-gray-400">Aucun résultat</td></tr>
                    )}
                    {filteredMembers.map(m => {
                      const name = `${m.first_name} ${m.last_name}`;
                      const isSaving = saving[m.id];
                      const rowPending = pending[m.id] ?? [];
                      return (
                        <tr key={m.id} className={`border-t transition-opacity ${isSaving ? "opacity-40" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">{name}</td>
                          {selectedPoll.options.map(opt => (
                            <td key={opt.id} className="px-3 py-2.5 text-center">
                              {selectedPoll.allow_multiple ? (
                                <input type="checkbox" checked={rowPending.includes(opt.id)} disabled={isSaving}
                                  onChange={() => togglePending(m.id, opt.id, true)}
                                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                              ) : (
                                <button disabled={isSaving} onClick={() => saveVote(m.id, [opt.id], name)}
                                  className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-500 transition mx-auto block disabled:opacity-40" />
                              )}
                            </td>
                          ))}
                          {selectedPoll.allow_multiple && (
                            <td className="px-2 py-2.5">
                              <Button size="sm" disabled={!rowPending.length || isSaving}
                                onClick={() => saveVote(m.id, rowPending, name)} className="text-xs h-7 px-2">✓</Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Sondages</h2>
        <Button onClick={() => setView("create")}>+ Nouveau sondage</Button>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">Saison :</span>
        <Select value={selectedSeason.toString()} onValueChange={v => setSelectedSeason(parseInt(v))}>
          <SelectTrigger className="w-[130px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSeasons.map(y => (
              <SelectItem key={y} value={y.toString()}>{getSeasonLabel(y)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{totalActiveMembers} membres actifs</span>
      </div>
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : polls.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucun sondage. Créez-en un !</div>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => (
            <div key={poll.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{poll.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(poll.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={poll.is_active ? "default" : "secondary"}>{poll.is_active ? "Actif" : "Fermé"}</Badge>
                <Button variant="outline" size="sm" onClick={() => openResults(poll)}>Résultats →</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2" onClick={() => setDeleteConfirm(poll)}>🗑</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="font-bold text-lg mb-2">Supprimer le sondage ?</p>
            <p className="text-sm text-gray-500 mb-1">« {deleteConfirm.title} »</p>
            <p className="text-xs text-red-500 mb-6">Tous les votes seront supprimés. Action irréversible.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => deletePoll(deleteConfirm)}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
