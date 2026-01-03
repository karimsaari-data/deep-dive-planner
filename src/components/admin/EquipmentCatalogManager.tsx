import { useState } from "react";
import { Package, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEquipmentCatalog, useCreateCatalogItem, useUpdateCatalogItem, useDeleteCatalogItem, EquipmentCatalogItem } from "@/hooks/useEquipment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EquipmentCatalogManager = () => {
  const { data: catalog, isLoading } = useEquipmentCatalog();
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem();
  const deleteItem = useDeleteCatalogItem();

  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentCatalogItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEstimatedValue("");
    setPhotoFile(null);
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditDialog = (item: EquipmentCatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setEstimatedValue(item.estimated_value?.toString() || "");
    setPhotoFile(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let photo_url: string | undefined;

    if (photoFile) {
      setUploading(true);
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `equipment/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("outings_gallery")
        .upload(filePath, photoFile);

      if (uploadError) {
        toast.error("Erreur lors de l'upload de la photo");
        setUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("outings_gallery")
        .getPublicUrl(filePath);

      photo_url = publicData.publicUrl;
      setUploading(false);
    }

    const parsedValue = estimatedValue ? parseFloat(estimatedValue) : undefined;

    if (editingItem) {
      // Update existing item
      updateItem.mutate(
        {
          id: editingItem.id,
          name: name.trim(),
          description: description.trim() || undefined,
          photo_url: photo_url || editingItem.photo_url || undefined,
          estimated_value: parsedValue,
        },
        {
          onSuccess: () => {
            handleClose();
          },
        }
      );
    } else {
      // Create new item
      createItem.mutate(
        { name: name.trim(), description: description.trim() || undefined, photo_url, estimated_value: parsedValue },
        {
          onSuccess: () => {
            handleClose();
          },
        }
      );
    }
  };

  const isPending = createItem.isPending || updateItem.isPending || uploading;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Catalogue du matériel
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier l'article" : "Ajouter un article au catalogue"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'article *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Bouée ronde, Corde 20m..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description optionnelle..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Valeur unitaire estimée (€)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="Ex: 25.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Photo {editingItem?.photo_url && "(laisser vide pour conserver l'actuelle)"}</Label>
                  {editingItem?.photo_url && (
                    <div className="mb-2">
                      <img
                        src={editingItem.photo_url}
                        alt={editingItem.name}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    </div>
                  )}
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? "Enregistrer les modifications" : "Ajouter au catalogue"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : catalog?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun article dans le catalogue
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Supprimer cet article du catalogue ?")) {
                        deleteItem.mutate(item.id);
                      }
                    }}
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

export default EquipmentCatalogManager;
