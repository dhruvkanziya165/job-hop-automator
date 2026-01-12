import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive India-focused job data with 1000+ job templates
const INDIAN_CITIES = [
  "Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", 
  "Kolkata", "Ahmedabad", "Noida", "Gurugram", "Jaipur", "Lucknow",
  "Chandigarh", "Kochi", "Coimbatore", "Indore", "Bhopal", "Vadodara",
  "Thiruvananthapuram", "Visakhapatnam", "Nagpur", "Surat", "Remote India"
];

const COMPANIES = {
  tech_giants: [
    { name: "Google India", type: "MNC" },
    { name: "Microsoft India", type: "MNC" },
    { name: "Amazon India", type: "MNC" },
    { name: "Meta India", type: "MNC" },
    { name: "Apple India", type: "MNC" },
    { name: "IBM India", type: "MNC" },
    { name: "Oracle India", type: "MNC" },
    { name: "SAP India", type: "MNC" },
    { name: "Salesforce India", type: "MNC" },
    { name: "Adobe India", type: "MNC" },
    { name: "NVIDIA India", type: "MNC" },
    { name: "Intel India", type: "MNC" },
    { name: "Cisco India", type: "MNC" },
    { name: "VMware India", type: "MNC" },
    { name: "Dell Technologies India", type: "MNC" },
  ],
  indian_it: [
    { name: "TCS", type: "IT Services" },
    { name: "Infosys", type: "IT Services" },
    { name: "Wipro", type: "IT Services" },
    { name: "HCL Technologies", type: "IT Services" },
    { name: "Tech Mahindra", type: "IT Services" },
    { name: "LTIMindtree", type: "IT Services" },
    { name: "Mphasis", type: "IT Services" },
    { name: "Persistent Systems", type: "IT Services" },
    { name: "Cyient", type: "IT Services" },
    { name: "KPIT Technologies", type: "IT Services" },
    { name: "Hexaware", type: "IT Services" },
    { name: "Birlasoft", type: "IT Services" },
    { name: "Zensar Technologies", type: "IT Services" },
    { name: "Coforge", type: "IT Services" },
    { name: "Mastek", type: "IT Services" },
  ],
  startups_unicorns: [
    { name: "Flipkart", type: "E-commerce" },
    { name: "Paytm", type: "Fintech" },
    { name: "Zomato", type: "Food Tech" },
    { name: "Swiggy", type: "Food Tech" },
    { name: "Razorpay", type: "Fintech" },
    { name: "CRED", type: "Fintech" },
    { name: "PhonePe", type: "Fintech" },
    { name: "Dream11", type: "Gaming" },
    { name: "Zerodha", type: "Fintech" },
    { name: "Groww", type: "Fintech" },
    { name: "Ola", type: "Mobility" },
    { name: "BYJU'S", type: "EdTech" },
    { name: "upGrad", type: "EdTech" },
    { name: "Unacademy", type: "EdTech" },
    { name: "Meesho", type: "E-commerce" },
    { name: "ShareChat", type: "Social Media" },
    { name: "MPL", type: "Gaming" },
    { name: "Lenskart", type: "Retail" },
    { name: "Nykaa", type: "E-commerce" },
    { name: "PolicyBazaar", type: "InsurTech" },
    { name: "Cars24", type: "Auto Tech" },
    { name: "Urban Company", type: "Services" },
    { name: "Delhivery", type: "Logistics" },
    { name: "Freshworks", type: "SaaS" },
    { name: "Zoho", type: "SaaS" },
    { name: "BrowserStack", type: "Dev Tools" },
    { name: "Postman", type: "Dev Tools" },
    { name: "Chargebee", type: "SaaS" },
    { name: "Druva", type: "Cloud" },
    { name: "Icertis", type: "Enterprise" },
  ],
  consulting_finance: [
    { name: "Deloitte India", type: "Consulting" },
    { name: "PwC India", type: "Consulting" },
    { name: "EY India", type: "Consulting" },
    { name: "KPMG India", type: "Consulting" },
    { name: "McKinsey India", type: "Consulting" },
    { name: "BCG India", type: "Consulting" },
    { name: "Bain India", type: "Consulting" },
    { name: "Accenture India", type: "Consulting" },
    { name: "Goldman Sachs India", type: "Finance" },
    { name: "Morgan Stanley India", type: "Finance" },
    { name: "JP Morgan India", type: "Finance" },
    { name: "Barclays India", type: "Finance" },
    { name: "Deutsche Bank India", type: "Finance" },
    { name: "HSBC India", type: "Finance" },
    { name: "Citi India", type: "Finance" },
  ],
};

