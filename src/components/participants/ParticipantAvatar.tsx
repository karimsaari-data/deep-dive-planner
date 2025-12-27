import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield } from "lucide-react";

interface ParticipantAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  memberStatus?: string | null;
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
  size = "sm",
}: ParticipantAvatarProps) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`;
  const isEncadrant = memberStatus === "Encadrant";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-block">
            <Avatar className={`${sizeClasses[size]} border-2 border-background shadow-sm`}>
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isEncadrant && (
              <div
                className={`absolute ${badgeSizeClasses[size]} flex items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background`}
              >
                <Shield className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{fullName}</p>
          {isEncadrant && (
            <p className="text-xs text-amber-500">Encadrant</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ParticipantAvatar;
