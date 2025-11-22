import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // IMPORTANT!
);

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        // 1. Create Auth user
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: "admin" },
        });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // 2. Insert into admins table
        await supabase.from("admin_users").insert({
            user_id: data.user.id,
            email,
            role: "admin",
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
