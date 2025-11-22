"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { logActivity } from "@/lib/logActivity";


export default function AdminDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);

    const [mlsId, setMlsId] = useState("");
    const [compensation, setCompensation] = useState("");
    const [address, setAddress] = useState("");
    const [brokerName, setBrokerName] = useState("");
    const [brokerEmail, setBrokerEmail] = useState("");
    const [brokerPhone, setBrokerPhone] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [listingAgent, setListingAgent] = useState("");
    const [listingAgentPhone, setListingAgentPhone] = useState("");
    const [listingAgentEmail, setListingAgentEmail] = useState("");

    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState(false);
    const [editRow, setEditRow] = useState<any>(null);
    const [editPdfFile, setEditPdfFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [originalRow, setOriginalRow] = useState<any>(null);

    function startEdit(row: any) {
        setOriginalRow({ ...row });   // ← save original values
        setEditRow({ ...row });       // ← editable copy
        setEditing(true);
    }

    // Check session (auth)
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                router.push("/admin/login");
            } else {
                setSession(data.session);
                fetchListings();
            }
        });
    }, [router]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/admin/login");
    }

    async function fetchListings() {
        const { data, error } = await supabase
            .from("listings")
            .select("*")
            .order("uploaded_at", { ascending: false });

        if (!error) setListings(data || []);
        setLoading(false);
    }

    // Upload PDF to Supabase Storage + Insert Listing
    async function handleSubmit(e: any) {
        e.preventDefault();

        if (!pdfFile) {
            toast.error("Please select a PDF file");
            return;
        }

        const filePath = `${mlsId}.pdf`;

        // Upload PDF
        const { error: uploadError } = await supabase.storage
            .from("broker_agreements")
            .upload(filePath, pdfFile, { upsert: true });

        if (uploadError) {
            toast.error("PDF upload failed: " + uploadError.message);
            return;
        }

        // Insert database row
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
            toast.error("Failed to add listing");
            return;
        }

        // Reset form
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

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        fetchListings();
        toast.success("Listing added successfully!");

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

    // Delete listing
    async function deleteListing(id: string, pdfPath: string) {
        if (!confirm("Delete this listing?")) return;

        // Delete database row
        await supabase.from("listings").delete().eq("id", id);

        // Delete PDF
        await supabase.storage.from("broker_agreements").remove([pdfPath]);

        fetchListings();

        await logActivity({
            user_id: session.user.id,
            user_email: session.user.email!,
            action: "Deleted Listing",
            details: `MLS: ${mlsId}`,
        });
    }

    if (!session) {
        return <p className="p-6 text-center">Checking session…</p>;
    }
    async function handleUpdate(e: any) {
        e.preventDefault();

        // Replace PDF if a new one was selected
        if (editPdfFile) {
            const filePath = `${editRow.mls_id}.pdf`;

            const { error: pdfError } = await supabase.storage
                .from("broker_agreements")
                .upload(filePath, editPdfFile, { upsert: true });

            if (pdfError) {
                toast.error("PDF upload failed: " + pdfError.message);
                return;
            }
        }

        // Update row data in the database
        const { error } = await supabase
            .from("listings")
            .update({
                mls_id: editRow.mls_id,
                compensation: editRow.compensation,
                address: editRow.address,
                broker_name: editRow.broker_name,
                broker_email: editRow.broker_email,
                broker_phone: editRow.broker_phone,
                listing_agent: listingAgent,
                listing_agent_phone: listingAgentPhone,
                listing_agent_email: listingAgentEmail,
                // pdf_path stays the same
            })
            .eq("id", editRow.id);

        if (error) {
            toast.error("Update failed: " + error.message);
            return;
        }

        // Reset edit state
        setEditPdfFile(null);
        setEditing(false);
        setEditRow(null);
        fetchListings();
        toast.success("Listing updated!");

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
    // Edit Listing Form
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>

                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                    Logout
                </button>
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">

                    {/* SCROLLABLE CONTAINER */}
                    <div className="bg-white rounded shadow w-full max-w-md max-h-[90vh] overflow-y-auto p-6">

                        <h2 className="text-xl font-semibold mb-4">Edit Listing</h2>

                        <form onSubmit={handleUpdate} className="space-y-3">

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

            {/* Add Listing Form */}
            <form
                onSubmit={handleSubmit}
                className="space-y-4 bg-white p-6 rounded shadow"
            >
                <h2 className="text-xl font-semibold">Add New Listing</h2>

                <div>
                    <label className="block text-sm font-medium mb-1">MLS ID</label>
                    <input
                        type="text"
                        value={mlsId}
                        onChange={(e) => setMlsId(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Compensation</label>
                    <input
                        type="text"
                        value={compensation}
                        onChange={(e) => setCompensation(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Broker Name</label>
                    <input
                        type="text"
                        value={brokerName}
                        onChange={(e) => setBrokerName(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Broker Email</label>
                    <input
                        type="email"
                        value={brokerEmail}
                        onChange={(e) => setBrokerEmail(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Broker Phone</label>
                    <input
                        type="text"
                        value={brokerPhone}
                        onChange={(e) => setBrokerPhone(e.target.value)}
                        className="w-full border p-2 rounded"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Listing Agent</label>
                    <input
                        type="text"
                        value={listingAgent}
                        onChange={(e) => setListingAgent(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Listing Agent Phone</label>
                    <input
                        type="text"
                        value={listingAgentPhone}
                        onChange={(e) => setListingAgentPhone(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Listing Agent Email</label>
                    <input
                        type="email"
                        value={listingAgentEmail}
                        onChange={(e) => setListingAgentEmail(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Upload PDF</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="w-full"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Upload Listing
                </button>
            </form>

            {/* Existing Listings */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">
                Existing Listings
            </h2>

            {loading ? (
                <p>Loading…</p>
            ) : listings.length === 0 ? (
                <p>No listings found.</p>
            ) : (
                <ul className="space-y-3">
                    {listings.map((row) => (
                        <li
                            key={row.id}
                            className="p-4 bg-gray-50 rounded border flex justify-between items-center"
                        >
                            <div>
                                <p className="font-semibold">{row.mls_id}</p>
                                <p className="text-sm">{row.address}</p>
                                <p className="text-sm">Listing Agent: {row.listing_agent}</p>
                                <p className="text-sm">Phone: {row.listing_agent_phone}</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => startEdit(row)}
                                    className="text-blue-600 hover:underline"
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() => deleteListing(row.id, row.pdf_path)}
                                    className="text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>

                        </li>
                    ))}
                </ul>
            )}
        </div>

    );
}
