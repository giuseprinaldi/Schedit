import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div>
      <Header title="Settings" subtitle="Manage your profile and preferences" />
      <div className="p-6 max-w-2xl">
        <SettingsForm user={session.user} />
      </div>
    </div>
  );
}
