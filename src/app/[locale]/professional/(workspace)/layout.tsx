import type { ReactNode } from "react";

import { ProfessionalDashboardSidebar } from "@/components/ui/dashboard-with-collapsible-sidebar";
import { requireSpecialist } from "@/lib/professional/auth";

export default async function ProfessionalWorkspaceLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const professional = await requireSpecialist(locale);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
      <ProfessionalDashboardSidebar
        brand="FairSettle"
        locale={locale}
        userName={professional.fullName || "Professional"}
        userEmail={professional.email}
        backToSiteLabel="Back to site"
      >
        {children}
      </ProfessionalDashboardSidebar>
    </main>
  );
}
