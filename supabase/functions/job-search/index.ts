// Public job search API: GET/POST ?q=&location=&type=&page=&pageSize=
// Returns paginated real job postings (refreshed every 6h by bulk-job-import).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const clean = (s: unknown, max = 80) =>
  typeof s === "string" ? s.replace(/[,%()*\\]/g, " ").trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const get = (k: string) => body[k] ?? url.searchParams.get(k);

  const q = clean(get("q"));
  const location = clean(get("location"));
  const type = get("type");
  const page = Math.max(1, Math.min(1000, parseInt(get("page") ?? "1") || 1));
  const pageSize = Math.max(1, Math.min(50, parseInt(get("pageSize") ?? "20") || 20));

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let query = supabase
    .from("job_postings")
    .select("id,title,company,location,salary_range,url,source,posted_date,job_type", { count: "exact" });
  if (q) query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (type === "job" || type === "internship") query = query.eq("job_type", type);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("posted_date", { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize), jobs: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
});
