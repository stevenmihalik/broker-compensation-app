"use client";

import toast from "react-hot-toast";  // ← Add THIS at the top with other imports
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";

export default function SuperAdminPage() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<"admin" | "superadmin" | null>(null);
    const [admins, setAdmins] = useState([]);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");


    useEffect(() => {
        supabase.auth.getSession().then(async ({ data }) => {
            if (!data.session) {
                router.push("/admin/login");
                return;
            }

            setSession(data.session);

            const user = await supabase.auth.getUser();
            const userRole = user.data.user?.user_metadata?.role;

            setRole(userRole);

            if (userRole !== "superadmin") {
                router.push("/admin/dashboard");
                return;
            }

            fetchAdmins();
        });
    }, []);

    async function fetchAdmins() {
        const res = await fetch("/api/admin/list");
        const data = await res.json();
        setAdmins(data.admins || []);
    }
    // NEW ADMIN
    async function handleAddAdmin(e: any) {
        e.preventDefault();

        const res = await fetch("/api/admin/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: newAdminEmail,
                password: newAdminPassword,
            }),
        });

        const data = await res.json();

        if (data.error) {
            toast.error("Failed to create admin: " + data.error);
            return;
        }

        toast.success("Admin created!");

        setNewAdminEmail("");
        setNewAdminPassword("");
        fetchAdmins();
    }

    // RESET PASSWORD
    async function resetPassword(user_id: string) {
        const newPassword = prompt("Enter a new password:");
        if (!newPassword) return;

        const res = await fetch("/api/admin/reset-password", {
            method: "POST",
            body: JSON.stringify({ user_id, new_password: newPassword }),
        });

        if (res.ok) {
            toast.success("Password reset!");
        } else {
            toast.error("Failed to reset password");
        }
    }

    // REMOVE ADMIN
    async function removeAdmin(user_id: string) {
        if (!confirm("Are you sure you want to remove this admin?")) return;

        const res = await fetch("/api/admin/delete", {
            method: "POST",
            body: JSON.stringify({ user_id }),
        });

        if (res.ok) {
            toast.success("Admin removed");
            fetchAdmins();
        } else {
            toast.error("Failed to remove admin");
        }
    }

    // UPDATE ADMIN ROLE (promote/demote)
    async function updateRole(user_id: string, new_role: string) {
        const res = await fetch("/api/admin/update-role", {
            method: "POST",
            body: JSON.stringify({ user_id, new_role }),
        });

        if (res.ok) {
            toast.success(`Role updated to ${new_role}`);
            fetchAdmins();
        } else {
            toast.error("Failed to update role");
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-blue-800">
                Super Admin Control Panel
            </h1>

            <p className="text-gray-700 mb-4">
                Signed in as <strong>{session?.user.email}</strong> ({role})
            </p>

            {/* ADD NEW ADMIN */}
            <div className="mt-8 border p-4 rounded bg-white shadow-sm">
                <h2 className="text-xl font-semibold mb-3">Add New Admin</h2>

                <form
                    onSubmit={handleAddAdmin}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium mb-1">New Admin Email</label>
                        <input
                            type="email"
                            autoComplete="off"
                            name="new-admin-email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Temporary Password</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            name="new-admin-password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Create Admin
                    </button>
                </form>
            </div>

            <div className="mt-8 border p-4 rounded bg-white shadow-sm">
                <h2 className="text-xl font-semibold mb-3">Admin Accounts</h2>

                <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Email</th>
                            <th className="p-2 border">Role</th>
                            <th className="p-2 border">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map((admin: any) => (
                            <tr key={admin.user_id}>
                                <td className="p-2 border">{admin.email}</td>
                                <td className="p-2 border">{admin.role}</td>
                                <td className="p-2 border space-x-3">

                                    <button
                                        onClick={() => resetPassword(admin.user_id)}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Reset Password
                                    </button>

                                    <button
                                        onClick={() => updateRole(admin.user_id, "superadmin")}
                                        className="text-green-600 hover:underline"
                                    >
                                        Promote
                                    </button>

                                    <button
                                        onClick={() => updateRole(admin.user_id, "admin")}
                                        className="text-yellow-600 hover:underline"
                                    >
                                        Demote
                                    </button>

                                    <button
                                        onClick={() => removeAdmin(admin.user_id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Remove
                                    </button>

                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
