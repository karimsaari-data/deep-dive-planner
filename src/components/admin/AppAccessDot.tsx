import { cn } from "@/lib/utils";

interface AppAccessDotProps {
  hasAccount: boolean;
  isBanned: boolean;
}

// Pastille compacte de statut d'accès app, à côté du nom dans les tableaux
// admin : vert = accès actif (compte app + non banni), rouge = inactif
// (pas de compte, ou accès coupé).
export const AppAccessDot = ({ hasAccount, isBanned }: AppAccessDotProps) => {
  const active = hasAccount && !isBanned;
  const title = active
    ? "Accès app actif"
    : isBanned
    ? "Accès app coupé"
    : "Pas de compte application";
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", active ? "bg-green-500" : "bg-destructive")}
      title={title}
    />
  );
};
