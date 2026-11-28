import { ReactNode } from "react";
import { Mail } from "lucide-react";
import Header from "./Header";
import LicenseReminderBanner from "./LicenseReminderBanner";
import { usePhotoReminder } from "@/hooks/usePhotoReminder";
interface LayoutProps {
  children: ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  usePhotoReminder();
  return <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <LicenseReminderBanner />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/50 bg-card/50 py-6">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-1.5 px-4 text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>Un bug, une suggestion{"\u00A0"}? Écris à</span>
          </span>
          <a href="mailto:contact@karimsaari.com" className="tap-link underline hover:text-foreground">
            contact@karimsaari.com
          </a>
        </div>
      </footer>
    </div>;
};
export default Layout;