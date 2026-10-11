// Cache tags for public content. Shared by the cached readers and the admin, so a save
// always invalidates exactly what the public pages read.
export const TAGS = {
  settings: "settings",
  blocks: "blocks",
  projects: "projects",
  capabilities: "capabilities",
  services: "services",
  process: "process",
  experience: "experience",
  skills: "skills",
  faqs: "faqs",
} as const;
