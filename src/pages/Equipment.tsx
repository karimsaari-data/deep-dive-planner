import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, Plus, ArrowRightLeft, Trash2, Download, History, Users, Filter } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const { data: catalog } = useEquipmentCatalog();
  const addToInventory = useAddToInventory();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!selectedCatalogId) return;
    addToInventory.mutate(
      { catalogId: selectedCatalogId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setSelectedCatalogId("");
          setNotes("");
        },
      }
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Mon matériel
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter du matériel à mon inventaire</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de matériel</Label>
                  <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un article..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
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
                    placeholder="Remarques sur cet article..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!selectedCatalogId || addToInventory.isPending}>
                  {addToInventory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ajouter à mon inventaire
                </Button>
              </div>
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

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      {item.catalog?.photo_url ? (
        <img
          src={item.catalog.photo_url}
          alt={item.catalog?.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{item.catalog?.name}</p>
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

    const headers = ["Article", "Détenteur", "Statut", "Notes", "Date d'acquisition"];
    const rows = inventory.map((item) => [
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
