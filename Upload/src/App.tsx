import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Parts from "./pages/Parts";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Manage from "./pages/Manage";
import PricingCostingPage from "./pages/PricingCosting";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Accounting from "./pages/Accounting";
import FinancialStatements from "./pages/FinancialStatements";
import Vouchers from "./pages/Vouchers";
import NotFound from "./pages/NotFound";
import AIChatBot from "./components/chatbot/AIChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/pricing-costing" element={<PricingCostingPage />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/financial-statements" element={<FinancialStatements />} />
            <Route path="/vouchers" element={<Vouchers />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  </QueryClientProvider>
);

export default App;
