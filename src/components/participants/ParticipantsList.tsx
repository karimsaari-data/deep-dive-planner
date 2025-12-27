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
}

const ParticipantsList = ({
  participants,
  maxVisible = 6,
  size = "sm",
  showNames = false,
}: ParticipantsListProps) => {
  if (participants.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Aucun participant inscrit
      </p>
    );
  }

  // Sort: Encadrants first, then by first_name
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.member_status === "Encadrant" && b.member_status !== "Encadrant") return -1;
    if (a.member_status !== "Encadrant" && b.member_status === "Encadrant") return 1;
    return a.first_name.localeCompare(b.first_name);
  });

  const visibleParticipants = sortedParticipants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  if (showNames) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3">
          {visibleParticipants.map((participant) => (
            <div key={participant.id} className="flex flex-col items-center gap-1">
              <ParticipantAvatar
                firstName={participant.first_name}
                lastName={participant.last_name}
                avatarUrl={participant.avatar_url}
                memberStatus={participant.member_status}
                size={size}
              />
              <span className="text-xs text-muted-foreground text-center max-w-[60px] truncate">
                {participant.first_name}
              </span>
            </div>
          ))}
        </div>
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
