import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: true });

    return NextResponse.json({ admins: data || [] });
}

