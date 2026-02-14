import { useState, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useApneaLevels,
  useCreateApneaLevel,
  useUpdateApneaLevel,
  useDeleteApneaLevel,
  ApneaLevel,
} from "@/hooks/useApneaLevels";

interface FormData {
  code: string;
  name: string;
  prerogatives: string;
  is_instructor: boolean;
  federation: string;
  federation_full_name: string;
  profondeur_max_eaa: string;
  profondeur_max_eao: string;
}

const emptyForm: FormData = {
  code: "",
  name: "",
  prerogatives: "",
  is_instructor: false,
  federation: "",
  federation_full_name: "",
  profondeur_max_eaa: "",
  profondeur_max_eao: "",
};

const ApneaLevelsManager = () => {
  const { data: levels, isLoading } = useApneaLevels();
  const createLevel = useCreateApneaLevel();
  const updateLevel = useUpdateApneaLevel();
  const deleteLevel = useDeleteApneaLevel();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterFederation, setFilterFederation] = useState<string | null>(null);
  const [filterInstructor, setFilterInstructor] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApneaLevel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const filteredLevels = useMemo(() => {
    if (!levels) return [];
    const search = searchTerm.toLowerCase();
    return levels.filter((l) => {
      const matchesSearch =
        l.code.toLowerCase().includes(search) ||
        l.name.toLowerCase().includes(search) ||
        (l.federation || "").toLowerCase().includes(search);
      if (!matchesSearch) return false;

      if (filterFederation && (l.federation || "Autre") !== filterFederation) return false;
      if (filterInstructor && !l.is_instructor) return false;

      return true;
    });
  }, [levels, searchTerm, filterFederation, filterInstructor]);

  const federationCounts = useMemo(() => {
    if (!levels) return {};
    return levels.reduce((acc, l) => {
      const fed = l.federation || "Autre";
      acc[fed] = (acc[fed] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [levels]);

  const openCreateForm = () => {
    setEditingLevel(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (level: ApneaLevel) => {
    setEditingLevel(level);
    setFormData({
      code: level.code,
      name: level.name,
      prerogatives: level.prerogatives || "",
      is_instructor: level.is_instructor,
      federation: level.federation || "",
      federation_full_name: level.federation_full_name || "",
      profondeur_max_eaa: level.profondeur_max_eaa?.toString() || "",
      profondeur_max_eao: level.profondeur_max_eao?.toString() || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) return;

    const profondeurEaa = formData.profondeur_max_eaa ? parseInt(formData.profondeur_max_eaa) : null;
    const profondeurEao = formData.profondeur_max_eao ? parseInt(formData.profondeur_max_eao) : null;

    if (editingLevel) {
      await updateLevel.mutateAsync({
        id: editingLevel.id,
        code: formData.code,
        name: formData.name,
        prerogatives: formData.prerogatives || null,
        is_instructor: formData.is_instructor,
        federation: formData.federation || null,
        federation_full_name: formData.federation_full_name || null,
        profondeur_max_eaa: profondeurEaa,
        profondeur_max_eao: profondeurEao,
      });
    } else {
      await createLevel.mutateAsync({
        code: formData.code,
        name: formData.name,
        prerogatives: formData.prerogatives || undefined,
        is_instructor: formData.is_instructor,
        federation: formData.federation || undefined,
        federation_full_name: formData.federation_full_name || undefined,
        profondeur_max_eaa: profondeurEaa || undefined,
        profondeur_max_eao: profondeurEao || undefined,
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLevel.mutateAsync(id);
    setDeleteConfirm(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Niveaux d'Apnée
            </CardTitle>
            <CardDescription>
              Table de référence des certifications officielles ({(filterFederation || filterInstructor) ? `${filteredLevels.length} / ${levels?.length || 0}` : levels?.length || 0} niveaux)
            </CardDescription>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(federationCounts).map(([fed, count]) => (
            <Badge
              key={fed}
              variant={filterFederation === fed ? "default" : "secondary"}
              className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setFilterFederation(filterFederation === fed ? null : fed)}
            >
              {fed}: {count}
            </Badge>
          ))}
          <Badge
            variant={filterInstructor ? "default" : "secondary"}
            className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setFilterInstructor(!filterInstructor)}
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Encadrant
          </Badge>
          {(filterFederation || filterInstructor) && (
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-muted"
              onClick={() => { setFilterFederation(null); setFilterInstructor(false); }}
            >
              Tout afficher ({levels?.length})
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code, nom ou fédération..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Fédération</TableHead>
                  <TableHead>Prérogatives</TableHead>
                  <TableHead className="text-center">Encadrant</TableHead>
                  <TableHead className="text-center">Max EAA</TableHead>
                  <TableHead className="text-center">Max EAO</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {level.code}
                    </TableCell>
                    <TableCell className="text-sm">{level.name}</TableCell>
                    <TableCell>
                      {level.federation && (
                        <Badge variant="outline" className="text-xs">
                          {level.federation}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {level.prerogatives}
                    </TableCell>
                    <TableCell className="text-center">
                      {level.is_instructor && (
                        <ShieldCheck className="h-4 w-4 text-green-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {level.profondeur_max_eaa ? `${level.profondeur_max_eaa}m` : "-"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {level.profondeur_max_eao ? `${level.profondeur_max_eao}m` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(level)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(level.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? "Modifier le niveau" : "Ajouter un niveau"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="ex: AIDA 2"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: AIDA 2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="federation">Fédération</Label>
                  <Input
                    id="federation"
                    value={formData.federation}
                    onChange={(e) => setFormData({ ...formData, federation: e.target.value })}
                    placeholder="ex: AIDA, CMAS, FFESSM..."
                  />
                </div>
                <div>
                  <Label htmlFor="federation_full_name">Nom complet fédération</Label>
                  <Input
                    id="federation_full_name"
                    value={formData.federation_full_name}
                    onChange={(e) => setFormData({ ...formData, federation_full_name: e.target.value })}
                    placeholder="Nom officiel complet"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="prerogatives">Prérogatives</Label>
                <Input
                  id="prerogatives"
                  value={formData.prerogatives}
                  onChange={(e) => setFormData({ ...formData, prerogatives: e.target.value })}
                  placeholder="ex: -16m / 40m dynamique"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="profondeur_max_eaa">Prof. max EAA (m)</Label>
                  <Input
                    id="profondeur_max_eaa"
                    type="number"
                    value={formData.profondeur_max_eaa}
                    onChange={(e) => setFormData({ ...formData, profondeur_max_eaa: e.target.value })}
                    placeholder="ex: 20"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Eau artificielle (piscine/fosse)</p>
                </div>
                <div>
                  <Label htmlFor="profondeur_max_eao">Prof. max EAO (m)</Label>
                  <Input
                    id="profondeur_max_eao"
                    type="number"
                    value={formData.profondeur_max_eao}
                    onChange={(e) => setFormData({ ...formData, profondeur_max_eao: e.target.value })}
                    placeholder="ex: 15"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Eau ouverte (mer/étang/dépollution)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_instructor"
                  checked={formData.is_instructor}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_instructor: checked === true })
                  }
                />
                <Label htmlFor="is_instructor" className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Niveau d'encadrement
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.code || !formData.name || createLevel.isPending || updateLevel.isPending}
              >
                {(createLevel.isPending || updateLevel.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingLevel ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce niveau ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le niveau sera supprimé de la table de référence.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ApneaLevelsManager;
