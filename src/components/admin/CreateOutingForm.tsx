import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Share2, Check, Copy, ShieldAlert, Car, Minus, Ship, Footprints } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCreateOuting, OutingType } from "@/hooks/useOutings";
import { useLocations } from "@/hooks/useLocations";
import { useBoats } from "@/hooks/useBoats";
import { useAuth } from "@/contexts/AuthContext";
import { useApneaLevels } from "@/hooks/useApneaLevels";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const outingSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères").max(100),
  description: z.string().max(500).optional(),
  date: z.date({ required_error: "La date est requise" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)").optional(),
  waterEntryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)").optional(),
  waterExitTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)").optional(),
  location_id: z.string().optional(),
  location: z.string().min(3, "Le lieu doit faire au moins 3 caractères").max(200),
  outing_type: z.enum(["Fosse", "Mer", "Piscine", "Étang", "Dépollution"]),
  max_participants: z.number().min(1).max(100),
  is_staff_only: z.boolean().default(false),
  carpool_option: z.enum(["none", "driver", "passenger"]).default("none"),
  carpool_seats: z.number().min(1).max(8).optional(),
  dive_mode: z.enum(["boat", "shore"]).optional(),
  boat_id: z.string().optional(),
});

type OutingFormData = z.infer<typeof outingSchema>;

// Types de sorties en milieu naturel (où le choix bateau/bord est pertinent)
const NATURAL_ENVIRONMENT_TYPES: OutingType[] = ["Mer", "Étang", "Dépollution"];

interface CreateOutingFormProps {
  prefilledLocationId?: string;
  prefilledLocationName?: string;
  onClose?: () => void;
}

