import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Reservations from "./pages/Reservations";
import Admin from "./pages/Admin";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";
import OutingDetail from "./pages/OutingDetail";
import OutingView from "./pages/OutingView";
import MemberManagement from "./pages/MemberManagement";
import Souvenirs from "./pages/Souvenirs";
import Archives from "./pages/Archives";
import Map from "./pages/Map";
import Weather from "./pages/Weather";
import Equipment from "./pages/Equipment";
import MesSorties from "./pages/MesSorties";
import LocationDetail from "./pages/LocationDetail";
import Trombinoscope from "./pages/Trombinoscope";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/outing/:id" element={<OutingView />} />
            <Route path="/outing/:id/manage" element={<OutingDetail />} />
            <Route path="/members" element={<MemberManagement />} />
            <Route path="/souvenirs" element={<Souvenirs />} />
            <Route path="/archives" element={<Archives />} />
            <Route path="/map" element={<Map />} />
            <Route path="/location/:id" element={<LocationDetail />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/mes-sorties" element={<MesSorties />} />
            <Route path="/trombinoscope" element={<Trombinoscope />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
