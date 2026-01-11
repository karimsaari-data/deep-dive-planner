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
  Calendar,
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
import { 
  useMembershipYearlyStatus, 
  getCurrentSeasonYear, 
  getSeasonLabel, 
  getAvailableSeasons,
  StatusField 
} from "@/hooks/useMembershipYearlyStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  cleanCsvCell,
  mapHeaderToFieldKey,
  normalizePhone,
  parseCsvText,
  parseFlexibleDateToISO,
  readCsvFileText,
} from "@/lib/csvImport";

const GENDER_OPTIONS = ["Homme", "Femme", "Autre"];
const BOARD_ROLE_OPTIONS = ["Président", "Vice-Président", "Trésorier", "Secrétaire", "Membre du bureau"];

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

  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeasonYear());
  const availableSeasons = getAvailableSeasons();

  const {
    statuses,
    isLoading: isLoadingStatuses,
    getStatusForMember,
    upsertStatus,
  } = useMembershipYearlyStatus(selectedSeason);

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
    board_role: "",
    is_encadrant: false,
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
      board_role: "",
      is_encadrant: false,
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
      board_role: member.board_role || "",
      is_encadrant: member.is_encadrant ?? false,
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

  // Toggle checkbox status - uses the yearly status table
  const handleCheckboxToggle = async (member: ClubMember, field: StatusField) => {
    const currentStatus = getStatusForMember(member.id);
    const currentValue = currentStatus?.[field] ?? false;
    
    try {
      await upsertStatus.mutateAsync({
        memberId: member.id,
        field,
        value: !currentValue,
      });
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Get status value for a member (with fallback to false if no record exists)
  const getMemberStatusValue = (memberId: string, field: StatusField): boolean => {
    const status = getStatusForMember(memberId);
    return status?.[field] ?? false;
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

  // CSV Export with new columns (exports for selected season)
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
      `Cotisation Payée (${getSeasonLabel(selectedSeason)})`,
      `Certificat Médical (${getSeasonLabel(selectedSeason)})`,
      `Charte Signée (${getSeasonLabel(selectedSeason)})`,
      `Assurance FSGT (${getSeasonLabel(selectedSeason)})`,
      "Notes",
    ];

    const rows = members.map((m) => {
      const status = getStatusForMember(m.id);
      return [
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
        status?.payment_status ? "Oui" : "Non",
        status?.medical_certificate_ok ? "Oui" : "Non",
        status?.buddies_charter_signed ? "Oui" : "Non",
        status?.fsgt_insurance_ok ? "Oui" : "Non",
        m.notes || "",
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fichier_adherents_${getSeasonLabel(selectedSeason).replace("/", "-")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
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

    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    try {
      // 1) Decode with fallback (UTF-8 / Windows-1252 / ISO-8859-1)
      const rawText = await readCsvFileText(file);

      // 2) Robust parsing (delimiter auto + fallbacks) + header normalization
      const parsed = parseCsvText(rawText);

      // Collect parser-level errors (delimiter/quotes…)
      parsed.errors?.forEach((err) => {
        const line = (err as any).row ? (err as any).row + 1 : 1;
        errors.push({ line, email: "-", reason: `Parsing CSV : ${err.message}` });
      });

      const rows = (parsed.data || []).filter((r) => {
        const values = Object.values(r || {}).map((v) => (v ?? "").toString().trim());
        return values.some(Boolean);
      });

      if (!rows.length) {
        errors.push({ line: 1, email: "-", reason: "Le fichier CSV est vide ou invalide" });
        setImportReport({ created, updated, errors });
        setImportReportOpen(true);
        return;
      }

      const fields = parsed.meta?.fields || [];
      const required = ["first_name", "last_name", "email"];
      const missingRequired = required.filter((f) => !fields.includes(f));
      if (missingRequired.length) {
        errors.push({
          line: 1,
          email: "-",
          reason: `Colonnes obligatoires manquantes : ${missingRequired.join(", ")}`,
        });
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNumber = i + 2; // +1 header, +1 1-index

        const reasons: string[] = [];

        const firstName = cleanCsvCell((row as any).first_name) || "";
        const lastName = cleanCsvCell((row as any).last_name) || "";
        const email = (cleanCsvCell((row as any).email) || "").toLowerCase();

        if (!email) reasons.push("Email manquant");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) reasons.push("Email invalide");

        if (!firstName) reasons.push("Prénom manquant");
        if (!lastName) reasons.push("Nom manquant");

        const phone = normalizePhone(cleanCsvCell((row as any).phone));
        const address = cleanCsvCell((row as any).address);
        const apneaLevel = cleanCsvCell((row as any).apnea_level);
        const gender = cleanCsvCell((row as any).gender);
        const notes = cleanCsvCell((row as any).notes);

        const birthRaw = cleanCsvCell((row as any).birth_date);
        const joinedRaw = cleanCsvCell((row as any).joined_at);

        const birthParsed = parseFlexibleDateToISO(birthRaw);
        if (birthRaw && birthParsed.error) reasons.push(`Date de naissance : ${birthParsed.error}`);

        const joinedParsed = parseFlexibleDateToISO(joinedRaw);
        if (joinedRaw && joinedParsed.error) reasons.push(`Date d'inscription : ${joinedParsed.error}`);

        // Emergency contact: either split columns, or combined column (smart parsing)
        let emergencyName = cleanCsvCell((row as any).emergency_contact_name);
        let emergencyPhone = normalizePhone(cleanCsvCell((row as any).emergency_contact_phone));

        if (!emergencyName && !emergencyPhone) {
          const combined = cleanCsvCell((row as any).emergency_contact);
          if (combined) {
            const parsedContact = parseEmergencyContact(combined);
            emergencyName = parsedContact.name || null;
            emergencyPhone = normalizePhone(parsedContact.phone || null);
          }
        }

        if (reasons.length) {
          errors.push({ line: lineNumber, email: email || "-", reason: reasons.join(" • ") });
          continue;
        }

        const memberData: ClubMemberInsert = {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          birth_date: birthParsed.iso,
          address,
          apnea_level: apneaLevel,
          joined_at: joinedParsed.iso,
          gender,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          notes,
        };

        try {
          const result = await upsertMember.mutateAsync(memberData);
          if (result.updated) updated++;
          else created++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
          errors.push({ line: lineNumber, email, reason: errorMessage });
        }
      }

      setImportReport({ created, updated, errors });
      setImportReportOpen(true);
    } catch {
      toast.error("Erreur lors de l'import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter and sort members (sorting on status uses the yearly status data)
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
          aValue = getMemberStatusValue(a.id, sortField);
          bValue = getMemberStatusValue(b.id, sortField);
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
  }, [members, searchTerm, sortField, sortDirection, statuses]);

  const getRowClassName = (member: ClubMember) => {
    const payment = getMemberStatusValue(member.id, "payment_status");
    const medical = getMemberStatusValue(member.id, "medical_certificate_ok");
    const charter = getMemberStatusValue(member.id, "buddies_charter_signed");
    const insurance = getMemberStatusValue(member.id, "fsgt_insurance_ok");
    
    const allComplete = payment && medical && charter && insurance;
    if (allComplete) return "bg-green-50 dark:bg-green-950/20";
    if (!payment) return "bg-red-50 dark:bg-red-950/20";
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

  // Count complete records for stats
  const completeRecordsCount = useMemo(() => {
    return members?.filter((m) => {
      const payment = getMemberStatusValue(m.id, "payment_status");
      const medical = getMemberStatusValue(m.id, "medical_certificate_ok");
      const charter = getMemberStatusValue(m.id, "buddies_charter_signed");
      const insurance = getMemberStatusValue(m.id, "fsgt_insurance_ok");
      return payment && medical && charter && insurance;
    }).length || 0;
  }, [members, statuses]);

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
        {/* Season selector + Actions bar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Saison :</Label>
            <Select 
              value={selectedSeason.toString()} 
              onValueChange={(v) => setSelectedSeason(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSeasons.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {getSeasonLabel(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
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
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        {/* Table */}
        {isLoading || isLoadingStatuses ? (
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
                          checked={getMemberStatusValue(member.id, "payment_status")}
                          onCheckedChange={() => handleCheckboxToggle(member, "payment_status")}
                          disabled={upsertStatus.isPending}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={getMemberStatusValue(member.id, "medical_certificate_ok")}
                          onCheckedChange={() => handleCheckboxToggle(member, "medical_certificate_ok")}
                          disabled={upsertStatus.isPending}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={getMemberStatusValue(member.id, "buddies_charter_signed")}
                          onCheckedChange={() => handleCheckboxToggle(member, "buddies_charter_signed")}
                          disabled={upsertStatus.isPending}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={getMemberStatusValue(member.id, "fsgt_insurance_ok")}
                          onCheckedChange={() => handleCheckboxToggle(member, "fsgt_insurance_ok")}
                          disabled={upsertStatus.isPending}
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
              {completeRecordsCount} dossiers complets ({getSeasonLabel(selectedSeason)})
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="joined_at">Date d'arrivée</Label>
                  <Input
                    id="joined_at"
                    type="date"
                    value={formData.joined_at || ""}
                    onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="board_role">Rôle au Bureau</Label>
                  <Select 
                    value={formData.board_role || ""} 
                    onValueChange={(v) => setFormData({ ...formData, board_role: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {BOARD_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Checkbox
                  id="is_encadrant"
                  checked={formData.is_encadrant ?? false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_encadrant: !!checked })}
                />
                <Label htmlFor="is_encadrant" className="text-sm font-medium cursor-pointer">
                  🤿 Est Encadrant
                  <span className="block text-xs text-muted-foreground font-normal">
                    Cette personne encadre les sorties et a accès aux outils d'organisation
                  </span>
                </Label>
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
                {deleteMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
            <div className="py-4">
              <div className="flex gap-4 mb-4">
                <Badge className="bg-green-500/20 text-green-700">
                  {importReport.created} créés
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-700">
                  {importReport.updated} mis à jour
                </Badge>
                <Badge className="bg-red-500/20 text-red-700">
                  {importReport.errors.length} erreurs
                </Badge>
              </div>
              
              {importReport.errors.length > 0 && (
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {importReport.errors.map((err, idx) => (
                      <div key={idx} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <span className="font-medium">Ligne {err.line}</span>
                        {err.email !== "-" && (
                          <span className="text-muted-foreground ml-1">({err.email})</span>
                        )}
                        <p className="text-red-600 dark:text-red-400">{err.reason}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
