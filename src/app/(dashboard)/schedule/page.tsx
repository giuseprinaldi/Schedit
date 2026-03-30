import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { WeeklySchedule } from "@/components/schedule/WeeklySchedule";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div>
      <Header
        title="Schedule"
        subtitle="Manage and view staff schedules"
      />
      <div className="p-6">
        <WeeklySchedule userRole={session.user.role} userId={session.user.id} />
      </div>
    </div>
  );
}
