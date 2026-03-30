import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { AvailabilityManager } from "@/components/availability/AvailabilityManager";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div>
      <Header title="Availability" subtitle="Set your weekly availability" />
      <div className="p-6">
        <AvailabilityManager userId={session.user.id} userRole={session.user.role} />
      </div>
    </div>
  );
}
