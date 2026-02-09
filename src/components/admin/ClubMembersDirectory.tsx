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
  ChevronsUpDown,
  GraduationCap,
  AlertCircle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { useClubMembersDirectory, ClubMember, ClubMemberInsert } from "@/hooks/useClubMembersDirectory";
import { 
  useMembershipYearlyStatus, 
  getCurrentSeasonYear, 
  getSeasonLabel, 
  getAvailableSeasons,
  StatusField,
  MembershipYearlyStatus
} from "@/hooks/useMembershipYearlyStatus";
import { useApneaLevels } from "@/hooks/useApneaLevels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  cleanCsvCell,
  normalizePhone,
  parseCsvText,
  parseFlexibleDateToISO,
  readCsvFileText,
} from "@/lib/csvImport";

const GENDER_OPTIONS = ["Homme", "Femme", "Autre"];
const BOARD_ROLE_OPTIONS = ["Président", "Vice-Président", "Trésorier", "Secrétaire", "Trésorier Adjoint", "Secrétaire Adjoint", "Membre du bureau"];

type SortField = "last_name" | "first_name" | "email" | "joined_at" | "apnea_level" | "payment_status" | "medical_certificate_ok" | "buddies_charter_signed" | "fsgt_insurance_ok";
type SortDirection = "asc" | "desc";

interface ImportError {
  line: number;
  email: string;
  reason: string;
}

