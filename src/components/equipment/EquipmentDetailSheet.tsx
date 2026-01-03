import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Package, ArrowRightLeft, Trash2, AlertTriangle, Loader2, Calendar, Hash, User } from "lucide-react";
import { EquipmentInventoryItem, useTransferEquipment, useDecommissionEquipment, useEncadrants } from "@/hooks/useEquipment";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EquipmentDetailSheetProps {
  item: EquipmentInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  disponible: { label: "Disponible", variant: "default" },
  prêté: { label: "Prêté", variant: "secondary" },
  perdu: { label: "Perdu", variant: "destructive" },
  cassé: { label: "Cassé", variant: "destructive" },
  rebuté: { label: "Rebuté", variant: "outline" },
};

export const EquipmentDetailSheet = ({ item, open, onOpenChange }: EquipmentDetailSheetProps) => {
  const { user } = useAuth();
  const { data: encadrants } = useEncadrants();
  const transferEquipment = useTransferEquipment();
  const decommissionEquipment = useDecommissionEquipment();

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDecommissionOpen, setIsDecommissionOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [decommissionStatus, setDecommissionStatus] = useState<"perdu" | "cassé" | "rebuté">("cassé");
  const [notes, setNotes] = useState("");

  if (!item) return null;

  const status = statusLabels[item.status] || { label: item.status, variant: "outline" as const };
  const isOwner = item.owner_id === user?.id;
  const displayPhoto = item.photo_url || item.catalog?.photo_url;

  const handleTransfer = () => {
    if (!selectedUserId) return;
    transferEquipment.mutate(
      { inventoryId: item.id, toUserId: selectedUserId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setIsTransferOpen(false);
          setSelectedUserId("");
          setNotes("");
          onOpenChange(false);
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
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Fiche Matériel</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Photo */}
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-muted">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={item.catalog?.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Title and status */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-foreground">{item.catalog?.name}</h2>
                <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
              </div>
              {item.catalog?.description && (
                <p className="text-sm text-muted-foreground">{item.catalog.description}</p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Code unique</p>
                  <p className="font-mono font-medium">{item.unique_code}</p>
                </div>
              </div>

              {item.owner && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Détenteur</p>
                    <p className="font-medium">{item.owner.first_name} {item.owner.last_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Date d'acquisition</p>
                  <p className="font-medium">{format(new Date(item.acquired_at), "d MMMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Annotations</h3>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {item.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            {isOwner && item.status === "disponible" && (
              <div className="space-y-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsTransferOpen(true)}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transférer à un autre encadrant
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setIsDecommissionOpen(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Déclarer un problème / Mise au rebus
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
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

      {/* Decommission Dialog */}
      <Dialog open={isDecommissionOpen} onOpenChange={setIsDecommissionOpen}>
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
    </>
  );
};
