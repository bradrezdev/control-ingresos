import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  ScreenHeader,
  SettingsButton,
  SegmentedControl,
} from "@/components/ui/design";
import { useDashboardSummary } from "./useDashboardSummary";
import type { SelectedMonth } from "./types";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DashboardError } from "./components/DashboardError";
import { UrgentNotice } from "./components/UrgentNotice";
import { HeroSection } from "./components/HeroSection";
import { CardPaymentsSection } from "./components/CardPaymentsSection";
import { FixedPaymentsSection } from "./components/FixedPaymentsSection";
import { MsiDebtSection } from "./components/MsiDebtSection";
import { RecentTransactionsSection } from "./components/RecentTransactionsSection";

export function DashboardScreen(): React.JSX.Element {
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>("current");
  const { summary, isLoading, error, retry } = useDashboardSummary(selectedMonth);

  const monthOptions = [
    { value: "current", label: summary?.currentMonthLabel ?? "Actual" },
    { value: "next", label: summary?.nextMonthLabel ?? "Siguiente" },
  ];

  if (error) {
    return (
      <PageContainer bare>
        <DashboardError onRetry={retry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer bare>
      {isLoading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <ScreenHeader
            title="Hola"
            eyebrow={summary.longDate}
            right={<SettingsButton />}
          />

          <SegmentedControl
            options={monthOptions}
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(value as SelectedMonth)}
          />

          {summary.urgentPayment ? (
            <UrgentNotice payment={summary.urgentPayment} currency={summary.currency} />
          ) : null}

          <HeroSection summary={summary} />
          <CardPaymentsSection summary={summary} />
          <FixedPaymentsSection summary={summary} />
          <MsiDebtSection summary={summary} />
          <RecentTransactionsSection summary={summary} />
        </div>
      )}
    </PageContainer>
  );
}
