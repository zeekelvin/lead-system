export const leadCategories = ["service", "retail", "farm", "b2b"] as const;
export const websiteStatuses = [
  "NONE",
  "FACEBOOK ONLY",
  "OUTDATED",
  "BROKEN",
  "ACTIVE",
] as const;
export const contactStatuses = [
  "NOT CONTACTED",
  "CALLED",
  "VISITED",
  "FOLLOWED UP",
  "INTERESTED",
  "CLOSED",
] as const;
export const interestLevels = ["LOW", "MEDIUM", "HIGH"] as const;
export const priorityLabels = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export const leadSources = ["seed", "manual", "google_places"] as const;
export const leadActivityTypes = [
  "created",
  "imported",
  "searched",
  "in_progress",
  "visited",
  "processed",
  "note",
] as const;
export const leadStageKeys = [
  "research_done",
  "first_call_attempt",
  "email_sent",
  "discovery_call",
  "proposal_sent",
  "follow_up",
  "final_decision",
] as const;

export type LeadCategory = (typeof leadCategories)[number];
export type WebsiteStatus = (typeof websiteStatuses)[number];
export type ContactStatus = (typeof contactStatuses)[number];
export type InterestLevel = (typeof interestLevels)[number];
export type PriorityLabel = (typeof priorityLabels)[number];
export type LeadSource = (typeof leadSources)[number];
export type LeadActivityType = (typeof leadActivityTypes)[number];
export type LeadStageKey = (typeof leadStageKeys)[number];

export type LeadActivity = {
  id: string;
  type: LeadActivityType;
  note: string;
  timestamp: string;
};

export type LeadStage = {
  key: LeadStageKey;
  label: string;
  status: string;
  note: string;
  updatedAt: string | null;
};

export type Lead = {
  id: string;
  createdAt: string;
  businessName: string;
  city: string;
  phone: string;
  email: string;
  category: LeadCategory;
  websiteStatus: WebsiteStatus;
  googleRating: string;
  contactStatus: ContactStatus;
  interestLevel: InterestLevel;
  dealValue: number;
  nextAction: string;
  notes: string;
  angle: string;
  yearsActive: string;
  proof: string;
  services: string[];
  source: LeadSource;
  placeId: string | null;
  websiteUri: string | null;
  mapsUrl: string | null;
  searchOrigin: string | null;
  lastProcessedAt: string | null;
  activities: LeadActivity[];
  stageTracker: LeadStage[];
};

export type OfferRecommendation = {
  name: string;
  priceRange: string;
  promise: string;
  deliverables: string[];
};

export type TalkTrack = {
  walkIn: string;
  call: string;
  text: string;
  emailSubject: string;
  emailBody: string;
  value: string;
  close: string;
};

export type LeadSearchHistoryItem = {
  id: string;
  query: string;
  location: string;
  searchedAt: string;
  totalCandidates: number;
  actionableCount: number;
  importedLeadIds: string[];
};

export type DiscoveryLead = {
  placeId: string;
  businessName: string;
  formattedAddress: string;
  city: string;
  state: string;
  phone: string;
  rating: string;
  userRatingCount: number;
  websiteUri: string | null;
  mapsUrl: string | null;
  businessStatus: string;
  primaryType: string;
  query: string;
  location: string;
  isActionableNoWebsite: boolean;
  websiteDecision: string;
};
