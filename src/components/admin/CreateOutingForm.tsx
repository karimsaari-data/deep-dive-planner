import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus } from "lucide-react";
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
import { useCreateOuting, OutingType } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const outingSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères").max(100),
  description: z.string().max(500).optional(),
  date: z.date({ required_error: "La date est requise" }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format invalide (HH:MM)"),
  location: z.string().min(3, "Le lieu doit faire au moins 3 caractères").max(200),
  outing_type: z.enum(["Fosse", "Mer", "Piscine", "Étang"]),
  max_participants: z.number().min(1).max(100),
});

type OutingFormData = z.infer<typeof outingSchema>;

const CreateOutingForm = () => {
  const { user } = useAuth();
  const createOuting = useCreateOuting();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<OutingFormData>({
    resolver: zodResolver(outingSchema),
    defaultValues: {
      title: "",
      description: "",
      time: "10:00",
      location: "",
      outing_type: "Mer",
      max_participants: 10,
    },
  });

  const onSubmit = (data: OutingFormData) => {
    const dateTime = new Date(data.date);
    const [hours, minutes] = data.time.split(":").map(Number);
    dateTime.setHours(hours, minutes);

    createOuting.mutate(
      {
        title: data.title,
        description: data.description || undefined,
        date_time: dateTime.toISOString(),
        location: data.location,
        outing_type: data.outing_type as OutingType,
        max_participants: data.max_participants,
        organizer_id: user?.id,
      },
      {
        onSuccess: () => {
          form.reset();
        },
      }
    );
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                              : "Sélectionner une date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu</FormLabel>
                  <FormControl>
                    <Input placeholder="Marseille, Calanque de Sormiou" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <SelectItem value="Fosse">Fosse</SelectItem>
                        <SelectItem value="Piscine">Piscine</SelectItem>
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
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
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
    </Card>
  );
};

export default CreateOutingForm;
