import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Action =
  | { action: "list_users" }
  | { action: "toggle_admin"; user_id: string; make_admin: boolean }
  | { action: "delete_user"; user_id: string };

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) return bad("Unauthorized", 401);
        const token = authHeader.slice(7).trim();
        if (!token || token.split(".").length !== 3) return bad("Unauthorized", 401);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SERVICE_ROLE) {
          return bad("Server misconfigured", 500);
        }

        // Verify caller
        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) return bad("Unauthorized", 401);
        const callerId = claims.claims.sub as string;

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Verify admin role
        const { data: role } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        if (!role) return bad("Forbidden", 403);

        let body: Action;
        try {
          body = (await request.json()) as Action;
        } catch {
          return bad("Invalid JSON");
        }

        if (body.action === "list_users") {
          const { data: profiles, error: pErr } = await admin
            .from("profiles")
            .select("id, email, name, is_verified, is_disabled, created_at");
          if (pErr) return bad(pErr.message, 500);
          const { data: roles } = await admin.from("user_roles").select("user_id, role");
          const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
          const users = (profiles ?? []).map((p) => ({ ...p, is_admin: adminSet.has(p.id) }));
          return new Response(JSON.stringify({ users }), {
            headers: { "content-type": "application/json" },
          });
        }

        if (body.action === "toggle_admin") {
          if (body.user_id === callerId && !body.make_admin) {
            return bad("You cannot remove your own admin role");
          }
          if (body.make_admin) {
            const { error } = await admin
              .from("user_roles")
              .upsert({ user_id: body.user_id, role: "admin" }, { onConflict: "user_id,role" });
            if (error) return bad(error.message, 500);
          } else {
            const { error } = await admin
              .from("user_roles")
              .delete()
              .eq("user_id", body.user_id)
              .eq("role", "admin");
            if (error) return bad(error.message, 500);
          }
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "content-type": "application/json" },
          });
        }

        if (body.action === "delete_user") {
          if (body.user_id === callerId) return bad("You cannot delete yourself");
          const { error } = await admin.auth.admin.deleteUser(body.user_id);
          if (error) return bad(error.message, 500);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "content-type": "application/json" },
          });
        }

        return bad("Unknown action");
      },
    },
  },
});