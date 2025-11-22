import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { user_id } = await req.json();

    // Delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(user_id);

    // Delete from admin_users table
    await supabaseAdmin.from("admin_users").delete().eq("user_id", user_id);

    return NextResponse.json({ success: true });
}
