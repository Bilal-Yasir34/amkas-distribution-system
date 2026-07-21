import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserPayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is authenticated and is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role
    const { data: callerProfile } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only admins can manage users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET: list all users with profiles
    if (method === "GET") {
      const { data: profiles, error: profileError } = await adminClient
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (profileError) throw profileError;

      return new Response(JSON.stringify({ users: profiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: create new user
    if (method === "POST") {
      const body: UserPayload = await req.json();

      if (!body.email || !body.password || !body.role) {
        return new Response(JSON.stringify({ error: "email, password, and role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with admin API
      const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert user_profiles row
      const { error: profileInsertError } = await adminClient
        .from("user_profiles")
        .insert({
          id: newAuthUser.user.id,
          email: body.email,
          full_name: body.full_name || "",
          role: body.role,
          is_active: true,
        });

      if (profileInsertError) {
        // Try to clean up the auth user if profile insert fails
        await adminClient.auth.admin.deleteUser(newAuthUser.user.id);
        return new Response(JSON.stringify({ error: profileInsertError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, user: { id: newAuthUser.user.id, email: body.email, role: body.role, full_name: body.full_name } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT: update user (role, active status, or password)
    if (method === "PUT") {
      const body: { user_id: string; role?: string; is_active?: boolean; full_name?: string; password?: string } = await req.json();

      if (!body.user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile
      const updates: Record<string, unknown> = {};
      if (body.role !== undefined) updates.role = body.role;
      if (body.is_active !== undefined) updates.is_active = body.is_active;
      if (body.full_name !== undefined) updates.full_name = body.full_name;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await adminClient
          .from("user_profiles")
          .update(updates)
          .eq("id", body.user_id);

        if (updateError) throw updateError;
      }

      // Update password if provided
      if (body.password) {
        const { error: pwdError } = await adminClient.auth.admin.updateUserById(body.user_id, { password: body.password });
        if (pwdError) {
          return new Response(JSON.stringify({ error: pwdError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE: remove user
    if (method === "DELETE") {
      const body: { user_id: string } = await req.json();

      if (!body.user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete profile first (will cascade from auth.users delete, but do explicitly)
      await adminClient.from("user_profiles").delete().eq("id", body.user_id);

      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(body.user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
