import { ReactNode } from "react";
import Header from "./Header";
interface LayoutProps {
  children: ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  return <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/50 bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">© 2026 TO2 Tous droits réservés.</div>
      </footer>
    </div>;
};
export default Layout;