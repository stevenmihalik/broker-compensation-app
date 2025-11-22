import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { user_id } = await req.json();

        // 1. Look up email
        const { data: userData, error: userErr } =
            await supabaseAdmin.auth.admin.getUserById(user_id);

        if (userErr) {
            return NextResponse.json({ error: userErr.message }, { status: 400 });
        }

        const email = userData.user.email as string;

        // 2. Send password reset email (new Supabase v2 way)
        const supabasePublic = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabasePublic.auth.resetPasswordForEmail(email, {
            redirectTo: "http://localhost:3000/admin/reset", // adjust for production
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
