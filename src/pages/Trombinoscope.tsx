import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { useTrombinoscope, TrombiMember } from "@/hooks/useTrombinoscope";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Crown, GraduationCap, UserCircle, Mail, Phone, MessageCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatFirstName, formatLastName } from "@/lib/formatName";
import { getFishLevel, FISH_LEVELS } from "@/hooks/useTrombinoscope";
import ParticipantPhotoFrame from "@/components/participants/ParticipantPhotoFrame";

// Generate a pastel color from initials
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-rose-200", "bg-pink-200", "bg-fuchsia-200", "bg-purple-200",
    "bg-violet-200", "bg-indigo-200", "bg-blue-200", "bg-sky-200",
    "bg-cyan-200", "bg-teal-200", "bg-emerald-200", "bg-green-200",
    "bg-lime-200", "bg-yellow-200", "bg-amber-200", "bg-orange-200",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Check if member has top-tier qualification (BPJEPS/DEJEPS)
const hasTopTierQualification = (apneaLevel: string | null): boolean => {
  if (!apneaLevel) return false;
  const levelLower = apneaLevel.toLowerCase();
  return levelLower.includes("bpjeps") || levelLower.includes("dejeps");
};

// Normalize phone for tel: / WhatsApp links (strip spaces, dashes, dots; add +33 if French)
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return "+33" + digits.slice(1);
  }
  return digits;
};

interface ContactDialogProps {
  member: TrombiMember | null;
  onClose: () => void;
}

const ContactDialog = ({ member, onClose }: ContactDialogProps) => {
  if (!member) return null;
  const phone = member.phone ? normalizePhone(member.phone) : null;

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <ParticipantPhotoFrame
              firstName={member.first_name}
              lastName={member.last_name}
              avatarUrl={member.avatar_url}
            />
            <DialogTitle className="text-center leading-tight">
              <p className="font-semibold">{formatFirstName(member.first_name)}</p>
              <p className="text-sm font-normal text-muted-foreground">{formatLastName(member.last_name)}</p>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex gap-3 pt-2 justify-center">
          {member.email && (
            <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl" title={`Envoyer un email`}>
              <a href={`mailto:${member.email}`} className="flex flex-col items-center gap-1">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-[10px]">Email</span>
              </a>
            </Button>
          )}

          {phone && (
            <>
              <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl" title="Appeler">
                <a href={`tel:${phone}`} className="flex flex-col items-center gap-1">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-[10px]">Appeler</span>
                </a>
              </Button>

              <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl border-green-500 text-green-600 hover:bg-green-500 hover:text-white" title="WhatsApp">
                <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-[10px]">WhatsApp</span>
                </a>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MemberCardProps {
  member: TrombiMember;
  showBoardRole?: boolean;
  showTechnicalLevel?: boolean;
  onClick: (member: TrombiMember) => void;
}

const MemberCard = ({ member, showBoardRole = false, showTechnicalLevel = false, onClick }: MemberCardProps) => {
  const initials = getInitials(member.first_name, member.last_name);
  const avatarColor = getAvatarColor(member.first_name + member.last_name);
  const isTopTier = showTechnicalLevel && hasTopTierQualification(member.apnea_level);
  const isBureau = showBoardRole && !!member.board_role;
  const fish = getFishLevel(member.outings_count);

  // Ring: bureau/top-tier override fish color, else fish level
  const ringClass = isTopTier
    ? "ring-4 ring-amber-400 shadow-lg shadow-amber-400/30"
    : isBureau
    ? "ring-4 ring-primary shadow-lg shadow-primary/30"
    : `ring-4 ${fish.ring} shadow-lg ${fish.shadow}`;

  return (
    <button
      type="button"
      className="flex flex-col items-center text-center group cursor-pointer focus:outline-none"
      onClick={() => onClick(member)}
      title={`${fish.name} — ${member.outings_count} sortie${member.outings_count !== 1 ? "s" : ""} cette année`}
    >
      {/* Avatar */}
      <div className={`relative ${isTopTier ? "before:absolute before:inset-0 before:rounded-full before:bg-amber-400/40 before:blur-lg before:animate-pulse" : isBureau ? "before:absolute before:inset-0 before:rounded-full before:bg-primary/30 before:blur-lg before:animate-pulse" : ""}`}>
        <Avatar className={`h-20 w-20 md:h-24 md:w-24 transition-transform duration-200 md:group-hover:scale-110 relative z-10 ${ringClass}`}>
          {member.avatar_url ? (
            <AvatarImage src={member.avatar_url} alt={`${member.first_name} ${member.last_name}`} />
          ) : null}
          <AvatarFallback className={`${avatarColor} text-foreground font-semibold text-lg md:text-xl`}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <p className="mt-2 text-xs md:text-sm font-medium text-foreground truncate w-full">
        {formatFirstName(member.first_name)}
      </p>

      {/* Last name - hidden on mobile */}
      <p className="hidden md:block text-xs text-muted-foreground truncate w-full">
        {formatLastName(member.last_name)}
      </p>

      {/* Board role for bureau members */}
      {showBoardRole && member.board_role && (
        <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0">
          {member.board_role}
        </Badge>
      )}

      {/* Technical level for encadrants */}
      {showTechnicalLevel && member.apnea_level && (
        <Badge
          variant={isTopTier ? "default" : "outline"}
          className={`mt-1 text-[10px] px-1.5 py-0 font-semibold ${isTopTier ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : "border-primary text-primary"}`}
        >
          {member.apnea_level}
        </Badge>
      )}

      {/* Level badge for regular members - hidden on mobile */}
      {!showBoardRole && !showTechnicalLevel && member.apnea_level && (
        <Badge variant="secondary" className="hidden md:inline-flex mt-1 text-[10px] px-1.5 py-0">
          {member.apnea_level}
        </Badge>
      )}

      {/* Fish level badge — shown on desktop for all, hidden on mobile */}
      {member.outings_count > 0 && (
        <span className={`hidden md:inline-flex mt-1 text-[10px] px-1.5 py-0 rounded-full font-semibold ${fish.label} ${fish.bg}`}>
          {fish.name} · {member.outings_count}
        </span>
      )}
    </button>
  );
};

const MemberSkeleton = () => (
  <div className="flex flex-col items-center">
    <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
    <Skeleton className="h-3 w-16 mt-2" />
  </div>
);

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  members: TrombiMember[];
  showBoardRole?: boolean;
  showTechnicalLevel?: boolean;
  accentColor?: string;
  onMemberClick: (member: TrombiMember) => void;
}

const Section = ({
  title,
  icon,
  members,
  showBoardRole = false,
  showTechnicalLevel = false,
  accentColor = "bg-primary",
  onMemberClick,
}: SectionProps) => {
  if (!members.length) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accentColor}`} />
        {icon}
        {title}
        <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            showBoardRole={showBoardRole}
            showTechnicalLevel={showTechnicalLevel}
            onClick={onMemberClick}
          />
        ))}
      </div>
    </section>
  );
};

const filterMembers = (members: TrombiMember[], query: string): TrombiMember[] => {
  if (!query) return members;
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return members.filter((m) => {
    const full = `${m.first_name} ${m.last_name}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return full.includes(q);
  });
};

