"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, UserCheck, UserX, Edit2, Loader2 } from "lucide-react";
import { UserWithStats, POSITIONS } from "@/types";
import { cn, positionColor, positionLabel, getInitials, formatCurrency } from "@/lib/utils";
import { EmployeeModal } from "./EmployeeModal";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EmployeesManagerProps {
  userRole: string;
}

export function EmployeesManager({ userRole }: EmployeesManagerProps) {
  const [employees, setEmployees] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterActive, setFilterActive] = useState("true");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserWithStats | null>(null);

  const isAdmin = userRole === "ADMIN";

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterPosition) params.set("position", filterPosition);
      if (filterActive) params.set("isActive", filterActive);

      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmployees(data);
    } catch {
      toast({ title: "Error", description: "Failed to load employees.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, filterPosition, filterActive]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleToggleActive = async (employee: UserWithStats) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      if (!res.ok) throw new Error();
      setEmployees((prev) =>
        prev.map((e) => (e.id === employee.id ? { ...e, isActive: !e.isActive } : e))
      );
      toast({ title: `Employee ${employee.isActive ? "deactivated" : "activated"}` });
    } catch {
      toast({ title: "Error", description: "Failed to update employee.", variant: "destructive" });
    }
  };

  const handleSaveEmployee = (employee: UserWithStats) => {
    setEmployees((prev) => {
      const exists = prev.find((e) => e.id === employee.id);
      if (exists) return prev.map((e) => (e.id === employee.id ? employee : e));
      return [employee, ...prev];
    });
    setShowModal(false);
    setEditingEmployee(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Positions</option>
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{positionLabel(pos)}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>
        {isAdmin && (
          <button
            onClick={() => { setEditingEmployee(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500">No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Hired</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", positionColor(emp.position))}>
                        {positionLabel(emp.position)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{emp.phone ?? "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {emp.hourlyRate ? formatCurrency(emp.hourlyRate) + "/hr" : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {format(new Date(emp.hireDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingEmployee(emp); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleActive(emp)}
                            className={cn(
                              "p-1.5 rounded-lg transition",
                              emp.isActive
                                ? "hover:bg-red-50 text-gray-400 hover:text-red-500"
                                : "hover:bg-green-50 text-gray-400 hover:text-green-500"
                            )}
                            title={emp.isActive ? "Deactivate" : "Activate"}
                          >
                            {emp.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <EmployeeModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditingEmployee(null); }}
          onSave={handleSaveEmployee}
          editingEmployee={editingEmployee}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
