import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { user_id } = await req.json();

        // 1. Update user metadata (Supabase Auth)
        const { error: roleErr } = await supabase.auth.admin.updateUserById(user_id, {
            user_metadata: { role: "superadmin" },
        });

        if (roleErr) {
            return NextResponse.json({ error: roleErr.message }, { status: 400 });
        }

        // 2. Update admin_users table
        const { error: tableErr } = await supabase
            .from("admin_users")
            .update({ role: "superadmin" })
            .eq("user_id", user_id);

        if (tableErr) {
            return NextResponse.json({ error: tableErr.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
