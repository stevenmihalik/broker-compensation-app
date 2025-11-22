"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LogsComponent() {
    const [logs, setLogs] = useState<any[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        const { data, error } = await supabase
            .from("activity_logs")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) {
            setLogs(data as any[]);
            setFilteredLogs(data as any[]);
        }

        setLoading(false);
    }

    // Apply all filters when any filter changes
    useEffect(() => {
        applyFilters();
    }, [search, actionFilter, startDate, endDate, logs]);

    function applyFilters() {
        let result = [...logs];

        // Text search (email, action, details)
        if (search.trim() !== "") {
            const s = search.toLowerCase();
            result = result.filter(
                (log) =>
                    log.user_email.toLowerCase().includes(s) ||
                    log.action.toLowerCase().includes(s) ||
                    log.details.toLowerCase().includes(s)
            );
        }

        // Action type filter
        if (actionFilter !== "") {
            result = result.filter((log) => log.action === actionFilter);
        }

        // Date range filter
        if (startDate !== "") {
            result = result.filter(
                (log) => new Date(log.created_at) >= new Date(startDate)
            );
        }

        if (endDate !== "") {
            result = result.filter(
                (log) => new Date(log.created_at) <= new Date(endDate + "T23:59:59")
            );
        }

        setFilteredLogs(result);
    }

    if (loading) {
        return <p className="text-gray-600">Loading logs…</p>;
    }

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4 text-[#0C2749]">
                Listing Activity Logs
            </h2>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                {/* Search */}
                <div>
                    <label className="block text-sm font-medium mb-1">Search</label>
                    <input
                        className="w-full border p-2 rounded"
                        placeholder="Email, action, MLS, etc."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Action Type */}
                <div>
                    <label className="block text-sm font-medium mb-1">Action</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="Created Listing">Created Listing</option>
                        <option value="Updated Listing">Updated Listing</option>
                        <option value="Deleted Listing">Deleted Listing</option>
                    </select>
                </div>

                {/* Start Date */}
                <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                        type="date"
                        className="w-full border p-2 rounded"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                {/* End Date */}
                <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                        type="date"
                        className="w-full border p-2 rounded"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>

            </div>

            {/* TABLE */}
            <div className="overflow-auto border rounded">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border p-2">Date</th>
                            <th className="border p-2">Admin</th>
                            <th className="border p-2">Action</th>
                            <th className="border p-2">Details</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredLogs.map((log) => (
                            <tr key={log.id}>
                                <td className="border p-2">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="border p-2">{log.user_email}</td>
                                <td className="border p-2">{log.action}</td>
                                <td className="border p-2 whitespace-pre-line">
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredLogs.length === 0 && (
                <p className="text-gray-600 mt-4">No logs match your filters.</p>
            )}
        </div>
    );
}
