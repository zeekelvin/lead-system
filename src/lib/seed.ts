import { createDefaultStageTracker } from "@/lib/pipeline";
import type { Lead, LeadActivity } from "@/types/pipeline";

export const storageKey = "zagaprime-local-growth-os-v2";
export const searchHistoryStorageKey = "zagaprime-local-growth-search-history-v1";

function createSeedActivity(note: string, timestamp: string): LeadActivity {
  return {
    id: `activity-${timestamp}`,
    type: "created",
    note,
    timestamp,
  };
}

function createSeedLead(
  lead: Omit<
    Lead,
    | "source"
    | "placeId"
    | "websiteUri"
    | "mapsUrl"
    | "searchOrigin"
    | "lastProcessedAt"
    | "activities"
    | "stageTracker"
  > & { createdAt: string },
) {
  return {
    ...lead,
    source: "seed" as const,
    placeId: null,
    websiteUri: null,
    mapsUrl: null,
    searchOrigin: "Original Andover / Sussex County brief",
    lastProcessedAt: null,
    activities: [
      createSeedActivity("Imported from the original GPT/Claude lead brief.", lead.createdAt),
    ],
    stageTracker: createDefaultStageTracker("seed"),
  };
}

export const seedLeads: Lead[] = [
  createSeedLead({
    id: "made-in-the-shade",
    createdAt: "2026-03-31T02:00:00.000Z",
    businessName: "Made In the Shade",
    city: "Andover",
    phone: "",
    email: "",
    category: "retail",
    websiteStatus: "BROKEN",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "HIGH",
    dealValue: 1600,
    nextAction: "Urgent call about the wrong website and a corrected customer journey demo",
    notes:
      "Antique and lamp shop on Main St. Current listing points to an unrelated business, so searchers are being sent away.",
    angle:
      "People are trying to find you online and getting routed to the wrong business.",
    yearsActive: "25+ years serving Andover",
    proof: "The listed website sends customers to an unrelated jewelry business",
    services: [
      "Vintage lighting gallery",
      "Repair and sourcing inquiries",
      "Directions, hours, and click-to-call",
    ],
  }),
  createSeedLead({
    id: "green-visions-landscaping",
    createdAt: "2026-03-31T02:05:00.000Z",
    businessName: "Green Visions Landscaping",
    city: "Sussex County",
    phone: "",
    email: "",
    category: "service",
    websiteStatus: "NONE",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "HIGH",
    dealValue: 1800,
    nextAction: "Call with a search visibility pitch and a quick quote-form mockup",
    notes:
      "Lawn care company since 2001 with directory listings marked unclaimed and no working website.",
    angle:
      "If someone searches landscaping near you, your competitors show up first and win by default.",
    yearsActive: "Since 2001",
    proof: "No website and unclaimed directory listings",
    services: ["Lawn care", "Seasonal cleanup", "Landscape maintenance"],
  }),
  createSeedLead({
    id: "cahills-farm",
    createdAt: "2026-03-31T02:10:00.000Z",
    businessName: "Cahill's Farm",
    city: "Andover",
    phone: "",
    email: "",
    category: "farm",
    websiteStatus: "FACEBOOK ONLY",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "HIGH",
    dealValue: 1400,
    nextAction: "Visit in person with a seasonal produce and events homepage demo",
    notes:
      "Family farm and garden center operating since 1977. Facebook is their main online footprint.",
    angle:
      "People are searching for farms near them every day and you are not showing up where that demand happens.",
    yearsActive: "Since 1977",
    proof: "Facebook is the only active destination people can find",
    services: [
      "Seasonal produce updates",
      "Garden center directions",
      "Fresh availability announcements",
    ],
  }),
  createSeedLead({
    id: "great-andover-antique-village",
    createdAt: "2026-03-31T02:15:00.000Z",
    businessName: "Great Andover Antique Village",
    city: "Andover",
    phone: "",
    email: "",
    category: "retail",
    websiteStatus: "FACEBOOK ONLY",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "MEDIUM",
    dealValue: 1200,
    nextAction: "Walk in and show a tourist-focused antique destination mockup",
    notes:
      "Multi-building antique complex on Main St. with strong foot traffic but weak web discovery.",
    angle:
      "You should be showing up when people search for antique shops near me before they head into town.",
    yearsActive: "Long-running Main Street destination",
    proof: "Relies on Facebook and directory listings instead of a real website",
    services: [
      "Vendor spotlight pages",
      "Hours and parking info",
      "Weekend events and featured finds",
    ],
  }),
  createSeedLead({
    id: "restyle-resale-boutique",
    createdAt: "2026-03-31T02:20:00.000Z",
    businessName: "ReStyle ReSale Boutique",
    city: "Andover",
    phone: "",
    email: "",
    category: "retail",
    websiteStatus: "NONE",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "MEDIUM",
    dealValue: 1100,
    nextAction: "Visit with an Instagram-first landing page concept",
    notes:
      "Vintage clothing boutique with 15+ years in business, no website, and very little searchable contact info.",
    angle:
      "You already have inventory people want. They just cannot find or preview it online.",
    yearsActive: "15+ years in business",
    proof: "No website and no public phone number anywhere online",
    services: [
      "New arrivals highlights",
      "Consignment inquiry form",
      "Location, hours, and parking",
    ],
  }),
  createSeedLead({
    id: "apc-thrift-store",
    createdAt: "2026-03-31T02:25:00.000Z",
    businessName: "APC Thrift Store",
    city: "Andover",
    phone: "",
    email: "",
    category: "retail",
    websiteStatus: "NONE",
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "MEDIUM",
    dealValue: 900,
    nextAction: "Visit with a trust-building page that covers hours, donations, and featured finds",
    notes:
      "Barely visible online with a thin Maps presence and almost no trust signals for new shoppers.",
    angle:
      "Even a simple page would give shoppers and donors a reason to visit regularly.",
    yearsActive: "Established local thrift presence",
    proof: "Bare Google Maps pin with no website and no review momentum",
    services: ["Donation details", "Store hours", "Daily specials and featured finds"],
  }),
];

export const dailyExecutionChecklist = [
  "Find 10 to 15 local businesses with no website, a broken website, or Facebook-only presence.",
  "Verify the website status in Google before you spend time pitching the lead.",
  "Contact 5 to 10 businesses through walk-ins, calls, or quick follow-up texts.",
  "Build one tailored demo homepage before your next live conversation.",
  "Log the next action for every lead so nothing sits idle in the pipeline.",
];

export const offerLadder = [
  {
    name: "Local Visibility Setup",
    price: "$500-$1,000",
    summary:
      "One-page website, call button, Google Business polish, and basic local SEO.",
  },
  {
    name: "Customer Growth System",
    price: "$1,000-$2,500",
    summary:
      "Lead form, stronger service pages, search visibility work, and a sharper demo-to-close offer.",
  },
  {
    name: "Growth Ops Support",
    price: "$2,500+",
    summary:
      "Automation, booking flows, AI chat, and ongoing support once the first wins are live.",
  },
];
