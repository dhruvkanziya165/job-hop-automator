/**
 * Job application utility functions
 * Handles URL validation, apply type classification, and link sanitization
 */

export type ApplyType = "direct" | "manual" | "unsupported";

export interface ApplyTypeResult {
  type: ApplyType;
  label: string;
  description: string;
  badgeColor: string;
}

// Domains that always require login
const LOGIN_REQUIRED_DOMAINS = [
  "linkedin.com",
  "greenhouse.io",
  "lever.co",
  "workday.com",
  "icims.com",
  "taleo.net",
  "successfactors.com",
  "myworkdayjobs.com",
  "smartrecruiters.com",
  "ashbyhq.com",
  "bamboohr.com",
  "jazz.co",
  "jobvite.com",
  "ultipro.com",
  "breezy.hr",
  "naukri.com",
  "internshala.com",
  "glassdoor.com",
  "indeed.com",
  "monster.com",
  "ziprecruiter.com",
  "wellfound.com",
  "angel.co",
];

// Domains known to have simple apply forms (rare, but some exist)
const SIMPLE_APPLY_DOMAINS = [
  "remoteok.com",
  "weworkremotely.com",
];

/**
 * Validates whether a job URL is a real, working link
 */
export const isValidJobUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  const trimmed = url.trim();
  
  // Reject empty, hash-only, or placeholder URLs
  if (
    trimmed === "" ||
    trimmed === "#" ||
    trimmed.startsWith("#") ||
    trimmed === "javascript:void(0)" ||
    trimmed === "about:blank" ||
    trimmed.includes("example.com") ||
    trimmed.includes("placeholder")
  ) {
    return false;
  }

  // Must start with http:// or https://
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    // Must have a valid hostname with at least one dot
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
};

/**
 * Classifies how a job can be applied to based on its URL
 */
export const classifyApplyType = (url: string): ApplyTypeResult => {
  if (!isValidJobUrl(url)) {
    return {
      type: "unsupported",
      label: "Unsupported",
      description: "This job has an invalid or broken link. Please search for it manually.",
      badgeColor: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Check if it requires login
    const requiresLogin = LOGIN_REQUIRED_DOMAINS.some((domain) =>
      hostname.includes(domain)
    );

    if (requiresLogin) {
      return {
        type: "manual",
        label: "Manual Apply",
        description:
          "This application requires you to sign in on the company's website. We'll open the page for you to apply directly.",
        badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200",
      };
    }

    // Check for simple apply domains
    const isSimple = SIMPLE_APPLY_DOMAINS.some((domain) =>
      hostname.includes(domain)
    );

    if (isSimple) {
      return {
        type: "direct",
        label: "Direct Apply",
        description: "You can apply directly through this job posting.",
        badgeColor: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200",
      };
    }

    // Default: manual apply (most real jobs require some form of login/account)
    return {
      type: "manual",
      label: "Manual Apply",
      description:
        "This application may require you to create an account on the company's website.",
      badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200",
    };
  } catch {
    return {
      type: "unsupported",
      label: "Unsupported",
      description: "Could not process this job URL.",
      badgeColor: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
};

/**
 * Clean markdown artifacts from scraped text
 */
export const cleanMarkdownText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_]/g, "")
    .trim();
};
