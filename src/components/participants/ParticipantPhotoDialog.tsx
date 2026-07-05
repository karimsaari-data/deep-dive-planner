import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ParticipantPhotoDialogProps {
  participant: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
  onClose: () => void;
}

const ParticipantPhotoDialog = ({ participant, onClose }: ParticipantPhotoDialogProps) => {
  if (!participant) return null;
  const initials = `${participant.firstName.charAt(0)}${participant.lastName.charAt(0)}`.toUpperCase();

  return (
    <Dialog open={!!participant} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Avatar className="h-36 w-36">
              {participant.avatarUrl && (
                <AvatarImage
                  src={participant.avatarUrl}
                  alt={`${participant.firstName} ${participant.lastName}`}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <DialogTitle className="text-center leading-tight">
              <p className="font-semibold">{participant.firstName}</p>
              <p className="text-sm font-normal text-muted-foreground">{participant.lastName}</p>
            </DialogTitle>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantPhotoDialog;
