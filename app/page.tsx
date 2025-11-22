"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import HamburgerMenu from "./components/HamburgerMenu";


export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<"mls_id" | "address">("mls_id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function toggleSort(field: "mls_id" | "address") {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Switch to new field
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Fetch results when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .or(`mls_id.ilike.%${query}%,address.ilike.%${query}%`)
        .order(sortField, { ascending: sortDirection === "asc" });


      setLoading(false);

      if (!error) {
        setResults(data || []);
      }
    };

    fetchResults();
  }, [query, sortField, sortDirection]);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">

      {/* LOGO BAR */}
      <div className="
        w-full flex justify-center 
        px-4 py-4 mb-6 bg-white/10 
        backdrop-blur rounded-xl shadow-lg
      "
      >
        <img
          src="https://res.cloudinary.com/da0bnopjg/image/upload/v1763480904/Company_Logo2_lvge8x.png"
          alt="Logo"
          className="h-16 object-contain"
        />
      </div>

      {/* TITLE */}
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-semibold tracking-wide text-[#0C2749]">
          COOPERATING BROKER INFORMATION
        </h2>

        <p className="text-base md:text-lg mt-2 text-[#0C2749]/80 px-2">
          Type in the address or MLS number for compensation information and documentation
        </p>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search by MLS or Address..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="
        w-full p-3 md:p-4 text-base md:text-lg border 
        border-gray-300 rounded-lg shadow-sm
      "
      />

      {/* RESULTS */}
      {results.length > 0 && (
        <>

          {/* ---------------- MOBILE CARD VIEW ---------------- */}
          <div className="mt-6 space-y-4 md:hidden">
            {results.map((row) => (
              <div
                key={row.id}
                className="bg-white p-4 rounded-lg shadow border space-y-2"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{row.mls_id}</h3>
                </div>

                <p className="text-sm text-gray-700">
                  <strong>Address:</strong> {row.address}
                </p>

                <p className="text-sm">
                  <strong>Compensation:</strong>{" "}
                  <span
                    className="text-blue-600 underline cursor-pointer"
                    onClick={() =>
                      window.open(
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/broker_agreements/${row.pdf_path}`,
                        "_blank"
                      )
                    }
                  >
                    {row.compensation}
                  </span>
                </p>

                <p className="text-sm">
                  <strong>Broker:</strong> {row.broker_name}
                </p>

                <p className="text-sm">
                  <strong>Email:</strong>{" "}
                  <a href={`mailto:${row.broker_email}`} className="text-blue-600 underline">
                    {row.broker_email}
                  </a>
                </p>

                <p className="text-sm">
                  <strong>Phone:</strong> {row.broker_phone}
                </p>

                <button
                  onClick={() =>
                    window.open(
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/broker_agreements/${row.pdf_path}`,
                      "_blank"
                    )
                  }
                  className="w-full bg-[#0C2749] text-white py-2 rounded mt-3"
                >
                  View PDF
                </button>
              </div>
            ))}
          </div>

          {/* ---------------- DESKTOP TABLE VIEW ---------------- */}
          <div className="mt-6 overflow-x-auto hidden md:block overflow-visible">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-visible">
              <thead>
                <tr className="bg-[#0C2749] text-[#F7F5EE]">
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none"
                    onClick={() => toggleSort("mls_id")}
                  >
                    MLS ID
                    {sortField === "mls_id" && (
                      <span>{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Compensation
                  </th>

                  <th
                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none"
                    onClick={() => toggleSort("address")}
                  >
                    Address
                    {sortField === "address" && (
                      <span>{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Broker Name
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Email
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Phone
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="overflow-visible">
                {results.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} overflow-visible`}
                  >
                    <td className="px-4 py-3 text-sm">{row.mls_id}</td>

                    <td
                      className="px-4 py-3 text-sm text-blue-600 cursor-pointer hover:underline"
                      onClick={() =>
                        window.open(
                          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/broker_agreements/${row.pdf_path}`,
                          "_blank"
                        )
                      }
                    >
                      {row.compensation}
                    </td>

                    <td className="px-4 py-3 text-sm">{row.address}</td>
                    <td className="px-4 py-3 text-sm">{row.broker_name}</td>

                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`mailto:${row.broker_email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.broker_email}
                      </a>
                    </td>

                    <td className="px-4 py-3 text-sm">{row.broker_phone}</td>

                    <td className="px-4 py-3 text-sm relative overflow-visible z-10">
                      <HamburgerMenu
                        onOpenPDF={() =>
                          window.open(
                            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/broker_agreements/${row.pdf_path}`,
                            "_blank"
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}

    </div>
  );

}
