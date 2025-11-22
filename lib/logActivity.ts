import { supabase } from "@/lib/supabaseClient";

export async function logActivity({
    user_id,
    user_email,
    action,
    details,
}: {
    user_id: string;
    user_email: string;
    action: string;
    details?: string;
}) {
    await supabase.from("activity_logs").insert([
        {
            user_id,
            user_email,
            action,
            details: details || "",
        },
    ]);
}
