import Layout from "@/components/layout/Layout";
import { useTrombinoscope, TrombiMember } from "@/hooks/useTrombinoscope";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Crown, GraduationCap, UserCircle } from "lucide-react";
import { formatFirstName, formatLastName } from "@/lib/formatName";

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

interface MemberCardProps {
  member: TrombiMember;
  showBoardRole?: boolean;
  showTechnicalLevel?: boolean;
}

// Check if member has top-tier qualification (BPJEPS/DEJEPS)
const hasTopTierQualification = (apneaLevel: string | null): boolean => {
  if (!apneaLevel) return false;
  const levelLower = apneaLevel.toLowerCase();
  return levelLower.includes("bpjeps") || levelLower.includes("dejeps");
};

const MemberCard = ({ member, showBoardRole = false, showTechnicalLevel = false }: MemberCardProps) => {
  const initials = getInitials(member.first_name, member.last_name);
  const avatarColor = getAvatarColor(member.first_name + member.last_name);
  const isTopTier = showTechnicalLevel && hasTopTierQualification(member.apnea_level);
  const isBureau = showBoardRole && !!member.board_role;

  return (
    <div className="flex flex-col items-center text-center group">
      {/* Avatar with optional glow effect for BPJEPS/DEJEPS or bureau */}
      <div className={`relative ${isTopTier ? "before:absolute before:inset-0 before:rounded-full before:bg-amber-400/40 before:blur-lg before:animate-pulse" : isBureau ? "before:absolute before:inset-0 before:rounded-full before:bg-primary/30 before:blur-lg before:animate-pulse" : ""}`}>
        <Avatar className={`h-20 w-20 md:h-24 md:w-24 transition-transform duration-200 md:group-hover:scale-110 relative z-10 ${isTopTier ? "ring-4 ring-amber-400 shadow-lg shadow-amber-400/30" : isBureau ? "ring-4 ring-primary shadow-lg shadow-primary/30" : "ring-2 ring-border/50"}`}>
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
      
      {/* Technical level for encadrants - always visible, prominent display */}
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
    </div>
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
}

const Section = ({ 
  title, 
  icon, 
  members, 
  showBoardRole = false, 
  showTechnicalLevel = false,
  accentColor = "bg-primary" 
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
          />
        ))}
      </div>
    </section>
  );
};

const Trombinoscope = () => {
  const { data, isLoading } = useTrombinoscope();

  return (
    <Layout>
      <div className="container mx-auto px-3 py-6 md:px-4 md:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
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

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <MemberSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Bureau Section */}
            <Section
              title="Le Bureau"
              icon={<Crown className="h-4 w-4 text-amber-500" />}
              members={data?.bureau || []}
              showBoardRole={true}
              accentColor="bg-amber-500"
            />

            {/* Encadrants Section - Technical qualifications only */}
            <Section
              title="Encadrants"
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              members={data?.encadrants || []}
              showTechnicalLevel={true}
              accentColor="bg-primary"
            />

            {/* Members Section */}
            <Section
              title="Membres"
              icon={<UserCircle className="h-4 w-4 text-muted-foreground" />}
              members={data?.membres || []}
              accentColor="bg-muted-foreground"
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Trombinoscope;
