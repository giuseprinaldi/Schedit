import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { TimeOffManager } from "@/components/time-off/TimeOffManager";

export const metadata: Metadata = { title: "Time Off" };

export default async function TimeOffPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div>
      <Header title="Time Off" subtitle="Request and manage time off" />
      <div className="p-6">
        <TimeOffManager userId={session.user.id} userRole={session.user.role} />
      </div>
    </div>
  );
}
