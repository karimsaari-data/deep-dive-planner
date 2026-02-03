import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Trash2, ExternalLink, Pencil, Upload, Link, Loader2, FileImage, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocations, useCreateLocation, useDeleteLocation, useUpdateLocation, Location } from "@/hooks/useLocations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SatelliteWaypointEditor from "./SatelliteWaypointEditor";
import BathymetricMapEditor from "./BathymetricMapEditor";

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
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [photoMode, setPhotoMode] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [satelliteMapUrl, setSatelliteMapUrl] = useState<string | null>(null);
  const [bathymetricMapUrl, setBathymetricMapUrl] = useState<string | null>(null);
  const [isUploadingSatellite, setIsUploadingSatellite] = useState(false);
  const [isUploadingBathymetric, setIsUploadingBathymetric] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const satelliteInputRef = useRef<HTMLInputElement>(null);
  const bathymetricInputRef = useRef<HTMLInputElement>(null);

  // Filter locations based on search query
  const filteredLocations = locations?.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.type?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

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
    setPreviewUrl(location.photo_url || null);
    setSatelliteMapUrl(location.satellite_map_url || null);
    setBathymetricMapUrl(location.bathymetric_map_url || null);
    setPhotoMode(location.photo_url ? "url" : "url");
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
    setPreviewUrl(null);
    setSatelliteMapUrl(null);
    setBathymetricMapUrl(null);
    setPhotoMode("url");
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `location-${Date.now()}.${fileExt}`;
      const filePath = `locations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("outings_gallery")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("outings_gallery")
        .getPublicUrl(filePath);

      form.setValue("photo_url", publicUrl);
      setPreviewUrl(publicUrl);
      toast.success("Photo uploadée avec succès");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMapImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "satellite" | "bathymetric"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }

    const setUploading = type === "satellite" ? setIsUploadingSatellite : setIsUploadingBathymetric;
    const setUrl = type === "satellite" ? setSatelliteMapUrl : setBathymetricMapUrl;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-map-${editingLocation?.id || "new"}-${Date.now()}.${fileExt}`;
      const filePath = `poss-maps/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("outings_gallery")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("outings_gallery")
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      toast.success(`Carte ${type === "satellite" ? "satellite" : "bathymétrique"} uploadée !`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload: " + error.message);
    } finally {
      setUploading(false);
    }
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
      satellite_map_url: satelliteMapUrl || undefined,
      bathymetric_map_url: bathymetricMapUrl || undefined,
    };

    if (editingLocation) {
      updateLocation.mutate(
        { id: editingLocation.id, ...locationData },
        {
          onSuccess: () => {
            form.reset();
            setIsDialogOpen(false);
            setEditingLocation(null);
            setPreviewUrl(null);
            setSatelliteMapUrl(null);
            setBathymetricMapUrl(null);
          },
        }
      );
    } else {
      createLocation.mutate(locationData, {
        onSuccess: () => {
          form.reset();
          setIsDialogOpen(false);
          setPreviewUrl(null);
          setSatelliteMapUrl(null);
          setBathymetricMapUrl(null);
        },
      });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Gestion des lieux
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lieu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px] md:w-[250px]"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingLocation(null);
              setPreviewUrl(null);
              setSatelliteMapUrl(null);
              setBathymetricMapUrl(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ocean" size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
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

                {/* Photo Section with Tabs */}
                <div className="space-y-3">
                  <FormLabel>Photo du lieu</FormLabel>
                  <Tabs value={photoMode} onValueChange={(v) => setPhotoMode(v as "url" | "upload")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url" className="gap-2">
                        <Link className="h-4 w-4" />
                        URL
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="url" className="mt-3">
                      <FormField
                        control={form.control}
                        name="photo_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="https://exemple.com/photo.jpg"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setPreviewUrl(e.target.value || null);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="upload" className="mt-3">
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Choisir une image
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Formats acceptés : JPG, PNG, WebP. Max 5 Mo.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {previewUrl && (
                    <div className="relative mt-3 rounded-lg overflow-hidden bg-muted aspect-video">
                      <img
                        src={previewUrl}
                        alt="Aperçu"
                        className="h-full w-full object-cover"
                        onError={() => setPreviewUrl(null)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => {
                          setPreviewUrl(null);
                          form.setValue("photo_url", "");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

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
                  disabled={createLocation.isPending || updateLocation.isPending || isUploading}
                >
                  {createLocation.isPending || updateLocation.isPending
                    ? "Enregistrement..."
                    : editingLocation
                    ? "Mettre à jour"
                    : "Créer le lieu"}
                </Button>
              </form>
            </Form>

            {/* Waypoint Editors - Only show when editing an existing location with coordinates */}
            {editingLocation && editingLocation.latitude && editingLocation.longitude && (
              <>
                <Separator className="my-6" />
                
                {/* Satellite Map Editor */}
                <SatelliteWaypointEditor
                  siteId={editingLocation.id}
                  siteName={editingLocation.name}
                  siteLat={editingLocation.latitude}
                  siteLng={editingLocation.longitude}
                />

                <Separator className="my-6" />

                {/* Bathymetric Map Editor */}
                <BathymetricMapEditor
                  siteId={editingLocation.id}
                  siteName={editingLocation.name}
                  siteLat={editingLocation.latitude}
                  siteLng={editingLocation.longitude}
                />

                <Separator className="my-6" />

                {/* PDF Cartography Upload Section */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-base font-medium">
                      <FileImage className="h-5 w-5 text-primary" />
                      Cartographie PDF (POSS)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Uploadez les images HD générées pour les intégrer au Plan d'Organisation et de Surveillance des Secours.
                    </p>

                    {/* Satellite Map Upload */}
                    <div className="space-y-2">
                      <Label className="font-medium">Plan de Secours (Satellite/Points)</Label>
                      <p className="text-xs text-muted-foreground">
                        Uploader l'image Satellite HD générée précédemment.
                      </p>
                      <input
                        ref={satelliteInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMapImageUpload(e, "satellite")}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => satelliteInputRef.current?.click()}
                          disabled={isUploadingSatellite}
                        >
                          {isUploadingSatellite ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Uploader l'image Satellite
                            </>
                          )}
                        </Button>
                      </div>
                      {satelliteMapUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                          <img
                            src={satelliteMapUrl}
                            alt="Carte Satellite"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => setSatelliteMapUrl(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Bathymetric Map Upload */}
                    <div className="space-y-2">
                      <Label className="font-medium">Carte des Fonds (SHOM/Bathymétrique)</Label>
                      <p className="text-xs text-muted-foreground">
                        Uploader l'image Bathymétrique HD générée précédemment.
                      </p>
                      <input
                        ref={bathymetricInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMapImageUpload(e, "bathymetric")}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2 border-ocean/50 text-ocean hover:bg-ocean/10"
                          onClick={() => bathymetricInputRef.current?.click()}
                          disabled={isUploadingBathymetric}
                        >
                          {isUploadingBathymetric ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Uploader l'image Bathymétrique
                            </>
                          )}
                        </Button>
                      </div>
                      {bathymetricMapUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                          <img
                            src={bathymetricMapUrl}
                            alt="Carte Bathymétrique"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => setBathymetricMapUrl(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery ? `Aucun lieu trouvé pour "${searchQuery}"` : "Aucun lieu enregistré"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLocations.map((location) => (
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
                  <button
                    onClick={() => setViewingLocation(location)}
                    className="font-medium text-foreground hover:text-primary hover:underline text-left"
                  >
                    {location.name}
                  </button>
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
                    {(location.satellite_map_url || location.bathymetric_map_url) && (
                      <span className="text-xs bg-green-500/10 text-green-700 px-2 py-0.5 rounded">
                        📍 POSS
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

      {/* View Location Dialog */}
      <Dialog open={!!viewingLocation} onOpenChange={(open) => !open && setViewingLocation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {viewingLocation?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingLocation && (
            <div className="space-y-4">
              {viewingLocation.photo_url && (
                <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                  <img
                    src={viewingLocation.photo_url}
                    alt={viewingLocation.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                {viewingLocation.type && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Type :</span>
                    <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {viewingLocation.type}
                    </span>
                  </div>
                )}
                
                {viewingLocation.address && (
                  <div>
                    <span className="text-sm text-muted-foreground">Adresse :</span>
                    <p className="text-sm font-medium">{viewingLocation.address}</p>
                  </div>
                )}
                
                {viewingLocation.max_depth && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Profondeur max :</span>
                    <span className="text-sm font-medium">{viewingLocation.max_depth}m</span>
                  </div>
                )}
                
                {viewingLocation.comments && (
                  <div>
                    <span className="text-sm text-muted-foreground">Commentaires :</span>
                    <p className="text-sm mt-1">{viewingLocation.comments}</p>
                  </div>
                )}
                
                {viewingLocation.maps_url && (
                  <a
                    href={viewingLocation.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir sur Google Maps
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LocationManager;
