import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFullName } from "@/lib/formatName";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Star } from "lucide-react";
import ParticipantPhotoDialog from "./ParticipantPhotoDialog";

interface ParticipantAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  memberStatus?: string | null;
  isOrganizer?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const badgeSizeClasses = {
  sm: "h-3.5 w-3.5 -bottom-0.5 -right-0.5",
  md: "h-4 w-4 -bottom-0.5 -right-0.5",
  lg: "h-5 w-5 -bottom-1 -right-1",
};

const ParticipantAvatar = ({
  firstName,
  lastName,
  avatarUrl,
  memberStatus,
  isOrganizer = false,
  size = "sm",
}: ParticipantAvatarProps) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = formatFullName(firstName, lastName);
  const isEncadrant = memberStatus === "Encadrant";
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative inline-block cursor-pointer focus:outline-none"
              onClick={() => setIsZoomed(true)}
            >
              <Avatar className={`${sizeClasses[size]} border-2 ${isOrganizer ? "border-amber-400" : "border-background"} shadow-sm`}>
                <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
                <AvatarFallback className={`text-xs font-medium ${isOrganizer ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOrganizer ? (
                <div
                  className={`absolute ${badgeSizeClasses[size]} flex items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background`}
                >
                  <Star className="h-2 w-2 fill-white" />
                </div>
              ) : isEncadrant ? (
                <div
                  className={`absolute ${badgeSizeClasses[size]} flex items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background`}
                >
                  <Shield className="h-2.5 w-2.5" />
                </div>
              ) : null}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{fullName}</p>
            {isOrganizer && (
              <p className="text-xs text-amber-500">Organisateur</p>
            )}
            {isEncadrant && (
              <p className="text-xs text-amber-500">Encadrant</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ParticipantPhotoDialog
        participant={isZoomed ? { firstName, lastName, avatarUrl } : null}
        onClose={() => setIsZoomed(false)}
      />
    </>
  );
};

export default ParticipantAvatar;
