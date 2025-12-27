import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Trash2, ExternalLink, Pencil, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocations, useCreateLocation, useDeleteLocation, useUpdateLocation, Location } from "@/hooks/useLocations";
import { Loader2 } from "lucide-react";

const locationSchema = z.object({
  name: z.string().min(2, "Le nom doit faire au moins 2 caractères").max(100),
  address: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  maps_url: z.string().url("URL invalide").optional().or(z.literal("")),
  photo_url: z.string().url("URL invalide").optional().or(z.literal("")),
  max_depth: z.coerce.number().min(0).max(200).optional().or(z.literal("")),
  comments: z.string().max(500).optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

const LocationManager = () => {
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();
  const updateLocation = useUpdateLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      type: "",
      maps_url: "",
      photo_url: "",
      max_depth: "",
      comments: "",
    },
  });

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      address: location.address || "",
      type: location.type || "",
      maps_url: location.maps_url || "",
      photo_url: location.photo_url || "",
      max_depth: location.max_depth ?? "",
      comments: location.comments || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLocation(null);
    form.reset({
      name: "",
      address: "",
      type: "",
      maps_url: "",
      photo_url: "",
      max_depth: "",
      comments: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: LocationFormData) => {
    const locationData = {
      name: data.name,
      address: data.address || undefined,
      type: data.type || undefined,
      maps_url: data.maps_url || undefined,
      photo_url: data.photo_url || undefined,
      max_depth: data.max_depth ? Number(data.max_depth) : undefined,
      comments: data.comments || undefined,
    };

    if (editingLocation) {
      updateLocation.mutate(
        { id: editingLocation.id, ...locationData },
        {
          onSuccess: () => {
            form.reset();
            setIsDialogOpen(false);
            setEditingLocation(null);
          },
        }
      );
    } else {
      createLocation.mutate(locationData, {
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
          <MapPin className="h-5 w-5 text-primary" />
          Gestion des lieux
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingLocation(null);
        }}>
          <DialogTrigger asChild>
            <Button variant="ocean" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Modifier le lieu" : "Nouveau lieu"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du lieu *</FormLabel>
                      <FormControl>
                        <Input placeholder="Calanque de Sormiou" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="Route de Sormiou, 13009 Marseille" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Mer, Piscine, Fosse..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maps_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien Google Maps</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://maps.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de la photo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_depth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profondeur max (mètres)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          placeholder="20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commentaires</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Infos complémentaires, accès, particularités..."
                          {...field}
                          className="resize-none"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="ocean"
                  className="w-full"
                  disabled={createLocation.isPending || updateLocation.isPending}
                >
                  {createLocation.isPending || updateLocation.isPending
                    ? "Enregistrement..."
                    : editingLocation
                    ? "Mettre à jour"
                    : "Créer le lieu"}
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
        ) : locations?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun lieu enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {locations?.map((location) => (
              <div
                key={location.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                {location.photo_url && (
                  <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={location.photo_url}
                      alt={location.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{location.name}</p>
                  {location.address && (
                    <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {location.type && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {location.type}
                      </span>
                    )}
                    {location.max_depth && (
                      <span className="text-xs bg-ocean/10 text-ocean-dark px-2 py-0.5 rounded">
                        {location.max_depth}m max
                      </span>
                    )}
                  </div>
                  {location.comments && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {location.comments}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {location.maps_url && (
                    <a
                      href={location.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 p-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditDialog(location)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteLocation.mutate(location.id)}
                    disabled={deleteLocation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationManager;
