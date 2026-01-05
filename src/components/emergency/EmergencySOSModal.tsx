import { Phone, AlertTriangle, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParticipantEmergency {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  apnea_level: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantEmergency[];
  outingTitle: string;
}

const EmergencySOSModal = ({ isOpen, onClose, participants, outingTitle }: EmergencySOSModalProps) => {
  const formatPhoneForCall = (phone: string | null) => {
    if (!phone) return null;
    // Clean phone number and add country code if needed
    const cleaned = phone.replace(/[\s.\-]/g, "");
    if (cleaned.startsWith("0")) {
      return "+33" + cleaned.slice(1);
    }
    return cleaned;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Contacts d'urgence - {outingTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-destructive font-medium">
            En cas d'urgence, appelez d'abord le 15 (SAMU) ou le 112.
          </p>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {participants.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun participant présent
              </p>
            ) : (
              participants.map((participant) => {
                const initials = `${participant.first_name?.[0] ?? ""}${participant.last_name?.[0] ?? ""}`;
                const phoneForCall = formatPhoneForCall(participant.emergency_contact_phone);

                return (
                  <div
                    key={participant.id}
                    className="rounded-lg border border-border bg-card p-4 space-y-3"
                  >
                    {/* Participant info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {participant.first_name} {participant.last_name}
                        </p>
                        {participant.apnea_level && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {participant.apnea_level}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Emergency contact */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Contact d'urgence
                      </p>
                      
                      {participant.emergency_contact_name || participant.emergency_contact_phone ? (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">
                              {participant.emergency_contact_name || "Non renseigné"}
                            </p>
                            {participant.emergency_contact_phone && (
                              <p className="text-sm text-muted-foreground">
                                {participant.emergency_contact_phone}
                              </p>
                            )}
                          </div>
                          
                          {phoneForCall && (
                            <Button
                              variant="destructive"
                              size="sm"
                              asChild
                              className="shrink-0"
                            >
                              <a href={`tel:${phoneForCall}`}>
                                <Phone className="h-4 w-4 mr-1" />
                                Appeler
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Aucun contact d'urgence renseigné
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencySOSModal;
