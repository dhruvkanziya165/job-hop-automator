// Bulk job importer: pulls real jobs from free, keyless public job APIs.
// Sources: Remotive, RemoteOK, Arbeitnow, Jobicy, Greenhouse / Lever / Ashby public career boards.
// Keeps India + Remote jobs only. Dedupes via unique external_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Job = {
  external_id: string; source: string; title: string; company: string;
  location: string | null; description: string | null; url: string;
  posted_date: string | null; salary_range: string | null; job_type: "job" | "internship";
};

const INDIA = /india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|chandigarh|indore|coimbatore/i;
const REMOTE = /remote|anywhere|worldwide|global|apac|asia/i;

const GREENHOUSE = ["phonepe","groww","postman","browserstack","druva","rubrik","databricks","stripe","cloudflare","airbnb","gitlab","mongodb","elastic","datadog","twilio","coinbase","robinhood","figma","dropbox","okta","pinterest","lyft","doordash","instacart","samsara","brex","affirm","asana","discord","reddit","duolingo","hackerrank","mindtickle","sprinklr","innovaccer","whatfix","chargebee","freshworks","gojek","grab","atlassian","toast","zscaler","nutanix","purestorage","confluent","hashicorp","snowflake","newrelic","sumologic","amplitude","mixpanel","intercom","zendesk","squarespace","wayfair","etsy","roblox","unity3d","epicgames","lattice","gusto","carta","chime","sofi","marqeta","plaid","anthropic","scaleai","appian","celonis","uipath","acko","slice","jupiter","meesho","swiggy","urbancompany","dream11","sharechat","cars24","upgrad","unacademy","vedantu","pinelabs","paytm","navi","smallcase","zomato","ola","rapido"];
const LEVER = ["cred","zeta","spotify","palantir","plaid","kraken","wealthsimple","mistral","shopify","netlify","attentive","whoop","eventbrite","jumpcloud","binance","ledger","paxos","zepto","dunzo","khatabook","licious","country-delight","park-plus","nobroker","jar-app","fampay","leadsquared","darwinbox","yellowai","haptik","gupshup","exotel","capillarytech","moengage","clevertap","webengage","lenskart","nykaa","boat","mamaearth","sugarcosmetics"];
const ASHBY = ["notion","ramp","linear","openai","deel","vercel","supabase","posthog","retool","replit","cursor","perplexity","elevenlabs","runway","modal","clerk","resend","mercury","rippling","airtable","zapier","loom","miro","canva","remote","multiplier","atlan","hasura","setu","sarvam"];

const strip = (h?: string | null) =>
  h ? h.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&lt;|&gt;|&#\d+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000) : null;
const typeOf = (t: string): "job" | "internship" => (/intern/i.test(t) ? "internship" : "job");
const iso = (d: unknown) => { try { const x = new Date(d as string); return isNaN(+x) ? null : x.toISOString(); } catch { return null; } };
const keepLoc = (loc: string | null | undefined, remote = false) => remote || (!!loc && (INDIA.test(loc) || REMOTE.test(loc)));

async function getJson(url: string, ms = 15000): Promise<any> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 JobHopBot/1.0", Accept: "application/json" } });
    if (!r.ok) return null; return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

