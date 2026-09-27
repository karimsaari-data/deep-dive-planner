import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { formatFirstName, formatLastName } from "@/lib/formatName";
import ParticipantPhotoFrame from "@/components/participants/ParticipantPhotoFrame";

export interface ContactDialogMember {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  license_number?: string | null;
}

// Normalize phone for tel: / WhatsApp links (strip spaces, dashes, dots; add +33 if French)
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return "+33" + digits.slice(1);
  }
  return digits;
};

interface ContactDialogProps {
  member: ContactDialogMember | null;
  onClose: () => void;
}

// Fiche contact partagée (trombinoscope + historique adhérents) : photo,
// email/appel/WhatsApp.
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
            {member.license_number && (
              <Badge variant="outline" className="font-mono text-xs">
                N° licence {member.license_number}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex gap-3 pt-2 justify-center">
          {member.email && (
            <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl" title="Envoyer un email">
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

export default ContactDialog;
