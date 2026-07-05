import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ParticipantPhotoFrame from "./ParticipantPhotoFrame";

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

  return (
    <Dialog open={!!participant} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <ParticipantPhotoFrame
              firstName={participant.firstName}
              lastName={participant.lastName}
              avatarUrl={participant.avatarUrl}
            />
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
