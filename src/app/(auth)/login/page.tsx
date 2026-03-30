import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";
import { ChefHat } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Schedit account",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <ChefHat className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Schedit</h1>
          <p className="text-slate-400 mt-1 text-sm">Restaurant Staff Scheduling</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to manage your schedule</p>
          <LoginForm />
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Schedit. All rights reserved.
        </p>
      </div>
    </div>
  );
}
