import { Shield, Users } from "lucide-react";
import ParticipantAvatar from "./ParticipantAvatar";

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  member_status?: string | null;
}

interface ParticipantsListProps {
  participants: Participant[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  showNames?: boolean;
  organizerId?: string | null;
}

const ParticipantsList = ({
  participants,
  maxVisible = 6,
  size = "sm",
  showNames = false,
  organizerId,
}: ParticipantsListProps) => {
  if (participants.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aucun participant inscrit
      </p>
    );
  }

  // Sort: organizer first, then encadrants, then by first_name
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsOrg = organizerId ? a.id === organizerId : false;
    const bIsOrg = organizerId ? b.id === organizerId : false;
    if (aIsOrg && !bIsOrg) return -1;
    if (!aIsOrg && bIsOrg) return 1;
    if (a.member_status === "Encadrant" && b.member_status !== "Encadrant") return -1;
    if (a.member_status !== "Encadrant" && b.member_status === "Encadrant") return 1;
    return a.first_name.localeCompare(b.first_name);
  });

  const visibleParticipants = sortedParticipants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  if (showNames) {
    const encadrants = visibleParticipants.filter(
      p => p.member_status === "Encadrant" || (organizerId && p.id === organizerId)
    );
    const regularParticipants = visibleParticipants.filter(
      p => p.member_status !== "Encadrant" && !(organizerId && p.id === organizerId)
    );
    const renderAvatar = (participant: Participant) => (
      <div key={participant.id} className="flex flex-col items-center gap-1">
        <ParticipantAvatar
          firstName={participant.first_name}
          lastName={participant.last_name}
          avatarUrl={participant.avatar_url}
          memberStatus={participant.member_status}
          isOrganizer={organizerId ? participant.id === organizerId : false}
          size={size}
        />
        <span className="text-xs text-muted-foreground text-center max-w-[60px] truncate">
          {participant.first_name}
        </span>
      </div>
    );

    return (
      <div className="space-y-2">
        {encadrants.length > 0 ? (
          <>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 flex items-center gap-1 mb-1.5">
                <Shield className="h-3 w-3" />
                Encadrant{encadrants.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {encadrants.map(renderAvatar)}
              </div>
            </div>
            {regularParticipants.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Users className="h-3 w-3" />
                  Participants
                </p>
                <div className="flex flex-wrap gap-3">
                  {regularParticipants.map(renderAvatar)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            {visibleParticipants.map(renderAvatar)}
          </div>
        )}
        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground">
            +{remainingCount} autres participants
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant) => (
          <ParticipantAvatar
            key={participant.id}
            firstName={participant.first_name}
            lastName={participant.last_name}
            avatarUrl={participant.avatar_url}
            memberStatus={participant.member_status}
            isOrganizer={organizerId ? participant.id === organizerId : false}
            size={size}
          />
        ))}
      </div>
      {remainingCount > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default ParticipantsList;
