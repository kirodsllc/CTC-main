import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ChartOfAccounts } from "@/components/accounting/ChartOfAccounts";

const Accounting = () => {
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-16">
        <Header />

        <main className="flex-1 p-4 overflow-auto">
          <div className="animate-fade-in">
            <ChartOfAccounts />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Accounting;
