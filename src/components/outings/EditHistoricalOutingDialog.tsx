import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Search, Pencil, Loader2, Check, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "@/hooks/useLocations";
import { useMembersForEncadrant } from "@/hooks/useMembersForEncadrant";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  date: z.date({ required_error: "La date est requise" }),
  location_id: z.string().optional(),
  location: z.string().min(1, "Le lieu est requis"),
  outing_type: z.enum(["Fosse", "Mer", "Piscine", "Étang", "Dépollution"]),
  organizer_id: z.string().min(1, "L'organisateur est requis"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  outing: {
    id: string;
    title: string;
    date_time: string;
    location: string;
    location_id?: string | null;
    outing_type: string;
    organizer_member_id?: string | null;
    historicalMembers: { id: string; first_name: string; last_name: string }[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditHistoricalOutingDialog = ({ outing, open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const { data: locations } = useLocations();
  const { data: members, isLoading: membersLoading } = useMembersForEncadrant();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [coInstructorMemberId, setCoInstructorMemberId] = useState("");

  const { data: encadrants } = useQuery({
    queryKey: ["encadrants-for-selection"],
    queryFn: async () => {
      const currentSeasonYear = new Date().getMonth() >= 8
        ? new Date().getFullYear() + 1
        : new Date().getFullYear();
      const { data: statuses } = await supabase
        .from("membership_yearly_status")
        .select("member_id")
        .eq("season_year", currentSeasonYear)
        .eq("is_encadrant", true);
      const ids = statuses?.map((s) => s.member_id) ?? [];
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, email")
        .in("id", ids)
        .order("last_name");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-organizer-mapping"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, email");
      return data ?? [];
    },
  });

  const emailToProfileIdMap = useMemo(() => {
    if (!profiles) return new Map<string, string>();
    return new Map(profiles.map((p) => [p.email.toLowerCase(), p.id]));
  }, [profiles]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      location: "",
      location_id: "",
      outing_type: "Mer",
      organizer_id: "",
    },
  });

  // Initialize form with outing data when dialog opens
  useEffect(() => {
    if (!open) return;
    form.reset({
      date: new Date(outing.date_time),
      location: outing.location,
      location_id: outing.location_id ?? "",
      outing_type: outing.outing_type as FormData["outing_type"],
      organizer_id: outing.organizer_member_id ?? "",
    });
    setSelectedMemberIds(new Set(outing.historicalMembers.map((m) => m.id)));
    setCoInstructorMemberId("");
    setSearchQuery("");
  }, [open, outing]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) => m.first_name.toLowerCase().includes(q) || m.last_name.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const startDateTime = new Date(data.date);
      startDateTime.setHours(10, 0, 0, 0);

      const title = `${data.outing_type} - ${data.location}`;

      // Find organizer profile id
      const selectedEncadrant = encadrants?.find((e) => e.id === data.organizer_id);
      let organizerProfileId: string | null = null;
      if (selectedEncadrant?.email) {
        organizerProfileId = emailToProfileIdMap.get(selectedEncadrant.email.toLowerCase()) ?? null;
      }

      // Find co-instructor profile id
      let coInstructorProfileId: string | null = null;
      if (coInstructorMemberId) {
        const coEnc = encadrants?.find((e) => e.id === coInstructorMemberId);
        if (coEnc?.email) {
          coInstructorProfileId = emailToProfileIdMap.get(coEnc.email.toLowerCase()) ?? null;
        }
      }

      // 1. Update outing
      const { error: outingError } = await supabase
        .from("outings")
        .update({
          title,
          date_time: startDateTime.toISOString(),
          location: data.location,
          location_id: data.location_id || null,
          outing_type: data.outing_type,
          organizer_id: organizerProfileId,
          organizer_member_id: data.organizer_id,
          max_participants: Math.max(selectedMemberIds.size, 10),
        })
        .eq("id", outing.id);
      if (outingError) throw outingError;

      // 2. Replace all historical participants
      await supabase.from("historical_outing_participants").delete().eq("outing_id", outing.id);

      const allIds = new Set(selectedMemberIds);
      allIds.add(data.organizer_id);
      if (coInstructorMemberId) allIds.add(coInstructorMemberId);

      if (allIds.size > 0) {
        const { error: participantsError } = await supabase
          .from("historical_outing_participants")
          .insert(Array.from(allIds).map((memberId) => ({ outing_id: outing.id, member_id: memberId })));
        if (participantsError) throw participantsError;
      }

      // 3. Update co-instructor in outing_co_instructors
      await supabase.from("outing_co_instructors").delete().eq("outing_id", outing.id);
      if (coInstructorProfileId) {
        await supabase
          .from("outing_co_instructors")
          .insert({ outing_id: outing.id, user_id: coInstructorProfileId });
      }
    },
    onSuccess: () => {
      toast.success("Sortie historique modifiée");
      queryClient.invalidateQueries({ queryKey: ["past-outings-archives"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la modification");
    },
  });

  const selectedLocationId = form.watch("location_id");
  const organizerId = form.watch("organizer_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[95dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Modifier la sortie historique
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
            className="flex flex-col flex-1 gap-4 overflow-y-auto pb-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: fr }) : "Date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { field.onChange(date); setIsDateOpen(false); }}
                          disabled={(date) => { const today = new Date(); today.setHours(23,59,59,999); return date > today; }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        const loc = locations?.find((l) => l.id === val);
                        if (loc) form.setValue("location", loc.name);
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Mer","Piscine","Dépollution","Fosse","Étang"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {!selectedLocationId && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ou saisir un lieu</FormLabel>
                    <FormControl>
                      <Input placeholder="Marseille, Calanque de Sormiou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="organizer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisateur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Sélectionner l'organisateur" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {encadrants?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Co-encadrant (optionnel)</FormLabel>
              <Select
                value={coInstructorMemberId}
                onValueChange={(val) => setCoInstructorMemberId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun co-encadrant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {encadrants?.filter((e) => e.id !== organizerId).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col border rounded-lg overflow-hidden min-h-[200px] max-h-[35vh]">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Chercher un nom..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setSelectedMemberIds((p) => { const n = new Set(p); filteredMembers.forEach((m) => n.add(m.id)); return n; })}>
                    Tout
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedMemberIds(new Set())}>
                    Aucun
                  </Button>
                </div>
              </div>

              {membersLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="divide-y">
                    {filteredMembers.map((member) => (
                      <label
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedMemberIds.has(member.id) && "bg-primary/5"
                        )}
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <span className="flex-1">{member.last_name} {member.first_name}</span>
                        {selectedMemberIds.has(member.id) && <Check className="h-4 w-4 text-primary" />}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="p-3 border-t bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  <strong className="text-foreground">{selectedMemberIds.size}</strong> participant
                  {selectedMemberIds.size > 1 ? "s" : ""} sélectionné{selectedMemberIds.size > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="ocean"
              className="w-full"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHistoricalOutingDialog;
