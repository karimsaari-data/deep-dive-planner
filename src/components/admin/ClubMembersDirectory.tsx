import { useState, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Mail,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { useClubMembersDirectory, ClubMember, ClubMemberInsert } from "@/hooks/useClubMembersDirectory";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ClubMembersDirectory = () => {
  const {
    members,
    isLoading,
    createMember,
    updateMember,
    deleteMember,
    upsertMember,
    isEmailRegistered,
  } = useClubMembersDirectory();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ClubMemberInsert>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    address: "",
    apnea_level: "",
    joined_at: "",
    emergency_contact: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      birth_date: "",
      address: "",
      apnea_level: "",
      joined_at: "",
      emergency_contact: "",
      notes: "",
    });
    setEditingMember(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (member: ClubMember) => {
    setEditingMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || "",
      birth_date: member.birth_date || "",
      address: member.address || "",
      apnea_level: member.apnea_level || "",
      joined_at: member.joined_at || "",
      emergency_contact: member.emergency_contact || "",
      notes: member.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error("Prénom, nom et email sont obligatoires");
      return;
    }

    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          ...formData,
          email: formData.email.toLowerCase(),
        });
      } else {
        await createMember.mutateAsync({
          ...formData,
          email: formData.email.toLowerCase(),
        });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMember.mutateAsync(id);
    setDeleteConfirm(null);
  };

  // CSV Export
  const exportCSV = () => {
    if (!members?.length) {
      toast.error("Aucun adhérent à exporter");
      return;
    }

    const headers = [
      "ID Interne",
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Date Naissance",
      "Adresse",
      "Niveau Apnée",
      "Date Arrivée",
      "Contact Urgence",
      "Notes",
    ];

    const rows = members.map((m) => [
      m.member_id,
      m.first_name,
      m.last_name,
      m.email,
      m.phone || "",
      m.birth_date || "",
      m.address || "",
      m.apnea_level || "",
      m.joined_at || "",
      m.emergency_contact || "",
      m.notes || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fichier_adherents_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV réussi");
  };

  // CSV Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        
        if (lines.length < 2) {
          toast.error("Le fichier CSV est vide ou invalide");
          setIsImporting(false);
          return;
        }

        // Skip header row
        const dataRows = lines.slice(1);
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (const line of dataRows) {
          // Parse CSV line (handle quoted values with semicolons)
          const values = line.match(/(".*?"|[^";]+)(?=\s*;|\s*$)/g)?.map(v => 
            v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
          ) || [];

          if (values.length < 4) continue; // Need at least first_name, last_name, email

          const memberData: ClubMemberInsert = {
            first_name: values[1] || values[0], // Skip member_id if present
            last_name: values[2] || values[1],
            email: values[3] || values[2],
            phone: values[4] || null,
            birth_date: values[5] || null,
            address: values[6] || null,
            apnea_level: values[7] || null,
            joined_at: values[8] || null,
            emergency_contact: values[9] || null,
            notes: values[10] || null,
          };

          // Validate email
          if (!memberData.email || !memberData.email.includes("@")) {
            errors++;
            continue;
          }

          try {
            const result = await upsertMember.mutateAsync(memberData);
            if (result.updated) {
              updated++;
            } else {
              created++;
            }
          } catch {
            errors++;
          }
        }

        toast.success(`Import terminé: ${created} créés, ${updated} mis à jour, ${errors} erreurs`);
      } catch (error) {
        toast.error("Erreur lors de l'import CSV");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  const filteredMembers = members?.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.member_id.toLowerCase().includes(searchLower)
    );
  });

  const openMailto = (email: string, firstName: string) => {
    const subject = encodeURIComponent("Invitation à rejoindre l'application du club");
    const body = encodeURIComponent(
      `Bonjour ${firstName},\n\nNous vous invitons à créer votre compte sur notre application.\n\nCordialement`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Fichier Adhérents
        </CardTitle>
        <CardDescription>
          Gestion administrative des adhérents du club (CRM)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={openNewForm} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
            <Button onClick={handleImportClick} variant="outline" size="sm" disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Import CSV
            </Button>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredMembers?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun adhérent trouvé
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead className="text-center">Statut App</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers?.map((member) => {
                  const isRegistered = isEmailRegistered(member.email);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-xs">{member.member_id}</TableCell>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell className="text-sm">{member.phone || "-"}</TableCell>
                      <TableCell className="text-sm">{member.apnea_level || "-"}</TableCell>
                      <TableCell className="text-center">
                        {isRegistered ? (
                          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                            <Check className="h-3 w-3 mr-1" />
                            Inscrit
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => openMailto(member.email, member.first_name)}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Inviter
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Stats footer */}
        {members && members.length > 0 && (
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span>{members.length} adhérents au total</span>
            <span>•</span>
            <span className="text-green-600">
              {members.filter((m) => isEmailRegistered(m.email)).length} inscrits à l'app
            </span>
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Modifier l'adhérent" : "Ajouter un adhérent"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Date de naissance</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date || ""}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Adresse complète"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="apnea_level">Niveau Apnée</Label>
                  <Input
                    id="apnea_level"
                    value={formData.apnea_level || ""}
                    onChange={(e) => setFormData({ ...formData, apnea_level: e.target.value })}
                    placeholder="ex: A2, A3, Initiateur..."
                  />
                </div>
                <div>
                  <Label htmlFor="joined_at">Date d'arrivée</Label>
                  <Input
                    id="joined_at"
                    type="date"
                    value={formData.joined_at || ""}
                    onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="emergency_contact">Contact d'urgence</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact || ""}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Nom et téléphone"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMember.isPending || updateMember.isPending}
              >
                {(createMember.isPending || updateMember.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingMember ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet adhérent ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. L'adhérent sera définitivement supprimé du fichier.
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

export default ClubMembersDirectory;
