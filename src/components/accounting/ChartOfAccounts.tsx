import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainGroupsTab } from "./MainGroupsTab";
import { SubgroupsTab } from "./SubgroupsTab";
import { AccountsTab } from "./AccountsTab";
import { JournalEntriesTab } from "./JournalEntriesTab";
import { GeneralLedgerTab } from "./GeneralLedgerTab";
import { TrialBalanceTab } from "./TrialBalanceTab";
import { IncomeStatementTab } from "./IncomeStatementTab";
import { BalanceSheetTab } from "./BalanceSheetTab";
import DailyClosingTab from "./DailyClosingTab";

export const ChartOfAccounts = () => {
  const [activeTab, setActiveTab] = useState("main-groups");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger 
            value="main-groups" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Main Groups
          </TabsTrigger>
          <TabsTrigger 
            value="subgroups"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Subgroups
          </TabsTrigger>
          <TabsTrigger 
            value="accounts"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Accounts
          </TabsTrigger>
          <TabsTrigger 
            value="journal-entries"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Journal Entries
          </TabsTrigger>
          <TabsTrigger 
            value="general-ledger"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> General Ledger
          </TabsTrigger>
          <TabsTrigger 
            value="trial-balance"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Trial Balance
          </TabsTrigger>
          <TabsTrigger 
            value="income-statement"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Income Statement
          </TabsTrigger>
          <TabsTrigger 
            value="balance-sheet"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Balance Sheet
          </TabsTrigger>
          <TabsTrigger 
            value="daily-closing"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 transition-all duration-200"
          >
            <span className="mr-1">λ</span> Daily Closing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main-groups" className="animate-fade-in mt-4">
          <MainGroupsTab />
        </TabsContent>

        <TabsContent value="subgroups" className="animate-fade-in mt-4">
          <SubgroupsTab />
        </TabsContent>

        <TabsContent value="accounts" className="animate-fade-in mt-4">
          <AccountsTab />
        </TabsContent>

        <TabsContent value="journal-entries" className="animate-fade-in mt-4">
          <JournalEntriesTab />
        </TabsContent>

        <TabsContent value="general-ledger" className="animate-fade-in mt-4">
          <GeneralLedgerTab />
        </TabsContent>

        <TabsContent value="trial-balance" className="animate-fade-in mt-4">
          <TrialBalanceTab />
        </TabsContent>

        <TabsContent value="income-statement" className="animate-fade-in mt-4">
          <IncomeStatementTab />
        </TabsContent>

        <TabsContent value="balance-sheet" className="animate-fade-in mt-4">
          <BalanceSheetTab />
        </TabsContent>

        <TabsContent value="daily-closing" className="animate-fade-in mt-4">
          <DailyClosingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
