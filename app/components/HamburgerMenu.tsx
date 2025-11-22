"use client";

import { useState, useRef, useEffect } from "react";

export default function HamburgerMenu({ onOpenPDF }: { onOpenPDF: () => void }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Close menu if clicked outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            {/* Hamburger Icon */}
            <button
                onClick={() => setOpen(!open)}
                className="p-2 hover:bg-gray-200 rounded"
            >
                <div className="flex flex-col gap-[3px]">
                    <span className="w-5 h-[2px] bg-black"></span>
                    <span className="w-5 h-[2px] bg-black"></span>
                    <span className="w-5 h-[2px] bg-black"></span>
                </div>
            </button>

            {/* Dropdown Menu */}
            {open && (
                <div className="absolute right-0 mt-2 bg-white shadow-md rounded border z-20 w-40 min-w-max">
                    <button
                        onClick={() => {
                            setOpen(false);
                            onOpenPDF();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                        Broker Agreement
                    </button>
                </div>
            )}
        </div>
    );
}