// Seasonal form data (stored in membership_yearly_status)
interface SeasonalFormData {
  apnea_level: string;
  board_role: string;
  is_encadrant: boolean;
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
    upsertStatusBatch,
    deleteMemberStatus,
    deleteAllStatusForSeason,
  } = useMembershipYearlyStatus(selectedSeason);

  const { data: apneaLevels } = useApneaLevels();
  const apneaLevelCodes = useMemo(() => new Set(apneaLevels?.map(l => l.code) || []), [apneaLevels]);
  const apneaLevelsByFederation = useMemo(() => {
    if (!apneaLevels) return {};
    return apneaLevels.reduce((acc, level) => {
      const fed = level.federation || "Autre";
      if (!acc[fed]) acc[fed] = [];
      acc[fed].push(level);
      return acc;
    }, {} as Record<string, typeof apneaLevels>);
  }, [apneaLevels]);

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
  const [apneaLevelOpen, setApneaLevelOpen] = useState(false);
  const [filterEncadrant, setFilterEncadrant] = useState(false);
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

  // Identity form data (stored in club_members_directory)
  const [formData, setFormData] = useState<ClubMemberInsert>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    address: "",
    joined_at: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    gender: "",
    notes: "",
  });

  // Seasonal form data (stored in membership_yearly_status)
  const [seasonalFormData, setSeasonalFormData] = useState<SeasonalFormData>({
    apnea_level: "",
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
      joined_at: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      gender: "",
      notes: "",
    });
    setSeasonalFormData({
      apnea_level: "",
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
    // Identity data
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || "",
      birth_date: member.birth_date || "",
      address: member.address || "",
      joined_at: member.joined_at || "",
      emergency_contact_name: member.emergency_contact_name || "",
      emergency_contact_phone: member.emergency_contact_phone || "",
      gender: member.gender || "",
      notes: member.notes || "",
    });
    // Seasonal data from membership status
    const status = getStatusForMember(member.id);
    setSeasonalFormData({
      apnea_level: status?.apnea_level || "",
      board_role: status?.board_role || "",
      is_encadrant: status?.is_encadrant ?? false,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error("Prénom, nom et email sont obligatoires");
      return;
    }

    try {
      let memberId: string;
      
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          ...formData,
          email: formData.email.toLowerCase(),
        });
        memberId = editingMember.id;
      } else {
        const result = await createMember.mutateAsync({
          ...formData,
          email: formData.email.toLowerCase(),
        });
        memberId = result.id;
      }

      // Update seasonal data in membership_yearly_status
      await upsertStatusBatch.mutateAsync({
        memberId,
        updates: {
          apnea_level: seasonalFormData.apnea_level || null,
          board_role: seasonalFormData.board_role || null,
          is_encadrant: seasonalFormData.is_encadrant,
        },
      });
      
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemberStatus.mutateAsync(id);
      toast.success("Données saisonnières supprimées");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeleteConfirm(null);
  };

  // Toggle checkbox status - uses the yearly status table
  const handleCheckboxToggle = async (member: ClubMember, field: StatusField) => {
    const currentStatus = getStatusForMember(member.id);
    const currentValue = currentStatus?.[field as keyof MembershipYearlyStatus] ?? false;
    
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
    const value = status?.[field as keyof MembershipYearlyStatus];
    return typeof value === 'boolean' ? value : false;
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

  // CSV Export with seasonal columns
  const exportCSV = () => {
    if (!members?.length) {
      toast.error("Aucun adhérent à exporter");
      return;
    }

    const headers = [
      "member_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "birth_date",
      "address",
      "joined_at",
      "gender",
      "emergency_contact_name",
      "emergency_contact_phone",
      "apnea_level",
      "is_encadrant",
      "board_role",
      "payment_status",
      "medical_certificate_ok",
      "buddies_charter_signed",
      "fsgt_insurance_ok",
      "notes",
      "season",
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
        m.joined_at || "",
        m.gender || "",
        m.emergency_contact_name || "",
        m.emergency_contact_phone || "",
        status?.apnea_level || "",
        status?.is_encadrant ? "Oui" : "Non",
        status?.board_role || "",
        status?.payment_status ? "Oui" : "Non",
        status?.medical_certificate_ok ? "Oui" : "Non",
        status?.buddies_charter_signed ? "Oui" : "Non",
        status?.fsgt_insurance_ok ? "Oui" : "Non",
        m.notes || "",
        getSeasonLabel(selectedSeason),
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
      const rawText = await readCsvFileText(file);
      const parsed = parseCsvText(rawText);

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

      // Helper to parse boolean fields
      const parseBooleanField = (value: string | null): boolean => {
        if (!value) return false;
        const v = value.toLowerCase().trim();
        return v === "oui" || v === "true" || v === "1" || v === "yes" || v === "x";
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNumber = i + 2;

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
        const gender = cleanCsvCell((row as any).gender);
        const notes = cleanCsvCell((row as any).notes);
        
        // Seasonal fields
        const apneaLevel = cleanCsvCell((row as any).apnea_level);
        const boardRole = cleanCsvCell((row as any).board_role);
        const isEncadrant = parseBooleanField(cleanCsvCell((row as any).is_encadrant));
        const paymentStatus = parseBooleanField(cleanCsvCell((row as any).payment_status));
        const medicalCertificateOk = parseBooleanField(cleanCsvCell((row as any).medical_certificate_ok));
        const buddiesCharterSigned = parseBooleanField(cleanCsvCell((row as any).buddies_charter_signed));
        const fsgtInsuranceOk = parseBooleanField(cleanCsvCell((row as any).fsgt_insurance_ok));

        const birthRaw = cleanCsvCell((row as any).birth_date);
        const joinedRaw = cleanCsvCell((row as any).joined_at);

        const birthParsed = parseFlexibleDateToISO(birthRaw);
        if (birthRaw && birthParsed.error) reasons.push(`Date de naissance : ${birthParsed.error}`);

        const joinedParsed = parseFlexibleDateToISO(joinedRaw);
        if (joinedRaw && joinedParsed.error) reasons.push(`Date d'inscription : ${joinedParsed.error}`);

        // Emergency contact
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

        // Identity data only
        const memberData: ClubMemberInsert = {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          birth_date: birthParsed.iso,
          address,
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
          
          // Update seasonal fields in membership_yearly_status
          const memberId = result.data.id;
          if (memberId) {
            await upsertStatusBatch.mutateAsync({
              memberId,
              updates: {
                apnea_level: apneaLevel || null,
                board_role: boardRole || null,
                is_encadrant: isEncadrant,
                payment_status: paymentStatus,
                medical_certificate_ok: medicalCertificateOk,
                buddies_charter_signed: buddiesCharterSigned,
                fsgt_insurance_ok: fsgtInsuranceOk,
              },
            });
          }
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

  // Check if a member's dossier is complete (4 checkboxes + valid apnea level)
  const isMemberDossierComplete = (memberId: string): boolean => {
    const payment = getMemberStatusValue(memberId, "payment_status");
    const medical = getMemberStatusValue(memberId, "medical_certificate_ok");
    const charter = getMemberStatusValue(memberId, "buddies_charter_signed");
    const insurance = getMemberStatusValue(memberId, "fsgt_insurance_ok");
    const level = getStatusForMember(memberId)?.apnea_level;
    const hasValidLevel = !!level && apneaLevelCodes.has(level);
    return payment && medical && charter && insurance && hasValidLevel;
  };

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let result = members?.filter((member) => {
      // Only show members that have a status for the selected season
      const status = getStatusForMember(member.id);
      if (!status) return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        member.first_name.toLowerCase().includes(searchLower) ||
        member.last_name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.member_id.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;

      // Filter encadrants only
      if (filterEncadrant) {
        const status = getStatusForMember(member.id);
        if (!status?.is_encadrant) return false;
      }

      // Filter incomplete dossiers only
      if (filterIncomplete) {
        if (isMemberDossierComplete(member.id)) return false;
      }

      return true;
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
        case "apnea_level":
          aValue = getStatusForMember(a.id)?.apnea_level?.toLowerCase() || "";
          bValue = getStatusForMember(b.id)?.apnea_level?.toLowerCase() || "";
          break;
        default:
          aValue = (a as any)[sortField]?.toLowerCase() || "";
          bValue = (b as any)[sortField]?.toLowerCase() || "";
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
  }, [members, searchTerm, sortField, sortDirection, statuses, filterEncadrant, filterIncomplete, apneaLevelCodes]);

  const getRowClassName = (member: ClubMember) => {
    if (isMemberDossierComplete(member.id)) return "bg-green-50 dark:bg-green-950/20";
    const payment = getMemberStatusValue(member.id, "payment_status");
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

  // Count stats (based on members with a status for the selected season)
  const membersWithStatus = useMemo(() => {
    return members?.filter((m) => getStatusForMember(m.id)) || [];
  }, [members, statuses]);
  const totalCount = membersWithStatus.length;
  const encadrantCount = useMemo(() => {
    return membersWithStatus.filter((m) => getStatusForMember(m.id)?.is_encadrant).length;
  }, [membersWithStatus, statuses]);
  const completeRecordsCount = useMemo(() => {
    return membersWithStatus.filter((m) => isMemberDossierComplete(m.id)).length;
  }, [membersWithStatus, statuses, apneaLevelCodes]);
  const incompleteRecordsCount = totalCount - completeRecordsCount;
  const filteredCount = filteredAndSortedMembers?.length || 0;

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
              <Button
                onClick={() => setFilterEncadrant(!filterEncadrant)}
                variant={filterEncadrant ? "default" : "outline"}
                size="sm"
                title="Filtrer les encadrants"
              >
                <GraduationCap className="h-4 w-4 mr-1" />
                Encadrants
              </Button>
              <Button
                onClick={() => setFilterIncomplete(!filterIncomplete)}
                variant={filterIncomplete ? "default" : "outline"}
                size="sm"
                title="Filtrer les dossiers incomplets"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Incomplets
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1" />
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
              <Button onClick={() => setPurgeConfirmOpen(true)} variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1" />
                Purger la saison
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

        {/* Dynamic stats bar */}
        {membersWithStatus.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <Badge variant="secondary" className="text-xs">
              {(filterEncadrant || filterIncomplete) ? `${filteredCount} / ${totalCount}` : totalCount} adhérents
            </Badge>
            <Badge variant="secondary" className={cn("text-xs", filterEncadrant && "bg-primary text-primary-foreground")}>
              <GraduationCap className="h-3 w-3 mr-1" />
              {encadrantCount} encadrants
            </Badge>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              {completeRecordsCount} dossiers complets
            </Badge>
            <Badge variant="secondary" className={cn("text-xs bg-orange-100 text-orange-700", filterIncomplete && "bg-primary text-primary-foreground")}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {incompleteRecordsCount} incomplets
            </Badge>
            <Badge variant="secondary" className="text-xs text-green-600">
              {membersWithStatus.filter((m) => isEmailRegistered(m.email)).length} inscrits app
            </Badge>
          </div>
        )}

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
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("apnea_level")}
                  >
                    <div className="flex items-center">
                      Niveau
                      {getSortIcon("apnea_level")}
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
                      <TableCell className="text-sm">
                        {(() => {
                          const status = getStatusForMember(member.id);
                          const level = status?.apnea_level;
                          const isEncadrant = status?.is_encadrant;
                          if (!level && !isEncadrant) return <span className="text-muted-foreground">-</span>;
                          const isOfficial = level ? apneaLevelCodes.has(level) : false;
                          return (
                            <div className="flex items-center gap-1.5">
                              {level && (
                                <Badge
                                  variant={isOfficial ? "secondary" : "outline"}
                                  className={cn(
                                    "text-xs whitespace-nowrap",
                                    !isOfficial && "border-orange-400 bg-orange-50 text-orange-700"
                                  )}
                                  title={!isOfficial ? `"${level}" n'est pas un niveau officiel reconnu` : level}
                                >
                                  {!isOfficial && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {level}
                                </Badge>
                              )}
                              {isEncadrant && (
                                <span title="Encadrant" className="text-primary">
                                  <GraduationCap className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
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
                  <Label htmlFor="apnea_level">Niveau Apnée ({getSeasonLabel(selectedSeason)})</Label>
                  <Popover open={apneaLevelOpen} onOpenChange={setApneaLevelOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={apneaLevelOpen}
                        className={cn(
                          "w-full justify-between font-normal",
                          !seasonalFormData.apnea_level && "text-muted-foreground",
                          seasonalFormData.apnea_level && !apneaLevelCodes.has(seasonalFormData.apnea_level) && "border-orange-400 text-orange-700"
                        )}
                      >
                        {seasonalFormData.apnea_level ? (
                          <span className="flex items-center gap-1">
                            {!apneaLevelCodes.has(seasonalFormData.apnea_level) && (
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            )}
                            {seasonalFormData.apnea_level}
                          </span>
                        ) : (
                          "Rechercher un niveau..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un niveau..." />
                        <CommandList>
                          <CommandEmpty>Aucun niveau trouvé</CommandEmpty>
                          {Object.entries(apneaLevelsByFederation).map(([federation, levels]) => (
                            <CommandGroup key={federation} heading={federation}>
                              {levels.map((level) => (
                                <CommandItem
                                  key={level.code}
                                  value={`${level.code} ${level.name}`}
                                  onSelect={() => {
                                    setSeasonalFormData({ ...seasonalFormData, apnea_level: level.code });
                                    setApneaLevelOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      seasonalFormData.apnea_level === level.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="font-medium">{level.code}</span>
                                  {level.code !== level.name && (
                                    <span className="ml-1 text-muted-foreground text-xs">- {level.name}</span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                          {seasonalFormData.apnea_level && (
                            <CommandGroup>
                              <CommandItem
                                value="__clear__"
                                onSelect={() => {
                                  setSeasonalFormData({ ...seasonalFormData, apnea_level: "" });
                                  setApneaLevelOpen(false);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                Effacer le niveau
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {seasonalFormData.apnea_level && !apneaLevelCodes.has(seasonalFormData.apnea_level) && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Niveau non reconnu dans la table officielle
                    </p>
                  )}
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
                  <Label htmlFor="board_role">Rôle au Bureau ({getSeasonLabel(selectedSeason)})</Label>
                  <Select 
                    value={seasonalFormData.board_role || ""} 
                    onValueChange={(v) => setSeasonalFormData({ ...seasonalFormData, board_role: v === "none" ? "" : v })}
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
                  checked={seasonalFormData.is_encadrant ?? false}
                  onCheckedChange={(checked) => setSeasonalFormData({ ...seasonalFormData, is_encadrant: !!checked })}
                />
                <Label htmlFor="is_encadrant" className="text-sm font-medium cursor-pointer">
                  🤿 Est Encadrant ({getSeasonLabel(selectedSeason)})
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
                disabled={createMember.isPending || updateMember.isPending || upsertStatusBatch.isPending}
              >
                {(createMember.isPending || updateMember.isPending || upsertStatusBatch.isPending) && (
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
              <AlertDialogTitle>Supprimer les données de la saison {getSeasonLabel(selectedSeason)} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les données saisonnières de cet adhérent pour la saison {getSeasonLabel(selectedSeason)} seront supprimées (paiement, certificat médical, etc.). L'adhérent restera dans le fichier.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMemberStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Purge season confirmation */}
        <AlertDialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purger la saison {getSeasonLabel(selectedSeason)} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Tous les statuts des adhérents pour la saison {getSeasonLabel(selectedSeason)} seront supprimés
                (paiement, certificat médical, charte, assurance, niveau, etc.).
                Les données d'identité des adhérents et les autres saisons seront conservées.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await deleteAllStatusForSeason.mutateAsync();
                    toast.success(`Saison ${getSeasonLabel(selectedSeason)} purgée avec succès`);
                    setPurgeConfirmOpen(false);
                  } catch {
                    toast.error("Erreur lors de la purge de la saison");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAllStatusForSeason.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Purger
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
