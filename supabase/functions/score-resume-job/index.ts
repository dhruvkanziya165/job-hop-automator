// Parses the user's uploaded resume (PDF/DOCX/TXT) and scores it against a job's posted requirements.
// Deterministic keyword/skill matching — no AI quota needed, so it never rate-limits.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import mammoth from "npm:mammoth@1.8.0";

const Body = z.object({ jobId: z.string().uuid(), resumeId: z.string().uuid().optional(), reparse: z.boolean().optional() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SKILLS = [
  "javascript","typescript","python","java","golang","go","rust","c++","c#","ruby","php","kotlin","swift","scala","sql","nosql",
  "react","next.js","vue","angular","svelte","node.js","express","django","flask","fastapi","spring","spring boot","rails",".net",
  "html","css","tailwind","redux","graphql","rest","grpc","microservices","aws","azure","gcp","docker","kubernetes","terraform",
  "ci/cd","jenkins","github actions","linux","git","postgresql","mysql","mongodb","redis","kafka","rabbitmq","elasticsearch",
  "spark","hadoop","airflow","snowflake","dbt","tableau","power bi","excel","pandas","numpy","pytorch","tensorflow","scikit-learn",
  "machine learning","deep learning","nlp","llm","computer vision","data analysis","data science","statistics","etl",
  "android","ios","react native","flutter","figma","ui/ux","product management","agile","scrum","jira","seo","marketing",
  "sales","salesforce","communication","leadership","security","networking","testing","selenium","cypress","jest","devops","sre",
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, skill: string) => new RegExp(`(^|[^a-z0-9+#])${esc(skill)}([^a-z0-9+#]|$)`, "i").test(text);
const STOP = new Set(["senior","junior","lead","staff","principal","intern","the","and","for","with","of","i","ii","iii","sr","jr","remote","-","&"]);

async function parseFile(bytes: Uint8Array, name: string): Promise<string> {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text);
  }
  if (n.endsWith(".docx")) {
    const r = await mammoth.extractRawText({ buffer: bytes });
    return r.value;
  }
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { jobId, resumeId, reparse } = parsed.data;

    let rq = admin.from("resumes").select("id,file_name,file_path,parsed_text").eq("user_id", user.id);
    rq = resumeId ? rq.eq("id", resumeId) : rq.order("is_default", { ascending: false }).order("created_at", { ascending: false });
    const { data: resumes } = await rq.limit(1);
    const resume = resumes?.[0];
    if (!resume) return json({ error: "no_resume", message: "Upload a resume in your Profile first." }, 200);

    let text = resume.parsed_text ?? "";
    if (!text || reparse) {
      const { data: file, error } = await admin.storage.from("resumes").download(resume.file_path);
      if (error || !file) return json({ error: "Could not read your resume file." }, 500);
      try { text = (await parseFile(new Uint8Array(await file.arrayBuffer()), resume.file_name)).replace(/\s+/g, " ").trim(); }
      catch (e) { console.error("parse failed", e); text = ""; }
      if (text.length < 50) return json({ error: "unreadable", message: "We couldn't read text from this resume. Try a text-based PDF or DOCX (not a scanned image)." }, 200);
      await admin.from("resumes").update({ parsed_text: text.slice(0, 50000), parsed_at: new Date().toISOString() }).eq("id", resume.id);
    }

    const { data: job } = await admin.from("job_postings").select("id,title,company,description").eq("id", jobId).maybeSingle();
    if (!job) return json({ error: "Job not found" }, 404);
    const jobText = `${job.title} ${job.description ?? ""}`;

    const required = SKILLS.filter((s) => has(jobText, s));
    const matched = required.filter((s) => has(text, s));
    const missing = required.filter((s) => !has(text, s));
    const titleWords = job.title.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w: string) => w.length > 1 && !STOP.has(w));
    const titleHits = titleWords.filter((w: string) => has(text, w));

    const skillScore = required.length ? matched.length / required.length : 0.5;
    const titleScore = titleWords.length ? titleHits.length / titleWords.length : 0.5;
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
    const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(text);
    const sections = ["experience", "education", "skills", "projects"].filter((s) => has(text, s));
    const structureScore = (Number(hasEmail) + Number(hasPhone) + sections.length) / 6;
    const score = Math.round(100 * (0.6 * skillScore + 0.25 * titleScore + 0.15 * structureScore));

    const suggestions: string[] = [];
    if (missing.length) suggestions.push(`Add these skills from the job post if you have them: ${missing.slice(0, 6).join(", ")}.`);
    if (titleHits.length < titleWords.length) suggestions.push(`Mention the role title "${job.title}" or close wording in your summary.`);
    if (!hasEmail || !hasPhone) suggestions.push("Make sure your email and phone number are clearly listed at the top.");
    const absent = ["experience", "education", "skills", "projects"].filter((s) => !sections.includes(s));
    if (absent.length) suggestions.push(`Add clear section headings: ${absent.join(", ")}.`);
    if (!job.description) suggestions.push("This job post has no full description, so the score is based mainly on the title.");

    const result = { score, matched, missing, titleHits, suggestions, resumeName: resume.file_name, requirementsFound: required.length };
    await admin.from("resume_analyses").insert({
      user_id: user.id, resume_id: resume.id, job_id: job.id, ats_score: score, analysis_type: "job_match",
      keyword_matches: matched, missing_keywords: missing, suggestions,
    });
    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
