import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { VoucherManagement } from "@/components/vouchers/VoucherManagement";

const Vouchers = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-16">
        <Header />
        <main className="p-6">
          <VoucherManagement />
        </main>
      </div>
    </div>
  );
};

export default Vouchers;
