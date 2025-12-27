import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, Share2, Check, Copy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCreateOuting, OutingType } from "@/hooks/useOutings";
import { useLocations } from "@/hooks/useLocations";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const outingSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères").max(100),
  description: z.string().max(500).optional(),
  date: z.date({ required_error: "La date est requise" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)").optional(),
  location_id: z.string().optional(),
  location: z.string().min(3, "Le lieu doit faire au moins 3 caractères").max(200),
  outing_type: z.enum(["Fosse", "Mer", "Piscine", "Étang", "Dépollution"]),
  max_participants: z.number().min(1).max(100),
});

type OutingFormData = z.infer<typeof outingSchema>;

const CreateOutingForm = () => {
  const { user } = useAuth();
  const createOuting = useCreateOuting();
  const { data: locations } = useLocations();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [createdOutingId, setCreatedOutingId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const form = useForm<OutingFormData>({
    resolver: zodResolver(outingSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "10:00",
      endTime: "12:00",
      location: "",
      location_id: "",
      outing_type: "Mer",
      max_participants: 10,
    },
  });

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
        location: data.location,
        location_id: data.location_id || undefined,
        outing_type: data.outing_type as OutingType,
        max_participants: data.max_participants,
        organizer_id: user?.id,
      },
      {
        onSuccess: (newOuting) => {
          form.reset();
          if (newOuting?.id) {
            setCreatedOutingId(newOuting.id);
            setShowShareDialog(true);
          }
        },
      }
    );
  };

  const getShareLink = () => {
    return `${window.location.origin}/sorties/${createdOutingId}`;
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
                          max={100}
                          className="w-20 text-center"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => field.onChange(Math.min(100, field.value + 1))}
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
