import { cn } from "@/lib/utils";

interface AppAccessDotProps {
  hasAccount: boolean;
  isBanned: boolean;
}

// Pastille compacte de statut d'accès app, à côté du nom dans les tableaux
// admin : gris = pas de compte, vert = compte actif, rouge = accès coupé.
export const AppAccessDot = ({ hasAccount, isBanned }: AppAccessDotProps) => {
  const color = !hasAccount
    ? "bg-muted-foreground/40"
    : isBanned
    ? "bg-destructive"
    : "bg-green-500";
  const title = !hasAccount
    ? "Pas de compte application"
    : isBanned
    ? "Compte application — accès coupé"
    : "Compte application actif";
  return <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", color)} title={title} />;
};
