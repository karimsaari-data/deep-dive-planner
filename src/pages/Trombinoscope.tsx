import Layout from "@/components/layout/Layout";
import { useTrombinoscope, TrombiMember } from "@/hooks/useTrombinoscope";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

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
}

const MemberCard = ({ member }: MemberCardProps) => {
  const initials = getInitials(member.first_name, member.last_name);
  const avatarColor = getAvatarColor(member.first_name + member.last_name);

  return (
    <div className="flex flex-col items-center text-center group">
      <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-2 ring-border/50 transition-transform duration-200 md:group-hover:scale-110">
        <AvatarImage 
          src={member.avatar_url || undefined} 
          alt={member.first_name}
          loading="lazy"
          className="object-cover"
        />
        <AvatarFallback className={`${avatarColor} text-foreground font-semibold text-lg md:text-xl`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <p className="mt-2 text-xs md:text-sm font-medium text-foreground truncate w-full">
        {member.first_name}
      </p>
      
      {/* Last name - hidden on mobile */}
      <p className="hidden md:block text-xs text-muted-foreground truncate w-full">
        {member.last_name}
      </p>
      
      {/* Level badge - hidden on mobile */}
      {member.apnea_level && (
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
              {data ? `${data.encadrants.length + data.membres.length} membres` : "Chargement..."}
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
            {/* Encadrants Section */}
            {data?.encadrants && data.encadrants.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Encadrants
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                  {data.encadrants.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </section>
            )}

            {/* Members Section */}
            {data?.membres && data.membres.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  Membres
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                  {data.membres.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Trombinoscope;