async function remotive(): Promise<Job[]> {
  const d = await getJson("https://remotive.com/api/remote-jobs", 25000);
  return (d?.jobs ?? []).map((j: any) => ({ external_id: `remotive-${j.id}`, source: "remotive", title: j.title, company: j.company_name,
    location: j.candidate_required_location || "Remote", description: strip(j.description), url: j.url, posted_date: iso(j.publication_date),
    salary_range: j.salary || null, job_type: typeOf(j.title) }))
    .filter((j: Job) => keepLoc(j.location));
}
async function remoteok(): Promise<Job[]> {
  const d = await getJson("https://remoteok.com/api", 25000);
  return (Array.isArray(d) ? d.slice(1) : []).filter((j: any) => j.id && j.url).map((j: any) => ({
    external_id: `remoteok-${j.id}`, source: "remoteok", title: j.position, company: j.company, location: j.location || "Remote",
    description: strip(j.description), url: j.url, posted_date: iso(j.date),
    salary_range: j.salary_min ? `$${j.salary_min}-${j.salary_max}` : null, job_type: typeOf(j.position || "") }));
}
async function jobicy(): Promise<Job[]> {
  const d = await getJson("https://jobicy.com/api/v2/remote-jobs?count=100");
  return (d?.jobs ?? []).map((j: any) => ({ external_id: `jobicy-${j.id}`, source: "jobicy", title: j.jobTitle, company: j.companyName,
    location: j.jobGeo || "Remote", description: strip(j.jobExcerpt), url: j.url, posted_date: iso(j.pubDate), salary_range: null, job_type: typeOf(j.jobTitle) }));
}
async function arbeitnow(): Promise<Job[]> {
  const pages = await Promise.all([1, 2, 3, 4, 5].map((p) => getJson(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)));
  return pages.flatMap((d) => d?.data ?? []).filter((j: any) => j.remote).map((j: any) => ({
    external_id: `arbeitnow-${j.slug}`, source: "arbeitnow", title: j.title, company: j.company_name, location: "Remote",
    description: strip(j.description), url: j.url, posted_date: iso((j.created_at ?? 0) * 1000), salary_range: null, job_type: typeOf(j.title) }));
}
async function greenhouse(b: string): Promise<Job[]> {
  const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`);
  return (d?.jobs ?? []).filter((j: any) => keepLoc(j.location?.name)).map((j: any) => ({
    external_id: `gh-${b}-${j.id}`, source: "greenhouse", title: j.title, company: b.charAt(0).toUpperCase() + b.slice(1),
    location: j.location?.name ?? null, description: null, url: j.absolute_url, posted_date: iso(j.updated_at), salary_range: null, job_type: typeOf(j.title) }));
}
async function lever(b: string): Promise<Job[]> {
  const d = await getJson(`https://api.lever.co/v0/postings/${b}?mode=json`);
  return (Array.isArray(d) ? d : []).filter((j: any) => keepLoc(j.categories?.location, j.workplaceType === "remote")).map((j: any) => ({
    external_id: `lever-${b}-${j.id}`, source: "lever", title: j.text, company: b.charAt(0).toUpperCase() + b.slice(1),
    location: j.categories?.location ?? "Remote", description: strip(j.descriptionPlain ?? j.description), url: j.hostedUrl,
    posted_date: iso(j.createdAt), salary_range: null, job_type: typeOf(j.text) }));
}
async function ashby(b: string): Promise<Job[]> {
  const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${b}`);
  return (d?.jobs ?? []).filter((j: any) => keepLoc(j.location, j.isRemote)).map((j: any) => ({
    external_id: `ashby-${b}-${j.id}`, source: "ashby", title: j.title, company: b.charAt(0).toUpperCase() + b.slice(1),
    location: j.location ?? "Remote", description: strip(j.descriptionPlain), url: j.jobUrl, posted_date: iso(j.publishedAt), salary_range: null, job_type: typeOf(j.title) }));
}

async function inBatches<T>(items: string[], size: number, fn: (s: string) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += size) {
    const r = await Promise.all(items.slice(i, i + size).map((x) => fn(x).catch(() => [] as T[])));
    r.forEach((a) => out.push(...a));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const scrapeType = body.scrapeType === "manual" ? "manual" : "scheduled";

  // Single-flight lock: skip if a bulk import is already running (last 10 min)
  const { data: running } = await supabase.from("job_scrape_logs").select("id").eq("status", "running")
    .contains("keywords", ["bulk-import"]).gte("started_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
  if (running?.length) {
    return new Response(JSON.stringify({ success: false, error: "Import already running, try again in a few minutes" }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: log } = await supabase.from("job_scrape_logs").insert({
    scrape_type: scrapeType, status: "running", keywords: ["bulk-import"], locations: ["India", "Remote"], started_at: new Date().toISOString(),
  }).select("id").single();

  try {
    const results = await Promise.all([
      remotive().catch(() => []), remoteok().catch(() => []), jobicy().catch(() => []), arbeitnow().catch(() => []),
      inBatches(GREENHOUSE, 15, greenhouse), inBatches(LEVER, 15, lever), inBatches(ASHBY, 15, ashby),
    ]);
    const map = new Map<string, Job>();
    for (const j of results.flat()) {
      if (j.title && j.company && j.url?.startsWith("http")) map.set(j.external_id, j);
    }
    const all = [...map.values()];
    let inserted = 0;
    for (let i = 0; i < all.length; i += 500) {
      const { data, error } = await supabase.from("job_postings")
        .upsert(all.slice(i, i + 500), { onConflict: "external_id", ignoreDuplicates: true }).select("id");
      if (error) console.error("upsert error", error.message); else inserted += data?.length ?? 0;
    }
    const bySource = results.map((r) => r.length);
    await supabase.from("job_scrape_logs").update({ status: "completed", jobs_found: all.length, jobs_inserted: inserted,
      completed_at: new Date().toISOString() }).eq("id", log?.id);
    return new Response(JSON.stringify({ success: true, jobsFound: all.length, jobsInserted: inserted, bySource }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await supabase.from("job_scrape_logs").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", log?.id);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
