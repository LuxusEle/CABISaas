import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // Parse the body
    const { apiKey, projectData } = await req.json()

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Resolve API key to the client's user_id
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from("client_api_keys")
      .select("user_id")
      .eq("api_key", apiKey)
      .single()

    if (keyError || !keyRecord) {
      console.error("API Key verification failed:", keyError)
      return new Response(JSON.stringify({ error: "Invalid API Key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const clientUserId = keyRecord.user_id

    // Fetch the client's business profile settings (currency, company name)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_name, currency, logo_url")
      .eq("id", clientUserId)
      .single()

    // Setup standard defaults/templates if projectData doesn't contain them
    const projectCompany = profile?.company_name || projectData.company || "Standard Config"
    const projectCurrency = profile?.currency || projectData.settings?.currency || "$"
    const projectLogoUrl = profile?.logo_url || projectData.settings?.logoUrl || undefined

    const mergedSettings = {
      ...projectData.settings,
      currency: projectCurrency,
      logoUrl: projectLogoUrl,
    }

    // Insert project into database
    const { data: newProject, error: insertError } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: clientUserId,
        name: projectData.name || "Untitled Embedded Kitchen",
        designer: "Website Customer",
        company: projectCompany,
        customerName: projectData.customerName || "",
        customerAddress: projectData.customerAddress || "",
        customerPhone: projectData.customerPhone || "",
        settings: mergedSettings,
        zones: projectData.zones || [],
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting project:", insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({
        success: true,
        projectId: newProject.id,
        message: "Project successfully created on client account."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (err: any) {
    console.error("Edge function execution error:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})
