"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LogsComponent from "./components/LogsComponent";
import { logActivity } from "@/lib/logActivity";

export default function SuperAdminPage() {
    const router = useRouter();

    // AUTH + ROLE
    const [session, setSession] = useState<any>(null);
    const [role, setRole] = useState("");

    // Sidebar Navigation
    const [activePage, setActivePage] = useState<"listings" | "admins" | "logs">("listings");

    // Listings Data
    const [listings, setListings] = useState<any[]>([]);
    const [loadingListings, setLoadingListings] = useState(true);

    // Add Listing Form
    const [mlsId, setMlsId] = useState("");
    const [compensation, setCompensation] = useState("");
    const [address, setAddress] = useState("");
    const [brokerName, setBrokerName] = useState("");
    const [brokerEmail, setBrokerEmail] = useState("");
    const [brokerPhone, setBrokerPhone] = useState("");
    const [listingAgent, setListingAgent] = useState("");
    const [listingAgentPhone, setListingAgentPhone] = useState("");
    const [listingAgentEmail, setListingAgentEmail] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Edit Listing
    const [editing, setEditing] = useState(false);
    const [editRow, setEditRow] = useState<any>(null);
    const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
    const [originalRow, setOriginalRow] = useState<any>(null);

    // Admin Management
    const [admins, setAdmins] = useState<any[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");

    // AUTH CHECK
    useEffect(() => {
        supabase.auth.getSession().then(async ({ data }) => {
            if (!data.session) {
                router.push("/admin/login");
                return;
            }

            setSession(data.session);

            const { data: userData } = await supabase.auth.getUser();
            const userRole = userData?.user?.user_metadata?.role;

            if (userRole !== "superadmin") {
                router.push("/admin/dashboard");
                return;
            }

            setRole(userRole);
            fetchListings();
            fetchAdmins();
        });
    }, []);

    /* --------------------------- LISTINGS FUNCTIONS --------------------------- */

    async function fetchListings() {
        setLoadingListings(true);

        const { data, error } = await supabase
            .from("listings")
            .select("*")
            .order("uploaded_at", { ascending: false });

        if (error) {
            toast.error("Failed to load listings.");
            setLoadingListings(false);
            return;
        }

        setListings(data || []);
        setLoadingListings(false);
    }

    // Add Listing
    async function handleAddListing(e: any) {
        e.preventDefault();

        if (!pdfFile) {
            toast.error("Please upload a PDF file.");
            return;
        }

        const filePath = `${mlsId}.pdf`;

        const { error: pdfError } = await supabase.storage
            .from("broker_agreements")
            .upload(filePath, pdfFile, { upsert: true });

        if (pdfError) {
            toast.error("PDF upload failed: " + pdfError.message);
            return;
        }

        const { error: insertError } = await supabase.from("listings").insert([
            {
                mls_id: mlsId,
                compensation,
                address,
                broker_name: brokerName,
                broker_email: brokerEmail,
                broker_phone: brokerPhone,
                listing_agent: listingAgent,
                listing_agent_phone: listingAgentPhone,
                listing_agent_email: listingAgentEmail,
                pdf_path: filePath,
            },
        ]);

        if (insertError) {
            toast.error("Failed to insert listing: " + insertError.message);
            return;
        }

        setMlsId("");
        setCompensation("");
        setAddress("");
        setBrokerName("");
        setBrokerEmail("");
        setBrokerPhone("");
        setListingAgent("");
        setListingAgentPhone("");
        setListingAgentEmail("");
        setPdfFile(null);

        if (fileInputRef.current) fileInputRef.current.value = "";

        toast.success("Listing added!");
        fetchListings();
        await logActivity({
            user_id: session.user.id,
            user_email: session.user.email!,
            action: "Created Listing",
            details: `
        MLS: ${mlsId}
        Address: ${address}
        Compensation: ${compensation}
        Broker Name: ${brokerName}
        Broker Email: ${brokerEmail}
        Broker Phone: ${brokerPhone}
        Listing Agent: ${listingAgent || "N/A"}
        Listing Agent Phone: ${listingAgentPhone || "N/A"}
        Listing Agent Email: ${listingAgentEmail || "N/A"}
        PDF Path: ${filePath}
    `.trim(),
        });
    }

    // Edit Listing
    function startEdit(row: any) {
        setOriginalRow({ ...row });   // ← save original values
        setEditRow({ ...row });       // ← editable copy
        setEditing(true);
    }

    async function handleSaveEdit(e: any) {
        e.preventDefault();

        const updateFields = {
            mls_id: editRow.mls_id,
            compensation: editRow.compensation,
            address: editRow.address,
            broker_name: editRow.broker_name,
            broker_email: editRow.broker_email,
            broker_phone: editRow.broker_phone,
            listing_agent: editRow.listing_agent,
            listing_agent_phone: editRow.listing_agent_phone,
            listing_agent_email: editRow.listing_agent_email,
        };

        const { error } = await supabase
            .from("listings")
            .update(updateFields)
            .eq("id", editRow.id);

        if (error) {
            toast.error("Update failed: " + error.message);
            return;
        }

        if (editPdfFile) {
            const { error: pdfErr } = await supabase.storage
                .from("broker_agreements")
                .upload(editRow.pdf_path, editPdfFile, { upsert: true });

            if (pdfErr) {
                toast.error("PDF update failed: " + pdfErr.message);
                return;
            }
        }

        setEditing(false);
        setEditPdfFile(null);
        setEditRow(null);

        toast.success("Listing updated!");
        fetchListings();
        // Determine "before" and "after" field values
        const before = {
            mls_id: originalRow.mls_id,
            compensation: originalRow.compensation,
            address: originalRow.address,
            broker_name: originalRow.broker_name,
            broker_email: originalRow.broker_email,
            broker_phone: originalRow.broker_phone,
            listing_agent: originalRow.listing_agent,
            listing_agent_phone: originalRow.listing_agent_phone,
            listing_agent_email: originalRow.listing_agent_email,
        };

        const after = {
            mls_id: editRow.mls_id,
            compensation: editRow.compensation,
            address: editRow.address,
            broker_name: editRow.broker_name,
            broker_email: editRow.broker_email,
            broker_phone: editRow.broker_phone,
            listing_agent: editRow.listing_agent,
            listing_agent_phone: editRow.listing_agent_phone,
            listing_agent_email: editRow.listing_agent_email,
        };

        // Create a diff summary text
        function generateChanges(before: any, after: any) {
            const changes = [];
            for (const key in before) {
                if (before[key] !== after[key]) {
                    changes.push(`${key}: "${before[key]}" → "${after[key]}"`);
                }
            }
            return changes.length ? changes.join("\n") : "No changed fields.";
        }

        const diffText = generateChanges(before, after);

        await logActivity({
            user_id: session.user.id,
            user_email: session.user.email!,
            action: "Updated Listing",
            details: `
        Listing ID: ${editRow.id}

        Changes:
        ${diffText}

        Full Before:
        ${JSON.stringify(before, null, 2)}

        Full After:
        ${JSON.stringify(after, null, 2)}
        `.trim(),
        });
    }

    // Delete Listing
    async function deleteListing(id: string, pdfPath: string) {
        if (!confirm("Delete this listing?")) return;

        await supabase.from("listings").delete().eq("id", id);

        await supabase.storage.from("broker_agreements").remove([pdfPath]);

        toast.success("Listing deleted.");
        fetchListings();
        await logActivity({
            user_id: session.user.id,
            user_email: session.user.email!,
            action: "Deleted Listing",
            details: `MLS: ${mlsId}`,
        });
    }

    /* --------------------------- ADMIN FUNCTIONS --------------------------- */

    async function fetchAdmins() {
        const res = await fetch("/api/admin/list");
        const data = await res.json();
        setAdmins(data.admins || []);
    }

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

    async function removeAdmin(user_id: string) {
        if (!confirm("Remove this admin?")) return;

        const res = await fetch("/api/admin/remove", {
            method: "POST",
            body: JSON.stringify({ user_id }),
        });

        const data = await res.json();

        if (data.error) {
            toast.error(data.error);
            return;
        }

        toast.success("Admin removed.");
        fetchAdmins();
    }

    // RESET PASSWORD
    async function resetPassword(user_id: string) {
        const res = await fetch("/api/admin/reset-password", {
            method: "POST",
            body: JSON.stringify({ user_id }),
        });

        const data = await res.json();

        if (data.error) {
            toast.error(data.error);
            return;
        }

        toast.success("Password reset email sent.");
    }

    // PROMOTE ADMIN → SUPERADMIN
    async function promoteAdmin(user_id: string) {
        const res = await fetch("/api/admin/promote", {
            method: "POST",
            body: JSON.stringify({ user_id }),
        });

        const data = await res.json();

        if (data.error) {
            toast.error(data.error);
            return;
        }

        toast.success("User promoted to Super Admin.");
        fetchAdmins();
    }

    // DEMOTE SUPERADMIN → ADMIN
    async function demoteAdmin(user_id: string) {
        const res = await fetch("/api/admin/demote", {
            method: "POST",
            body: JSON.stringify({ user_id }),
        });

        const data = await res.json();

        if (data.error) {
            toast.error(data.error);
            return;
        }

        toast.success("User demoted to Admin.");
        fetchAdmins();
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/admin/login");
    }

    /* --------------------------- UI RENDER --------------------------- */

    return (
        <div className="flex min-h-screen bg-gray-100">

            {/* SIDEBAR */}
            <aside className="w-64 bg-[#0C2749] text-white flex flex-col shadow-lg">
                <div className="text-2xl font-bold p-6 border-b border-blue-900">
                    Super Admin
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        className={`w-full text-left p-3 rounded ${activePage === "listings" ? "bg-blue-700" : "hover:bg-blue-800"
                            }`}
                        onClick={() => setActivePage("listings")}
                    >
                        📄 Listings
                    </button>

                    <button
                        className={`w-full text-left p-3 rounded ${activePage === "admins" ? "bg-blue-700" : "hover:bg-blue-800"
                            }`}
                        onClick={() => setActivePage("admins")}
                    >
                        👥 Admin Management
                    </button>

                    <button
                        className={`w-full text-left p-3 rounded ${activePage === "logs" ? "bg-blue-700" : "hover:bg-blue-800"
                            }`}
                        onClick={() => setActivePage("logs")}
                    >
                        📜 Logs (coming soon)
                    </button>
                </nav>

                <div className="p-4 border-t border-blue-900 text-sm opacity-80">
                    <p>Signed in as:</p>
                    <p className="font-semibold">{session?.user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="m-4 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-center"
                >
                    🚪 Logout
                </button>

            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">

                {activePage === "listings" && (
                    <>
                        <h1 className="text-3xl font-bold mb-6 text-[#0C2749]">
                            Listings Management
                        </h1>

                        {/* ADD LISTING FORM */}
                        <form
                            onSubmit={handleAddListing}
                            className="bg-white p-6 rounded shadow-md space-y-4 mb-10"
                        >
                            <h2 className="text-xl font-semibold">Add New Listing</h2>

                            <div>
                                <label className="block mb-1">MLS ID</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={mlsId}
                                    onChange={(e) => setMlsId(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Compensation</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={compensation}
                                    onChange={(e) => setCompensation(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Address</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Broker Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={brokerName}
                                    onChange={(e) => setBrokerName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Broker Email</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    type="email"
                                    value={brokerEmail}
                                    onChange={(e) => setBrokerEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Broker Phone</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={brokerPhone}
                                    onChange={(e) => setBrokerPhone(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Listing Agent</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={listingAgent}
                                    onChange={(e) => setListingAgent(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Listing Agent Phone</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={listingAgentPhone}
                                    onChange={(e) => setListingAgentPhone(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Listing Agent Email</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    type="email"
                                    value={listingAgentEmail}
                                    onChange={(e) => setListingAgentEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block mb-1">PDF File</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="w-full"
                                    accept="application/pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Add Listing
                            </button>
                        </form>

                        {/* LISTINGS TABLE */}
                        <h2 className="text-2xl font-semibold mb-4">Existing Listings</h2>

                        {loadingListings ? (
                            <p>Loading…</p>
                        ) : (
                            <ul className="space-y-3">
                                {listings.map((row) => (
                                    <li
                                        key={row.id}
                                        className="bg-white p-4 rounded shadow flex justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold">{row.mls_id}</p>
                                            <p className="text-sm">{row.address}</p>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                className="text-blue-600"
                                                onClick={() => startEdit(row)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="text-red-600"
                                                onClick={() =>
                                                    deleteListing(row.id, row.pdf_path)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                    </>
                )}

                {/* ADMIN MANAGEMENT */}
                {activePage === "admins" && (
                    <>
                        <h1 className="text-3xl font-bold mb-6 text-[#0C2749]">
                            Admin Management
                        </h1>

                        {/* Add Admin Form */}
                        <form
                            onSubmit={handleAddAdmin}
                            className="bg-white p-6 rounded shadow space-y-4 mb-6"
                            autoComplete="off"
                        >
                            <h2 className="text-xl font-semibold mb-2">Add New Admin</h2>

                            <div>
                                <label className="block mb-1">Email</label>
                                <input
                                    type="email"
                                    name="new-admin-email"
                                    autoComplete="off"
                                    className="w-full border p-2 rounded"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block mb-1">Temporary Password</label>
                                <input
                                    type="password"
                                    name="new-admin-password"
                                    autoComplete="new-password"
                                    className="w-full border p-2 rounded"
                                    value={newAdminPassword}
                                    onChange={(e) => setNewAdminPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Create Admin
                            </button>
                        </form>

                        {/* Admins List */}
                        <h2 className="text-xl font-semibold mb-3">Existing Admins</h2>

                        <table className="w-full border-collapse bg-white rounded shadow">
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

                                            {/* RESET PASSWORD */}
                                            <button
                                                className="text-blue-600"
                                                onClick={() => resetPassword(admin.user_id)}
                                            >
                                                Reset Password
                                            </button>

                                            {/* PROMOTE */}
                                            {admin.role === "admin" && (
                                                <button
                                                    className="text-green-600"
                                                    onClick={() => promoteAdmin(admin.user_id)}
                                                >
                                                    Promote
                                                </button>
                                            )}

                                            {/* DEMOTE */}
                                            {admin.role === "superadmin" && (
                                                <button
                                                    className="text-yellow-600"
                                                    onClick={() => demoteAdmin(admin.user_id)}
                                                >
                                                    Demote
                                                </button>
                                            )}

                                            {/* REMOVE */}
                                            <button
                                                className="text-red-600"
                                                onClick={() => removeAdmin(admin.user_id)}
                                            >
                                                Remove
                                            </button>

                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* LOGS */}
                {activePage === "logs" && <LogsComponent />}

            </main>

            {/* EDIT MODAL */}
            {editing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">

                    {/* SCROLLABLE CONTAINER */}
                    <div className="bg-white rounded shadow w-full max-w-md max-h-[90vh] overflow-y-auto p-6">

                        <h2 className="text-xl font-semibold mb-4">Edit Listing</h2>

                        <form onSubmit={handleSaveEdit} className="space-y-3">

                            <div>
                                <label className="block text-sm font-medium mb-1">MLS ID</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.mls_id}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, mls_id: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Compensation</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.compensation}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, compensation: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.address}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, address: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Broker Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.broker_name}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, broker_name: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Broker Email</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.broker_email}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, broker_email: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Broker Phone</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.broker_phone}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, broker_phone: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Listing Agent</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.listing_agent}
                                    onChange={(e) =>
                                        setEditRow({ ...editRow, listing_agent: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Listing Agent Phone</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={editRow.listing_agent_phone}
                                    onChange={(e) =>
                                        setEditRow({
                                            ...editRow,
                                            listing_agent_phone: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Listing Agent Email</label>
                                <input
                                    type="email"
                                    className="w-full border p-2 rounded"
                                    value={editRow.listing_agent_email}
                                    onChange={(e) =>
                                        setEditRow({
                                            ...editRow,
                                            listing_agent_email: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Replace PDF (optional)
                                </label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setEditPdfFile(e.target.files?.[0] || null)}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex justify-between mt-4 sticky bottom-0 bg-white py-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="px-4 py-2 border rounded"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}


        </div>
    );
}
