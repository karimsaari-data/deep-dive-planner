import { useState, useRef, useMemo } from "react";
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
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useClubMembersDirectory, ClubMember, ClubMemberInsert } from "@/hooks/useClubMembersDirectory";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = ["Homme", "Femme", "Autre"];

type SortField = "last_name" | "first_name" | "email" | "joined_at" | "payment_status" | "medical_certificate_ok" | "buddies_charter_signed" | "fsgt_insurance_ok";
type SortDirection = "asc" | "desc";

interface ImportError {
  line: number;
  email: string;
  reason: string;
}

// Parse emergency contact string into name and phone
const parseEmergencyContact = (contact: string): { name: string; phone: string } => {
  if (!contact) return { name: "", phone: "" };
  
  const phoneRegex = /(\d[\d\s.\-]+\d)/;
  const phoneMatch = contact.match(phoneRegex);
  
  if (phoneMatch) {
    const phone = phoneMatch[1].replace(/[\s.\-]/g, "");
    const name = contact.replace(phoneMatch[0], "").trim();
    return { name, phone };
  }
  
  return { name: contact, phone: "" };
};

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
  const [sortField, setSortField] = useState<SortField>("last_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [importReportOpen, setImportReportOpen] = useState(false);
  const [importReport, setImportReport] = useState<{ created: number; updated: number; errors: ImportError[] }>({ created: 0, updated: 0, errors: [] });
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
    emergency_contact_name: "",
    emergency_contact_phone: "",
    gender: "",
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
      emergency_contact_name: "",
      emergency_contact_phone: "",
      gender: "",
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
      emergency_contact_name: member.emergency_contact_name || "",
      emergency_contact_phone: member.emergency_contact_phone || "",
      gender: member.gender || "",
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

  // Toggle checkbox status
  const handleCheckboxToggle = async (member: ClubMember, field: "payment_status" | "medical_certificate_ok" | "buddies_charter_signed" | "fsgt_insurance_ok") => {
    try {
      await updateMember.mutateAsync({
        id: member.id,
        [field]: !member[field],
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // CSV Export with new columns
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
      "Genre",
      "Contact Urgence - Nom",
      "Contact Urgence - Tel",
      "Cotisation Payée",
      "Certificat Médical",
      "Charte Signée",
      "Assurance FSGT",
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
      m.gender || "",
      m.emergency_contact_name || "",
      m.emergency_contact_phone || "",
      m.payment_status ? "Oui" : "Non",
      m.medical_certificate_ok ? "Oui" : "Non",
      m.buddies_charter_signed ? "Oui" : "Non",
      m.fsgt_insurance_ok ? "Oui" : "Non",
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
      const errors: ImportError[] = [];
      let created = 0;
      let updated = 0;

      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        
        if (lines.length < 2) {
          toast.error("Le fichier CSV est vide ou invalide");
          setIsImporting(false);
          return;
        }

        const headerLine = lines[0];
        const headers = headerLine.match(/(".*?"|[^";]+)(?=\s*;|\s*$)/g)?.map(h => 
          h.replace(/^"|"$/g, "").toLowerCase().trim()
        ) || [];

        const getColIndex = (names: string[]) => {
          for (const name of names) {
            const idx = headers.findIndex(h => h.includes(name));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const colMap = {
          firstName: getColIndex(["prénom", "prenom", "first"]),
          lastName: getColIndex(["nom", "last"]),
          email: getColIndex(["email", "mail"]),
          phone: getColIndex(["téléphone", "telephone", "phone", "tel"]),
          birthDate: getColIndex(["naissance", "birth"]),
          address: getColIndex(["adresse", "address"]),
          apneaLevel: getColIndex(["niveau", "level", "apnée", "apnee"]),
          joinedAt: getColIndex(["arrivée", "arrivee", "joined", "inscription"]),
          gender: getColIndex(["genre", "gender", "sexe"]),
          emergencyContact: getColIndex(["urgence", "emergency"]),
          emergencyName: getColIndex(["urgence - nom", "contact urgence - nom"]),
          emergencyPhone: getColIndex(["urgence - tel", "contact urgence - tel"]),
          notes: getColIndex(["notes", "remarques", "commentaires"]),
        };

        const dataRows = lines.slice(1);

        for (let i = 0; i < dataRows.length; i++) {
          const line = dataRows[i];
          const lineNumber = i + 2;
          const values = line.match(/(".*?"|[^";]+)(?=\s*;|\s*$)/g)?.map(v => 
            v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
          ) || [];

          if (values.length < 3) {
            errors.push({ line: lineNumber, email: "-", reason: "Ligne incomplète" });
            continue;
          }

          const hasId = headers[0]?.includes("id");
          const offset = hasId ? 1 : 0;

          const getValue = (idx: number) => {
            if (idx === -1) return null;
            return values[idx] || null;
          };

          let emergencyName = getValue(colMap.emergencyName);
          let emergencyPhone = getValue(colMap.emergencyPhone);
          
          if (!emergencyName && !emergencyPhone && colMap.emergencyContact !== -1) {
            const combined = getValue(colMap.emergencyContact);
            if (combined) {
              const parsed = parseEmergencyContact(combined);
              emergencyName = parsed.name || null;
              emergencyPhone = parsed.phone || null;
            }
          }

          if (emergencyPhone) {
            emergencyPhone = emergencyPhone.replace(/[\s.\-]/g, "");
          }

          const firstName = getValue(colMap.firstName) || values[offset] || "";
          const lastName = getValue(colMap.lastName) || values[offset + 1] || "";
          const email = getValue(colMap.email) || values[offset + 2] || "";

          const memberData: ClubMemberInsert = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: getValue(colMap.phone),
            birth_date: getValue(colMap.birthDate),
            address: getValue(colMap.address),
            apnea_level: getValue(colMap.apneaLevel),
            joined_at: getValue(colMap.joinedAt),
            gender: getValue(colMap.gender),
            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            notes: getValue(colMap.notes),
          };

          if (!memberData.email || !memberData.email.includes("@")) {
            errors.push({ line: lineNumber, email: memberData.email || "-", reason: "Email invalide ou manquant" });
            continue;
          }

          try {
            const result = await upsertMember.mutateAsync(memberData);
            if (result.updated) {
              updated++;
            } else {
              created++;
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
            errors.push({ line: lineNumber, email: memberData.email, reason: errorMessage });
          }
        }

        setImportReport({ created, updated, errors });
        
        if (errors.length > 0) {
          setImportReportOpen(true);
        } else {
          toast.success(`Import terminé: ${created} créés, ${updated} mis à jour`);
        }
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

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let result = members?.filter((member) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.member_id.toLowerCase().includes(searchLower)
      );
    }) || [];

    result.sort((a, b) => {
      let aValue: string | boolean | null;
      let bValue: string | boolean | null;

      switch (sortField) {
        case "payment_status":
        case "medical_certificate_ok":
        case "buddies_charter_signed":
        case "fsgt_insurance_ok":
          aValue = a[sortField];
          bValue = b[sortField];
          break;
        case "joined_at":
          aValue = a.joined_at || "";
          bValue = b.joined_at || "";
          break;
        default:
          aValue = a[sortField]?.toLowerCase() || "";
          bValue = b[sortField]?.toLowerCase() || "";
      }

      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return sortDirection === "asc" 
          ? (aValue === bValue ? 0 : aValue ? -1 : 1)
          : (aValue === bValue ? 0 : aValue ? 1 : -1);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [members, searchTerm, sortField, sortDirection]);

  const getRowClassName = (member: ClubMember) => {
    const allComplete = member.payment_status && member.medical_certificate_ok && member.buddies_charter_signed && member.fsgt_insurance_ok;
    if (allComplete) return "bg-green-50 dark:bg-green-950/20";
    if (!member.payment_status) return "bg-red-50 dark:bg-red-950/20";
    return "";
  };

  const openMailto = (email: string, firstName: string) => {
    const subject = encodeURIComponent("Invitation à rejoindre l'application du club");
    const body = encodeURIComponent(
      `Bonjour ${firstName},\n\nNous vous invitons à créer votre compte sur notre application.\n\nCordialement`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
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
        ) : filteredAndSortedMembers?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun adhérent trouvé
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("last_name")}
                  >
                    <div className="flex items-center">
                      Identité
                      {getSortIcon("last_name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      Email
                      {getSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("joined_at")}
                  >
                    <div className="flex items-center">
                      Inscription
                      {getSortIcon("joined_at")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("payment_status")}
                  >
                    <div className="flex items-center justify-center" title="Cotisation réglée">
                      💰
                      {getSortIcon("payment_status")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("medical_certificate_ok")}
                  >
                    <div className="flex items-center justify-center" title="Certificat médical">
                      🩺
                      {getSortIcon("medical_certificate_ok")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("buddies_charter_signed")}
                  >
                    <div className="flex items-center justify-center" title="Charte signée">
                      📜
                      {getSortIcon("buddies_charter_signed")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("fsgt_insurance_ok")}
                  >
                    <div className="flex items-center justify-center" title="Assurance FSGT">
                      🛡️
                      {getSortIcon("fsgt_insurance_ok")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Statut App</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedMembers?.map((member) => {
                  const isRegistered = isEmailRegistered(member.email);
                  return (
                    <TableRow key={member.id} className={cn(getRowClassName(member))}>
                      <TableCell className="font-mono text-xs">{member.member_id}</TableCell>
                      <TableCell className="font-medium">
                        {member.last_name.toUpperCase()} {member.first_name}
                      </TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell className="text-sm">{formatDate(member.joined_at)}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={member.payment_status}
                          onCheckedChange={() => handleCheckboxToggle(member, "payment_status")}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={member.medical_certificate_ok}
                          onCheckedChange={() => handleCheckboxToggle(member, "medical_certificate_ok")}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={member.buddies_charter_signed}
                          onCheckedChange={() => handleCheckboxToggle(member, "buddies_charter_signed")}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={member.fsgt_insurance_ok}
                          onCheckedChange={() => handleCheckboxToggle(member, "fsgt_insurance_ok")}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
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
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{members.length} adhérents au total</span>
            <span>•</span>
            <span className="text-green-600">
              {members.filter((m) => isEmailRegistered(m.email)).length} inscrits à l'app
            </span>
            <span>•</span>
            <span className="text-green-600">
              {members.filter((m) => m.payment_status && m.medical_certificate_ok && m.buddies_charter_signed && m.fsgt_insurance_ok).length} dossiers complets
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gender">Genre</Label>
                  <Select 
                    value={formData.gender || ""} 
                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="apnea_level">Niveau Apnée</Label>
                  <Input
                    id="apnea_level"
                    value={formData.apnea_level || ""}
                    onChange={(e) => setFormData({ ...formData, apnea_level: e.target.value })}
                    placeholder="ex: A2, A3..."
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
              <div>
                <Label htmlFor="joined_at">Date d'arrivée</Label>
                <Input
                  id="joined_at"
                  type="date"
                  value={formData.joined_at || ""}
                  onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="emergency_contact_name">Contact urgence - Nom</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name || ""}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="Nom du contact"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Contact urgence - Tél</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone || ""}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="06..."
                  />
                </div>
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

        {/* Import Report Modal */}
        <Dialog open={importReportOpen} onOpenChange={setImportReportOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Rapport d'import
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">{importReport.created} créés</span>
                <span className="text-blue-600 font-medium">{importReport.updated} mis à jour</span>
                <span className="text-red-600 font-medium">{importReport.errors.length} erreurs</span>
              </div>
              
              {importReport.errors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Détail des erreurs :</Label>
                  <ScrollArea className="h-48 mt-2 rounded border border-border">
                    <div className="p-3 space-y-2">
                      {importReport.errors.map((err, idx) => (
                        <div key={idx} className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          <span className="font-mono text-xs">Ligne {err.line}</span>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{err.email}</span>
                          <div className="text-red-600 text-xs mt-1">{err.reason}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setImportReportOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ClubMembersDirectory;