const Trombinoscope = () => {
  const { data, isLoading } = useTrombinoscope();
  const [selectedMember, setSelectedMember] = useState<TrombiMember | null>(null);
  const [search, setSearch] = useState("");

  const bureau = filterMembers(data?.bureau || [], search);
  const encadrants = filterMembers(data?.encadrants || [], search);
  const membres = filterMembers(data?.membres || [], search);
  const totalFiltered = bureau.length + encadrants.length + membres.length;

  return (
    <Layout>
      <div className="container mx-auto px-3 py-6 md:px-4 md:py-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trombinoscope</h1>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.total} membres` : "Chargement..."}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {search && !isLoading && (
          <p className="mb-4 text-sm text-muted-foreground">
            {totalFiltered} résultat{totalFiltered !== 1 ? "s" : ""} pour « {search} »
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <MemberSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <Section
              title="Le Bureau"
              icon={<Crown className="h-4 w-4 text-amber-500" />}
              members={bureau}
              showBoardRole={true}
              accentColor="bg-amber-500"
              onMemberClick={setSelectedMember}
            />

            <Section
              title="Encadrants"
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              members={encadrants}
              showTechnicalLevel={true}
              accentColor="bg-primary"
              onMemberClick={setSelectedMember}
            />

            <Section
              title="Membres"
              icon={<UserCircle className="h-4 w-4 text-muted-foreground" />}
              members={membres}
              accentColor="bg-muted-foreground"
              onMemberClick={setSelectedMember}
            />

            {search && totalFiltered === 0 && (
              <p className="text-center text-muted-foreground py-12">Aucun membre trouvé.</p>
            )}
          </>
        )}
      </div>

      {/* Fish level legend */}
      <div className="container mx-auto px-3 pb-8 md:px-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Niveaux — sorties de l'année</p>
          <div className="flex flex-wrap gap-3">
            {FISH_LEVELS.map((level) => (
              <div key={level.name} className="flex items-center gap-1.5">
                <span className={`h-3.5 w-3.5 rounded-full ${level.dot}`} />
                <span className={`text-xs font-medium ${level.label}`}>{level.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {level.min === 0 ? "0" : level.name === "Mérou" ? `${level.min}+` : `${level.min}–${FISH_LEVELS[FISH_LEVELS.indexOf(level) + 1].min - 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ContactDialog
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </Layout>
  );
};

export default Trombinoscope;