const CreateOutingForm = ({ prefilledLocationId, prefilledLocationName, onClose }: CreateOutingFormProps) => {
  const { user } = useAuth();
  const createOuting = useCreateOuting();
  const { data: locations } = useLocations();
  const { data: boats } = useBoats();
  const { data: apneaLevels } = useApneaLevels();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [createdOutingId, setCreatedOutingId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [userApneaLevel, setUserApneaLevel] = useState<string | null>(null);
  const [maxParticipantsLimit, setMaxParticipantsLimit] = useState<number>(100);

  const form = useForm<OutingFormData>({
    resolver: zodResolver(outingSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "10:00",
      endTime: "12:00",
      waterEntryTime: "",
      waterExitTime: "",
      location: prefilledLocationName || "",
      location_id: prefilledLocationId || "",
      outing_type: "Mer",
      max_participants: 10,
      is_staff_only: false,
      carpool_option: "none",
      carpool_seats: 1,
      dive_mode: undefined,
      boat_id: undefined,
    },
  });

  const carpoolOption = form.watch("carpool_option");
  const carpoolSeats = form.watch("carpool_seats") || 1;
  const outingType = form.watch("outing_type");
  const diveMode = form.watch("dive_mode");

  // Check if current outing type requires boat/shore selection
  const isNaturalEnvironment = NATURAL_ENVIRONMENT_TYPES.includes(outingType as OutingType);

  // Reset dive_mode and boat_id when switching to non-natural environment
  useEffect(() => {
    if (!isNaturalEnvironment) {
      form.setValue("dive_mode", undefined);
      form.setValue("boat_id", undefined);
    }
  }, [isNaturalEnvironment, form]);

  // Fetch user's apnea level and determine max participants limit
  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!user?.id || !apneaLevels) return;

      // Get current season year
      const currentSeasonYear = new Date().getMonth() >= 8
        ? new Date().getFullYear() + 1
        : new Date().getFullYear();

      // Get user's email from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile?.email) return;

      // Get directory entry
      const { data: directoryEntry } = await supabase
        .from("club_members_directory")
        .select("id")
        .eq("email", profile.email.toLowerCase())
        .single();

      if (!directoryEntry?.id) return;

      // Get apnea level from membership_yearly_status
      const { data: membershipStatus } = await supabase
        .from("membership_yearly_status")
        .select("apnea_level")
        .eq("member_id", directoryEntry.id)
        .eq("season_year", currentSeasonYear)
        .single();

      if (membershipStatus?.apnea_level) {
        setUserApneaLevel(membershipStatus.apnea_level);

        // Find the level in apnea_levels to get max_participants_encadrement
        const levelInfo = apneaLevels.find(l => l.code === membershipStatus.apnea_level);
        const limit = levelInfo?.max_participants_encadrement || 100;
        setMaxParticipantsLimit(limit);

        // Update max_participants if current value exceeds limit
        const currentMax = form.getValues("max_participants");
        if (currentMax > limit) {
          form.setValue("max_participants", limit);
        }
      }
    };

    fetchUserLevel();
  }, [user, form, apneaLevels]);

  // Pre-fill location when props change
  useEffect(() => {
    if (prefilledLocationId && prefilledLocationName) {
      form.setValue("location_id", prefilledLocationId);
      form.setValue("location", prefilledLocationName);
    }
  }, [prefilledLocationId, prefilledLocationName, form]);

  const selectedLocationId = form.watch("location_id");

  // When a location is selected, update the location name
  const handleLocationChange = (locationId: string) => {
    form.setValue("location_id", locationId);
    const selectedLocation = locations?.find((l) => l.id === locationId);
    if (selectedLocation) {
      form.setValue("location", selectedLocation.name);
    }
  };

  const onSubmit = (data: OutingFormData) => {
    const startDateTime = new Date(data.date);
    const [startHours, startMinutes] = data.startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes);

    let endDateTime: Date | undefined;
    if (data.endTime) {
      endDateTime = new Date(data.date);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      endDateTime.setHours(endHours, endMinutes);
    }

    createOuting.mutate(
      {
        title: data.title,
        description: data.description || undefined,
        date_time: startDateTime.toISOString(),
        end_date: endDateTime?.toISOString(),
        water_entry_time: data.waterEntryTime || undefined,
        water_exit_time: data.waterExitTime || undefined,
        location: data.location,
        location_id: data.location_id || undefined,
        outing_type: data.outing_type as OutingType,
        max_participants: data.max_participants,
        organizer_id: user?.id,
        is_staff_only: data.is_staff_only,
        carpool_option: data.carpool_option,
        carpool_seats: data.carpool_seats,
        dive_mode: isNaturalEnvironment ? data.dive_mode : undefined,
        boat_id: isNaturalEnvironment && data.dive_mode === "boat" ? data.boat_id : undefined,
      },
      {
        onSuccess: (newOuting) => {
          form.reset();
          if (newOuting?.id) {
            setCreatedOutingId(newOuting.id);
            setShowShareDialog(true);
          }
          onClose?.();
        },
      }
    );
  };

  const getShareLink = () => {
    return `${window.location.origin}/outing/${createdOutingId}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleCloseShareDialog = () => {
    setShowShareDialog(false);
    setCreatedOutingId(null);
    setLinkCopied(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Créer une nouvelle sortie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sortie en mer - Calanques" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Détails de la sortie..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            today.setHours(0, 0, 0, 0);
                            return date < today;
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
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="waterEntryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure mise à l'eau</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} placeholder="10:30" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Pour le POSS (optionnel)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="waterExitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure sortie eau</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} placeholder="11:30" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Pour le POSS (optionnel)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu enregistré</FormLabel>
                    <Select onValueChange={handleLocationChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un lieu" />
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ou saisir un lieu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Marseille, Calanque de Sormiou"
                        {...field}
                        disabled={!!selectedLocationId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="outing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de sortie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
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

              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Places maximum</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => field.onChange(Math.max(1, field.value - 1))}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={maxParticipantsLimit}
                          className="w-20 text-center"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            field.onChange(Math.min(maxParticipantsLimit, Math.max(1, value)));
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => field.onChange(Math.min(maxParticipantsLimit, field.value + 1))}
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    {userApneaLevel && maxParticipantsLimit < 100 && (
                      <FormDescription className="text-xs text-muted-foreground">
                        Limité à {maxParticipantsLimit} participants pour votre niveau ({userApneaLevel})
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Carpool option */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <span className="font-medium">Covoiturage</span>
              </div>
              
              <FormField
                control={form.control}
                name="carpool_option"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === "driver") {
                            form.setValue("carpool_seats", 1);
                          }
                        }} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Pas de covoiturage</SelectItem>
                          <SelectItem value="driver">Je peux véhiculer des personnes</SelectItem>
                          <SelectItem value="passenger">Je cherche une place</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {carpoolOption === "driver" && (
                <div className="space-y-2">
                  <FormLabel>Nombre de places disponibles</FormLabel>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => form.setValue("carpool_seats", Math.max(1, carpoolSeats - 1))}
                      disabled={carpoolSeats <= 1}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="text-3xl font-bold w-12 text-center">{carpoolSeats}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => form.setValue("carpool_seats", Math.min(8, carpoolSeats + 1))}
                      disabled={carpoolSeats >= 8}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Dive Mode - Only for natural environment outings */}
            {isNaturalEnvironment && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Ship className="h-5 w-5 text-primary" />
                  <span className="font-medium">Mode de départ</span>
                </div>
                
                <FormField
                  control={form.control}
                  name="dive_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value || ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value !== "boat") {
                              form.setValue("boat_id", undefined);
                            }
                          }}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="boat" id="dive-boat" />
                            <Label htmlFor="dive-boat" className="flex items-center gap-2 cursor-pointer">
                              <Ship className="h-4 w-4" />
                              Départ Bateau
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="shore" id="dive-shore" />
                            <Label htmlFor="dive-shore" className="flex items-center gap-2 cursor-pointer">
                              <Footprints className="h-4 w-4" />
                              Départ du Bord
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {diveMode === "boat" && (
                  <FormField
                    control={form.control}
                    name="boat_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Choisir le bateau</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un bateau" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {boats?.map((boat) => (
                              <SelectItem key={boat.id} value={boat.id}>
                                {boat.name} ({boat.capacity} places)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {diveMode === "shore" && (
                  <p className="text-sm text-muted-foreground">
                    Les points de sécurité du site seront utilisés.
                  </p>
                )}
              </div>
            )}

            {/* Staff-only toggle */}
            <FormField
              control={form.control}
              name="is_staff_only"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-base">
                      <ShieldAlert className="h-4 w-4 text-warning" />
                      Sortie réservée encadrants
                    </FormLabel>
                    <FormDescription>
                      Cette sortie sera invisible pour les membres élèves
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="ocean"
              className="w-full"
              disabled={createOuting.isPending}
            >
              {createOuting.isPending ? "Création..." : "Créer la sortie"}
            </Button>
          </form>
        </Form>
      </CardContent>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={handleCloseShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Sortie créée !
            </DialogTitle>
            <DialogDescription>
              Partagez le lien de cette sortie sur WhatsApp ou par email.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <Input
              readOnly
              value={getShareLink()}
              className="flex-1"
            />
            <Button variant="ocean" size="icon" onClick={handleCopyLink}>
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Nouvelle sortie ! ${getShareLink()}`)}`, "_blank")}
            >
              Partager sur WhatsApp
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleCloseShareDialog}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CreateOutingForm;
