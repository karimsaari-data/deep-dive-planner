import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ship, Plus, Trash2, Pencil, Phone, Users, MapPin, Loader2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBoats, useCreateBoat, useUpdateBoat, useDeleteBoat, Boat } from "@/hooks/useBoats";

const boatSchema = z.object({
  name: z.string().min(2, "Le nom doit faire au moins 2 caractères").max(100),
  registration_number: z.string().max(50).optional(),
  capacity: z.coerce.number().min(1, "Capacité min 1").max(50, "Capacité max 50"),
  pilot_name: z.string().max(100).optional(),
  pilot_phone: z.string().max(20).optional(),
  oxygen_location: z.string().max(100).optional(),
  home_port: z.string().max(100).optional(),
});

type BoatFormData = z.infer<typeof boatSchema>;

const FleetManager = () => {
  const { data: boats, isLoading } = useBoats();
  const createBoat = useCreateBoat();
  const updateBoat = useUpdateBoat();
  const deleteBoat = useDeleteBoat();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);

  const form = useForm<BoatFormData>({
    resolver: zodResolver(boatSchema),
    defaultValues: {
      name: "",
      registration_number: "",
      capacity: 6,
      pilot_name: "",
      pilot_phone: "",
      oxygen_location: "",
      home_port: "",
    },
  });

  const openEditDialog = (boat: Boat) => {
    setEditingBoat(boat);
    form.reset({
      name: boat.name,
      registration_number: boat.registration_number || "",
      capacity: boat.capacity,
      pilot_name: boat.pilot_name || "",
      pilot_phone: boat.pilot_phone || "",
      oxygen_location: boat.oxygen_location || "",
      home_port: boat.home_port || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBoat(null);
    form.reset({
      name: "",
      registration_number: "",
      capacity: 6,
      pilot_name: "",
      pilot_phone: "",
      oxygen_location: "",
      home_port: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: BoatFormData) => {
    const boatData = {
      name: data.name,
      registration_number: data.registration_number || null,
      capacity: data.capacity,
      pilot_name: data.pilot_name || null,
      pilot_phone: data.pilot_phone || null,
      oxygen_location: data.oxygen_location || null,
      home_port: data.home_port || null,
    };

    if (editingBoat) {
      updateBoat.mutate(
        { id: editingBoat.id, ...boatData },
        {
          onSuccess: () => {
            form.reset();
            setIsDialogOpen(false);
            setEditingBoat(null);
          },
        }
      );
    } else {
      createBoat.mutate(boatData, {
        onSuccess: () => {
          form.reset();
          setIsDialogOpen(false);
        },
      });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-primary" />
          Gestion de la flotte
        </CardTitle>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingBoat(null);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ocean" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBoat ? "Modifier le bateau" : "Nouveau bateau"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du bateau *</FormLabel>
                      <FormControl>
                        <Input placeholder="L'Hippocampe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Immatriculation</FormLabel>
                        <FormControl>
                          <Input placeholder="MA-123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacité (places) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="pilot_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du pilote</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pilot_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone pilote</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="oxygen_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emplacement O2</FormLabel>
                      <FormControl>
                        <Input placeholder="Cabine avant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="home_port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port d'attache</FormLabel>
                      <FormControl>
                        <Input placeholder="Marseille - Vieux Port" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="ocean"
                  className="w-full"
                  disabled={createBoat.isPending || updateBoat.isPending}
                >
                  {createBoat.isPending || updateBoat.isPending
                    ? "Enregistrement..."
                    : editingBoat
                    ? "Mettre à jour"
                    : "Ajouter le bateau"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : boats?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun bateau enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {boats?.map((boat) => (
              <div
                key={boat.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Ship className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{boat.name}</span>
                    {boat.registration_number && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {boat.registration_number}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {boat.capacity} places
                    </span>
                    {boat.pilot_name && (
                      <span className="flex items-center gap-1">
                        Pilote: {boat.pilot_name}
                      </span>
                    )}
                    {boat.pilot_phone && (
                      <a
                        href={`tel:${boat.pilot_phone}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {boat.pilot_phone}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    {boat.home_port && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {boat.home_port}
                      </span>
                    )}
                    {boat.oxygen_location && (
                      <span className="flex items-center gap-1">
                        <Wind className="h-3 w-3" />
                        O2: {boat.oxygen_location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(boat)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce bateau ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le bateau "{boat.name}" sera définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBoat.mutate(boat.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FleetManager;
