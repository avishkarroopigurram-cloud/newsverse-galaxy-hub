// One-time admin bootstrap endpoint.
// POST /api/public/init-admin  with header  x-init-secret: <ADMIN_INIT_SECRET>
// Creates the two approved editorial accounts (idempotent) with the
// initial password, and grants them the admin role.
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAILS = [
  "rajanikanth9m@gmail.com",
  "aavishkarroopi@gmail.com",
];
const INITIAL_PASSWORD = "Shiprah@123";

export const Route = createFileRoute("/api/public/init-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-init-secret") ?? "";
        const expected = process.env.ADMIN_INIT_SECRET ?? "";
        if (!expected || provided !== expected) {
          return new Response("Forbidden", { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: Array<{ email: string; created: boolean; role: boolean; error?: string }> = [];

        for (const email of ADMIN_EMAILS) {
          try {
            // Try to create; ignore duplicate errors.
            const { data: created, error: createErr } =
              await supabaseAdmin.auth.admin.createUser({
                email,
                password: INITIAL_PASSWORD,
                email_confirm: true,
              });

            let userId = created?.user?.id;
            let wasCreated = !createErr;

            if (createErr) {
              // Look up existing user.
              const { data: list } = await supabaseAdmin.auth.admin.listUsers();
              userId = list?.users.find((u) => u.email === email)?.id;
              // Reset password to the initial value for the known user.
              if (userId) {
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                  password: INITIAL_PASSWORD,
                  email_confirm: true,
                });
              }
            }

            if (!userId) {
              results.push({ email, created: wasCreated, role: false, error: "no user id" });
              continue;
            }

            const { error: roleErr } = await supabaseAdmin
              .from("user_roles")
              .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

            results.push({
              email,
              created: wasCreated,
              role: !roleErr,
              error: roleErr?.message,
            });
          } catch (e) {
            results.push({
              email,
              created: false,
              role: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});
