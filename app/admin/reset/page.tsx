"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PasswordResetPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [tokenChecked, setTokenChecked] = useState(false);

    // Check for valid password-reset session
    useEffect(() => {
        async function checkSession() {
            const { data } = await supabase.auth.getSession();

            if (!data.session) {
                toast.error("Invalid reset link or expired session.");
            }

            setTokenChecked(true);
        }

        checkSession();
    }, []);

    async function handleSubmit(e: any) {
        e.preventDefault();

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Password updated! Redirecting to login...");
        setTimeout(() => router.push("/admin/login"), 1500);
    }

    if (!tokenChecked) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Validating reset link…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="bg-white p-6 rounded shadow max-w-md w-full">
                <h1 className="text-2xl font-bold mb-4 text-center text-blue-800">
                    Reset Your Password
                </h1>

                <p className="text-gray-700 mb-4 text-center">
                    Enter a new password to complete the reset.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">New Password</label>
                        <input
                            type="password"
                            className="w-full border p-2 rounded"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
                    >
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}
