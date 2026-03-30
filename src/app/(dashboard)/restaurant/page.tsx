import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { RestaurantSettingsForm } from "@/components/restaurant/RestaurantSettingsForm";

export const metadata: Metadata = { title: "Restaurant Settings" };

export default async function RestaurantPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <Header title="Restaurant Settings" subtitle="Configure your restaurant details, hours, and shift structure" />
      <div className="p-6">
        <RestaurantSettingsForm />
      </div>
    </div>
  );
}
