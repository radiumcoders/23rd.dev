export { LEGAL_CONTACT_EMAIL as SUPPORT_EMAIL } from "@/lib/legal"

/** Same secondary links shadscan puts in the site footer. */
export const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const