const JOB_ROLES = {
  engineering: [
    { title: "Software Engineer", level: "Entry/Mid", salary: "8-25 LPA" },
    { title: "Senior Software Engineer", level: "Senior", salary: "18-45 LPA" },
    { title: "Staff Software Engineer", level: "Staff", salary: "40-80 LPA" },
    { title: "Principal Engineer", level: "Principal", salary: "60-120 LPA" },
    { title: "Engineering Manager", level: "Manager", salary: "45-90 LPA" },
    { title: "Full Stack Developer", level: "Mid", salary: "10-30 LPA" },
    { title: "Frontend Developer", level: "Mid", salary: "8-25 LPA" },
    { title: "Backend Developer", level: "Mid", salary: "10-28 LPA" },
    { title: "Mobile Developer (Android)", level: "Mid", salary: "10-30 LPA" },
    { title: "Mobile Developer (iOS)", level: "Mid", salary: "10-30 LPA" },
    { title: "React Native Developer", level: "Mid", salary: "10-28 LPA" },
    { title: "DevOps Engineer", level: "Mid", salary: "12-35 LPA" },
    { title: "Site Reliability Engineer (SRE)", level: "Mid/Senior", salary: "15-45 LPA" },
    { title: "Cloud Engineer", level: "Mid", salary: "12-35 LPA" },
    { title: "Platform Engineer", level: "Senior", salary: "18-50 LPA" },
    { title: "QA Engineer", level: "Entry/Mid", salary: "5-18 LPA" },
    { title: "SDET", level: "Mid", salary: "10-28 LPA" },
    { title: "Security Engineer", level: "Mid/Senior", salary: "15-45 LPA" },
    { title: "Embedded Systems Engineer", level: "Mid", salary: "10-30 LPA" },
  ],
  data: [
    { title: "Data Scientist", level: "Mid", salary: "12-35 LPA" },
    { title: "Senior Data Scientist", level: "Senior", salary: "25-55 LPA" },
    { title: "Machine Learning Engineer", level: "Mid/Senior", salary: "15-50 LPA" },
    { title: "AI Engineer", level: "Mid/Senior", salary: "18-60 LPA" },
    { title: "Data Engineer", level: "Mid", salary: "12-35 LPA" },
    { title: "Data Analyst", level: "Entry/Mid", salary: "6-18 LPA" },
    { title: "Business Analyst", level: "Mid", salary: "8-22 LPA" },
    { title: "NLP Engineer", level: "Mid/Senior", salary: "15-45 LPA" },
    { title: "Computer Vision Engineer", level: "Mid/Senior", salary: "15-50 LPA" },
    { title: "MLOps Engineer", level: "Mid/Senior", salary: "15-45 LPA" },
    { title: "Analytics Engineer", level: "Mid", salary: "12-30 LPA" },
  ],
  product: [
    { title: "Product Manager", level: "Mid", salary: "15-40 LPA" },
    { title: "Senior Product Manager", level: "Senior", salary: "30-65 LPA" },
    { title: "Associate Product Manager", level: "Entry", salary: "10-20 LPA" },
    { title: "Technical Program Manager", level: "Mid/Senior", salary: "20-50 LPA" },
    { title: "Program Manager", level: "Mid", salary: "15-35 LPA" },
    { title: "Product Owner", level: "Mid", salary: "12-30 LPA" },
    { title: "Scrum Master", level: "Mid", salary: "10-25 LPA" },
    { title: "Project Manager", level: "Mid", salary: "10-28 LPA" },
  ],
  design: [
    { title: "UX Designer", level: "Mid", salary: "8-25 LPA" },
    { title: "UI Designer", level: "Mid", salary: "7-22 LPA" },
    { title: "Product Designer", level: "Mid/Senior", salary: "12-35 LPA" },
    { title: "UX Researcher", level: "Mid", salary: "10-28 LPA" },
    { title: "Visual Designer", level: "Mid", salary: "8-22 LPA" },
    { title: "Design Lead", level: "Senior", salary: "25-50 LPA" },
  ],
  sales_marketing: [
    { title: "Sales Executive", level: "Entry/Mid", salary: "4-12 LPA" },
    { title: "Account Executive", level: "Mid", salary: "8-25 LPA" },
    { title: "Business Development Manager", level: "Mid", salary: "10-30 LPA" },
    { title: "Digital Marketing Manager", level: "Mid", salary: "8-22 LPA" },
    { title: "Growth Manager", level: "Mid", salary: "12-35 LPA" },
    { title: "Content Strategist", level: "Mid", salary: "6-18 LPA" },
    { title: "SEO Specialist", level: "Mid", salary: "5-15 LPA" },
    { title: "Performance Marketing Manager", level: "Mid", salary: "10-28 LPA" },
  ],
  operations: [
    { title: "Operations Manager", level: "Mid", salary: "8-22 LPA" },
    { title: "Supply Chain Manager", level: "Mid", salary: "10-28 LPA" },
    { title: "Operations Analyst", level: "Entry/Mid", salary: "5-15 LPA" },
    { title: "Customer Success Manager", level: "Mid", salary: "8-22 LPA" },
    { title: "Technical Support Engineer", level: "Entry/Mid", salary: "4-12 LPA" },
  ],
  hr_finance: [
    { title: "HR Manager", level: "Mid", salary: "8-22 LPA" },
    { title: "Talent Acquisition Specialist", level: "Mid", salary: "6-15 LPA" },
    { title: "Financial Analyst", level: "Mid", salary: "8-22 LPA" },
    { title: "Investment Analyst", level: "Mid", salary: "10-30 LPA" },
    { title: "Risk Analyst", level: "Mid", salary: "8-22 LPA" },
    { title: "Chartered Accountant", level: "Mid", salary: "8-25 LPA" },
  ],
  internships: [
    { title: "Software Engineering Intern", level: "Intern", salary: "20K-60K/month" },
    { title: "Data Science Intern", level: "Intern", salary: "25K-50K/month" },
    { title: "Product Management Intern", level: "Intern", salary: "30K-60K/month" },
    { title: "Design Intern", level: "Intern", salary: "15K-40K/month" },
    { title: "Marketing Intern", level: "Intern", salary: "10K-25K/month" },
    { title: "Business Development Intern", level: "Intern", salary: "15K-30K/month" },
    { title: "Machine Learning Intern", level: "Intern", salary: "30K-70K/month" },
    { title: "Frontend Development Intern", level: "Intern", salary: "15K-35K/month" },
    { title: "Backend Development Intern", level: "Intern", salary: "20K-40K/month" },
    { title: "DevOps Intern", level: "Intern", salary: "20K-40K/month" },
  ],
};

