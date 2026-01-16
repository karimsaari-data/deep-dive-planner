import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Search, History, Users, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLocations } from "@/hooks/useLocations";
import { useAuth } from "@/contexts/AuthContext";
import { useMembersForEncadrant, MemberForSelection } from "@/hooks/useMembersForEncadrant";
import { useCreateHistoricalOuting } from "@/hooks/useCreateHistoricalOuting";
import { cn } from "@/lib/utils";

const historicalOutingSchema = z.object({
  date: z.date({ required_error: "La date est requise" }),
  location_id: z.string().optional(),
  location: z.string().min(3, "Le lieu doit faire au moins 3 caractères"),
  outing_type: z.enum(["Fosse", "Mer", "Piscine", "Étang", "Dépollution"]),
  organizer_id: z.string().min(1, "L'organisateur est requis"),
});

type HistoricalOutingFormData = z.infer<typeof historicalOutingSchema>;

interface HistoricalOutingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HistoricalOutingForm = ({ open, onOpenChange }: HistoricalOutingFormProps) => {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const { data: members, isLoading: membersLoading } = useMembersForEncadrant();
  const createHistoricalOuting = useCreateHistoricalOuting();
  
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Fetch encadrants from club_members_directory (only those with is_encadrant = true)
  const { data: encadrants } = useQuery({
    queryKey: ["encadrants-for-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, email")
        .eq("is_encadrant", true)
        .order("last_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get current user's member ID for default DP
  const currentUserMemberId = useMemo(() => {
    if (!user?.email || !members) return undefined;
    const match = members.find((m) => m.email.toLowerCase() === user.email?.toLowerCase());
    return match?.id;
  }, [user?.email, members]);

  const form = useForm<HistoricalOutingFormData>({
    resolver: zodResolver(historicalOutingSchema),
    defaultValues: {
      location: "",
      location_id: "",
      outing_type: "Mer",
      organizer_id: "",
    },
  });

  // Set default organizer when data loads
  useMemo(() => {
    if (currentUserMemberId && !form.getValues("organizer_id")) {
      form.setValue("organizer_id", currentUserMemberId);
    }
  }, [currentUserMemberId, form]);

  const selectedLocationId = form.watch("location_id");

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;
    
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.first_name.toLowerCase().includes(query) ||
        m.last_name.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const handleLocationChange = (locationId: string) => {
    form.setValue("location_id", locationId);
    const selectedLocation = locations?.find((l) => l.id === locationId);
    if (selectedLocation) {
      form.setValue("location", selectedLocation.name);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      filteredMembers.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMemberIds(new Set());
  };

  const onSubmit = async (data: HistoricalOutingFormData) => {
    if (selectedMemberIds.size === 0) {
      return;
    }

    // Find the organizer's profile ID from profiles table
    const organizerMember = members?.find((m) => m.id === data.organizer_id);
    
    // We need to get the profile ID from the organizer's email
    // The organizer_id from form is the club_members_directory ID
    // We need to pass it to the mutation which will handle the mapping
    
    const startDateTime = new Date(data.date);
    startDateTime.setHours(10, 0, 0, 0); // Default time for historical outings

    // Generate a title based on type and location
    const title = `${data.outing_type} - ${data.location}`;

    await createHistoricalOuting.mutateAsync({
      title,
      date_time: startDateTime.toISOString(),
      location: data.location,
      location_id: data.location_id || undefined,
      outing_type: data.outing_type,
      organizer_id: user?.id || "", // Use current user's profile ID as organizer
      participant_member_ids: Array.from(selectedMemberIds),
    });

    // Reset and close
    form.reset();
    setSelectedMemberIds(new Set());
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[95dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Saisie d'une sortie passée
          </DialogTitle>
          <DialogDescription>
            Enregistrez une sortie déjà effectuée pour l'archivage. Aucun email ne sera envoyé.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-4 overflow-y-auto pb-4">
            {/* Header fields */}
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
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "PPP", { locale: fr })
                              : "Date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsDateOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(23, 59, 59, 999);
                            return date > today; // Only allow past dates
                          }}
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
                    <Select onValueChange={handleLocationChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mer">Mer</SelectItem>
                        <SelectItem value="Piscine">Piscine</SelectItem>
                        <SelectItem value="Dépollution">Dépollution</SelectItem>
                        <SelectItem value="Fosse">Fosse</SelectItem>
                        <SelectItem value="Étang">Étang</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location text field if no location selected */}
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

            {/* Organizer Selection */}
            <FormField
              control={form.control}
              name="organizer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisateur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner l'organisateur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {encadrants.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Members selection section */}
            <div className="flex flex-col border rounded-lg overflow-hidden min-h-[200px] max-h-[40vh]">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiltered}
                  >
                    Tout
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
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
                        <span className="flex-1">
                          {member.last_name} {member.first_name}
                        </span>
                        {selectedMemberIds.has(member.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Sticky counter */}
              <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    <strong className="text-foreground">{selectedMemberIds.size}</strong> participant
                    {selectedMemberIds.size > 1 ? "s" : ""} sélectionné
                    {selectedMemberIds.size > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="ocean"
              className="w-full"
              disabled={createHistoricalOuting.isPending || selectedMemberIds.size === 0}
            >
              {createHistoricalOuting.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer et Clôturer"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricalOutingForm;
