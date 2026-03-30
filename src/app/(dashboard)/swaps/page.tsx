import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { SwapRequestsManager } from "@/components/shifts/SwapRequestsManager";

export const metadata: Metadata = { title: "Shift Swaps" };

export default async function SwapsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div>
      <Header
        title="Shift Swaps"
        subtitle={session.user.role === "ADMIN" ? "Review and approve swap requests" : "Your swap and giveaway requests"}
      />
      <div className="p-6">
        <SwapRequestsManager userId={session.user.id} userRole={session.user.role} />
      </div>
    </div>
  );
}
