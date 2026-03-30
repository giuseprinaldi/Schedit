import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { AdminScheduleBuilder } from "@/components/schedule/AdminScheduleBuilder";
import { EmployeeScheduleFeed } from "@/components/schedule/EmployeeScheduleFeed";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div>
      <Header
        title="Schedule"
        subtitle={isAdmin ? "Build and publish the weekly staff schedule" : "Your weekly schedule"}
      />
      <div className="p-6">
        {isAdmin ? (
          <AdminScheduleBuilder currentUserId={session.user.id} />
        ) : (
          <EmployeeScheduleFeed userId={session.user.id} />
        )}
      </div>
    </div>
  );
}
