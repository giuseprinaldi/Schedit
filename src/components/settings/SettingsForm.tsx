"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { positionLabel } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface SettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    position: string;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const res = await fetch(`/api/employees/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Profile updated!" });
    } catch {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const res = await fetch(`/api/employees/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.newPassword }),
      });
      if (!res.ok) throw new Error();
      resetPassword();
      toast({ title: "Password changed!" });
    } catch {
      toast({ title: "Error", description: "Failed to change password.", variant: "destructive" });
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
            {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {positionLabel(user.position as any)}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                {user.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: "profile" as const, label: "Profile", icon: User },
            { id: "security" as const, label: "Security", icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input {...registerProfile("name")} className={inputClass} />
              {profileErrors.name && <p className="mt-1 text-xs text-red-600">{profileErrors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input value={user.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
              <p className="mt-1 text-xs text-gray-400">Email cannot be changed here. Contact admin.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input {...registerProfile("phone")} type="tel" className={inputClass} placeholder="555-0100" />
            </div>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
            >
              {profileSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </form>
        )}

        {activeTab === "security" && (
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <input {...registerPassword("currentPassword")} type="password" className={inputClass} placeholder="••••••••" />
              {passwordErrors.currentPassword && <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input {...registerPassword("newPassword")} type="password" className={inputClass} placeholder="Min. 8 characters" />
              {passwordErrors.newPassword && <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input {...registerPassword("confirmPassword")} type="password" className={inputClass} placeholder="Repeat new password" />
              {passwordErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword.message}</p>}
            </div>
            <button
              type="submit"
              disabled={passwordSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
            >
              {passwordSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
