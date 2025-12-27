import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, Plus, ArrowRightLeft, Trash2, Download, History, Users, Filter, Camera, Upload, Hash } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useEquipmentCatalog,
  useMyEquipmentInventory,
  useGlobalEquipmentInventory,
  useAddToInventory,
  useTransferEquipment,
  useDecommissionEquipment,
  useEncadrants,
  useEquipmentHistory,
  EquipmentInventoryItem,
} from "@/hooks/useEquipment";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  disponible: { label: "Disponible", variant: "default" },
  prêté: { label: "Prêté", variant: "secondary" },
  perdu: { label: "Perdu", variant: "destructive" },
  cassé: { label: "Cassé", variant: "destructive" },
  rebuté: { label: "Rebuté", variant: "outline" },
};

const Equipment = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isOrganizer) {
        navigate("/");
      }
    }
  }, [user, isOrganizer, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isOrganizer) {
    return null;
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Inventaire Matériel</h1>
            <p className="text-muted-foreground">
              Gérez le matériel du club et suivez sa circulation
            </p>
          </div>

          <Tabs defaultValue="my-inventory" className="space-y-6">
            <TabsList>
              <TabsTrigger value="my-inventory">Mon inventaire</TabsTrigger>
              <TabsTrigger value="global">Vue globale</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="my-inventory">
              <MyInventoryTab />
            </TabsContent>

            <TabsContent value="global">
              <GlobalInventoryTab />
            </TabsContent>

            <TabsContent value="history">
              <HistoryTab />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

const MyInventoryTab = () => {
  const { data: inventory, isLoading } = useMyEquipmentInventory();
  const { data: catalog, isLoading: catalogLoading } = useEquipmentCatalog();
  const addToInventory = useAddToInventory();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [step, setStep] = useState<"select" | "details">("select");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<typeof catalog extends (infer T)[] ? T : never | null>(null);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `inventory/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("outings_gallery")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Erreur lors de l'upload de la photo");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("outings_gallery")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSelectItem = (item: NonNullable<typeof selectedCatalogItem>) => {
    setSelectedCatalogItem(item);
    setStep("details");
  };

  const handleAdd = async () => {
    if (!selectedCatalogItem) return;
    setIsUploading(true);

    let photoUrl: string | undefined;
    if (photoFile) {
      const url = await uploadPhoto(photoFile);
      if (url) photoUrl = url;
    }

    addToInventory.mutate(
      { catalogId: selectedCatalogItem.id, notes: notes.trim() || undefined, photoUrl },
      {
        onSuccess: () => {
          resetForm();
          setIsAddOpen(false);
        },
        onError: () => {
          setIsUploading(false);
        },
      }
    );
  };

  const resetForm = () => {
    setStep("select");
    setSelectedCatalogItem(null);
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsUploading(false);
  };

  const handleBack = () => {
    setStep("select");
    setSelectedCatalogItem(null);
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Mon matériel
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {step === "select" 
                    ? "Sélectionner un type de matériel" 
                    : `Ajouter : ${selectedCatalogItem?.name}`}
                </DialogTitle>
              </DialogHeader>
              
              {step === "select" ? (
                <div className="flex-1 overflow-y-auto">
                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : catalog?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun article dans le catalogue
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pr-2">
                      {catalog?.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-colors text-left"
                        >
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.name}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground text-center line-clamp-2">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {/* Selected item preview */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    {selectedCatalogItem?.photo_url ? (
                      <img
                        src={selectedCatalogItem.photo_url}
                        alt={selectedCatalogItem.name}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{selectedCatalogItem?.name}</p>
                      {selectedCatalogItem?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{selectedCatalogItem.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Changer
                    </Button>
                  </div>

                  {/* Photo upload */}
                  <div className="space-y-2">
                    <Label>Photo de votre article</Label>
                    {photoPreview ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Aperçu"
                          className="w-full h-48 object-cover rounded-lg border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={cameraInputRef}
                          onChange={handleFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Prendre photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Importer
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Notes/Comments */}
                  <div className="space-y-2">
                    <Label>Commentaires / Annotations</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="État du matériel, numéro de série, particularités..."
                      rows={3}
                    />
                  </div>

                  {/* Info about unique ID */}
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span>Un identifiant unique sera généré automatiquement</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Retour
                    </Button>
                    <Button 
                      onClick={handleAdd} 
                      className="flex-1" 
                      disabled={addToInventory.isPending || isUploading}
                    >
                      {(addToInventory.isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Ajouter
                    </Button>
                  </div>
                </div>
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
        ) : inventory?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun matériel dans votre inventaire
          </p>
        ) : (
          <div className="space-y-3">
            {inventory?.map((item) => (
              <InventoryItemCard key={item.id} item={item} showActions />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InventoryItemCard = ({ item, showActions = false }: { item: EquipmentInventoryItem; showActions?: boolean }) => {
  const { user } = useAuth();
  const { data: encadrants } = useEncadrants();
  const transferEquipment = useTransferEquipment();
  const decommissionEquipment = useDecommissionEquipment();

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDecommissionOpen, setIsDecommissionOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [decommissionStatus, setDecommissionStatus] = useState<"perdu" | "cassé" | "rebuté">("cassé");
  const [notes, setNotes] = useState("");

  const handleTransfer = () => {
    if (!selectedUserId) return;
    transferEquipment.mutate(
      { inventoryId: item.id, toUserId: selectedUserId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setIsTransferOpen(false);
          setSelectedUserId("");
          setNotes("");
        },
      }
    );
  };

  const handleDecommission = () => {
    decommissionEquipment.mutate(
      { inventoryId: item.id, status: decommissionStatus, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setIsDecommissionOpen(false);
          setNotes("");
        },
      }
    );
  };

  const status = statusLabels[item.status] || { label: item.status, variant: "outline" as const };
  const isOwner = item.owner_id === user?.id;

  // Use item-specific photo if available, otherwise fall back to catalog photo
  const displayPhoto = item.photo_url || item.catalog?.photo_url;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      {displayPhoto ? (
        <img
          src={displayPhoto}
          alt={item.catalog?.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{item.catalog?.name}</p>
          {item.unique_code && (
            <Badge variant="outline" className="text-xs font-mono">
              {item.unique_code}
            </Badge>
          )}
        </div>
        {item.owner && (
          <p className="text-xs text-muted-foreground">
            Détenteur: {item.owner.first_name} {item.owner.last_name}
          </p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
        )}
      </div>
      <Badge variant={status.variant}>{status.label}</Badge>

      {showActions && isOwner && item.status === "disponible" && (
        <div className="flex gap-1">
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Transférer">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transférer le matériel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transférer "{item.catalog?.name}" à un autre encadrant
                </p>
                <div className="space-y-2">
                  <Label>Destinataire</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un encadrant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {encadrants
                        ?.filter((e) => e.id !== user?.id)
                        .map((encadrant) => (
                          <SelectItem key={encadrant.id} value={encadrant.id}>
                            {encadrant.first_name} {encadrant.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Raison du transfert..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleTransfer} className="w-full" disabled={!selectedUserId || transferEquipment.isPending}>
                  {transferEquipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Transférer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDecommissionOpen} onOpenChange={setIsDecommissionOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Mise au rebus">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Déclarer le matériel hors service</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Retirer "{item.catalog?.name}" de l'inventaire actif
                </p>
                <div className="space-y-2">
                  <Label>Raison</Label>
                  <Select value={decommissionStatus} onValueChange={(v) => setDecommissionStatus(v as typeof decommissionStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cassé">Cassé</SelectItem>
                      <SelectItem value="perdu">Perdu</SelectItem>
                      <SelectItem value="rebuté">Mis au rebus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Détails..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleDecommission} variant="destructive" className="w-full" disabled={decommissionEquipment.isPending}>
                  {decommissionEquipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

const GlobalInventoryTab = () => {
  const { data: inventory, isLoading } = useGlobalEquipmentInventory();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredInventory = inventory?.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const exportToCsv = () => {
    if (!inventory) return;

    const headers = ["ID Unique", "Article", "Détenteur", "Statut", "Notes", "Date d'acquisition"];
    const rows = inventory.map((item) => [
      item.unique_code || "",
      item.catalog?.name || "",
      item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : "",
      item.status,
      item.notes || "",
      format(new Date(item.acquired_at), "dd/MM/yyyy"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventaire_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Inventaire global
          </CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="prêté">Prêté</SelectItem>
                <SelectItem value="perdu">Perdu</SelectItem>
                <SelectItem value="cassé">Cassé</SelectItem>
                <SelectItem value="rebuté">Rebuté</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredInventory?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun matériel trouvé
          </p>
        ) : (
          <div className="space-y-3">
            {filteredInventory?.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const HistoryTab = () => {
  const { data: history, isLoading } = useEquipmentHistory();

  const getActionLabel = (action: string) => {
    switch (action) {
      case "acquisition":
        return "Acquisition";
      case "transfer":
        return "Transfert";
      case "decommission":
        return "Mise hors service";
      case "status_change":
        return "Changement de statut";
      default:
        return action;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historique des mouvements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : history?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun historique disponible
          </p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {history?.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{getActionLabel(entry.action_type)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <div className="text-sm">
                  {entry.action_type === "transfer" && entry.from_user && entry.to_user && (
                    <p>
                      De <span className="font-medium">{entry.from_user.first_name} {entry.from_user.last_name}</span>
                      {" → "}
                      <span className="font-medium">{entry.to_user.first_name} {entry.to_user.last_name}</span>
                    </p>
                  )}
                  {entry.action_type === "acquisition" && entry.to_user && (
                    <p>
                      Ajouté par <span className="font-medium">{entry.to_user.first_name} {entry.to_user.last_name}</span>
                    </p>
                  )}
                  {entry.action_type === "decommission" && (
                    <p>
                      Statut: <span className="font-medium">{entry.old_status} → {entry.new_status}</span>
                    </p>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Equipment;
