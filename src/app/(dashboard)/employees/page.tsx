import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { EmployeesManager } from "@/components/employees/EmployeesManager";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  return (
    <div>
      <Header title="Employees" subtitle="Manage your restaurant staff" />
      <div className="p-6">
        <EmployeesManager userRole={session.user.role} />
      </div>
    </div>
  );
}