const SKILLS_BY_ROLE: Record<string, string[]> = {
  "Software Engineer": ["JavaScript", "Python", "Java", "React", "Node.js", "SQL", "Git", "AWS"],
  "Data Scientist": ["Python", "Machine Learning", "SQL", "TensorFlow", "PyTorch", "Statistics", "Pandas"],
  "Product Manager": ["Product Strategy", "Agile", "User Research", "Analytics", "Roadmapping", "Stakeholder Management"],
  "DevOps Engineer": ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform", "Linux", "Python"],
  "Full Stack Developer": ["React", "Node.js", "TypeScript", "MongoDB", "PostgreSQL", "REST APIs", "Git"],
  "Machine Learning Engineer": ["Python", "TensorFlow", "PyTorch", "MLOps", "Deep Learning", "NLP", "Computer Vision"],
  "UX Designer": ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems", "Usability Testing"],
};

function generateJobDescription(role: string, company: string, companyType: string): string {
  const skills = SKILLS_BY_ROLE[role.split(" ")[0] + " " + (role.split(" ")[1] || "")] || 
                 SKILLS_BY_ROLE["Software Engineer"];
  
  return `${company} is looking for a talented ${role} to join our team. 

As a ${role}, you will:
• Design, develop, and maintain high-quality software solutions
• Collaborate with cross-functional teams to deliver impactful products
• Participate in code reviews and contribute to engineering best practices
• Drive innovation and solve complex technical challenges

Requirements:
• Strong expertise in ${skills.slice(0, 4).join(", ")}
• Experience with ${skills.slice(4).join(", ")}
• Excellent problem-solving and communication skills
• ${companyType === "Startup" || companyType === "E-commerce" ? "Startup mindset with ability to thrive in fast-paced environment" : "Experience working in enterprise environments"}

What we offer:
• Competitive compensation with ESOPs
• Health insurance for you and family
• Flexible work arrangements
• Learning & development budget
• Modern tech stack and great engineering culture`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 500, location = "all", category = "all" } = await req.json();
    
    console.log(`Generating ${count} India-focused jobs for location: ${location}, category: ${category}`);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const jobs: any[] = [];
    const allCompanies = [
      ...COMPANIES.tech_giants,
      ...COMPANIES.indian_it,
      ...COMPANIES.startups_unicorns,
      ...COMPANIES.consulting_finance,
    ];

    const allRoles = [
      ...JOB_ROLES.engineering,
      ...JOB_ROLES.data,
      ...JOB_ROLES.product,
      ...JOB_ROLES.design,
      ...JOB_ROLES.sales_marketing,
      ...JOB_ROLES.operations,
      ...JOB_ROLES.hr_finance,
      ...JOB_ROLES.internships,
    ];

    const targetLocations = location === "all" ? INDIAN_CITIES : [location];

    for (let i = 0; i < count; i++) {
      const company = allCompanies[Math.floor(Math.random() * allCompanies.length)];
      const role = allRoles[Math.floor(Math.random() * allRoles.length)];
      const city = targetLocations[Math.floor(Math.random() * targetLocations.length)];
      
      const isInternship = role.level === "Intern";
      const postedDaysAgo = Math.floor(Math.random() * 14); // Posted within last 2 weeks
      const postedDate = new Date();
      postedDate.setDate(postedDate.getDate() - postedDaysAgo);

      jobs.push({
        title: role.title,
        company: company.name,
        location: city,
        description: generateJobDescription(role.title, company.name, company.type),
        url: `https://careers.${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/jobs/${Date.now()}-${i}`,
        source: company.type === "IT Services" ? "Naukri" : 
                isInternship ? "Internshala" : 
                Math.random() > 0.5 ? "LinkedIn" : "Company Website",
        salary_range: role.salary,
        job_type: isInternship ? "internship" : "job",
        external_id: `india-${company.name.toLowerCase().replace(/\s+/g, '-')}-${role.title.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        posted_date: postedDate.toISOString(),
        fetched_at: new Date().toISOString(),
      });
    }

    console.log(`Generated ${jobs.length} jobs, inserting into database...`);

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const { error } = await supabase
        .from("job_postings")
        .upsert(batch, { onConflict: "external_id", ignoreDuplicates: true });

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        insertedCount += batch.length;
        console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} jobs`);
      }
    }

    console.log(`Successfully seeded ${insertedCount} India-focused jobs`);

    return new Response(
      JSON.stringify({
        success: true,
        jobsGenerated: jobs.length,
        jobsInserted: insertedCount,
        message: `Seeded ${insertedCount} India-focused jobs across ${targetLocations.length} cities`,
        cities: targetLocations,
        companies: allCompanies.length,
        roles: allRoles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in seed-india-jobs function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
