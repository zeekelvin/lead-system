import type {
  ContactStatus,
  DiscoveryLead,
  InterestLevel,
  LeadActivity,
  LeadActivityType,
  LeadStage,
  LeadStageKey,
  Lead,
  LeadCategory,
  OfferRecommendation,
  PriorityLabel,
  TalkTrack,
  WebsiteStatus,
} from "@/types/pipeline";

const stageDefinitions: Array<{
  key: LeadStageKey;
  label: string;
  defaultStatus: string;
}> = [
  { key: "research_done", label: "Research Done", defaultStatus: "Pending" },
  { key: "first_call_attempt", label: "First Call Attempt", defaultStatus: "Pending" },
  { key: "email_sent", label: "Email Sent", defaultStatus: "Pending" },
  { key: "discovery_call", label: "Discovery Call", defaultStatus: "Pending" },
  { key: "proposal_sent", label: "Proposal Sent", defaultStatus: "Pending" },
  { key: "follow_up", label: "Follow-Up", defaultStatus: "Pending" },
  { key: "final_decision", label: "Final Decision", defaultStatus: "Pending" },
];

export const leadStageDefinitions = [...stageDefinitions];

const defaultServicesByCategory: Record<LeadCategory, string[]> = {
  service: ["Local service page", "Fast quote request form", "Click-to-call mobile CTA"],
  retail: ["Featured inventory spotlight", "Store hours and directions", "Weekend promotion block"],
  farm: ["Seasonal availability updates", "Directions and hours", "Fresh produce highlights"],
  b2b: ["Capabilities overview", "Credibility proof section", "Simple inquiry workflow"],
};

const categoryLabels: Record<LeadCategory, string> = {
  service: "Service Business",
  retail: "Retail Shop",
  farm: "Farm / Produce",
  b2b: "B2B / Industrial",
};

const websiteWeights: Record<WebsiteStatus, number> = {
  NONE: 34,
  "FACEBOOK ONLY": 26,
  OUTDATED: 18,
  BROKEN: 38,
  ACTIVE: 6,
};

const interestWeights: Record<InterestLevel, number> = {
  LOW: 4,
  MEDIUM: 10,
  HIGH: 18,
};

const contactWeights: Record<ContactStatus, number> = {
  "NOT CONTACTED": 12,
  CALLED: 8,
  VISITED: 10,
  "FOLLOWED UP": 7,
  INTERESTED: 16,
  CLOSED: 0,
};

const categoryWeights: Record<LeadCategory, number> = {
  service: 18,
  retail: 12,
  farm: 16,
  b2b: 20,
};

export function getDefaultServices(category: LeadCategory) {
  return defaultServicesByCategory[category];
}

export function getCategoryLabel(category: LeadCategory) {
  return categoryLabels[category];
}

export function getLeadScore(lead: Lead) {
  const base =
    websiteWeights[lead.websiteStatus] +
    interestWeights[lead.interestLevel] +
    contactWeights[lead.contactStatus] +
    categoryWeights[lead.category];

  return Math.min(100, base);
}

export function getPriorityLabel(lead: Lead): PriorityLabel {
  if (lead.websiteStatus === "BROKEN") return "URGENT";
  const score = getLeadScore(lead);

  if (score >= 70) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export function getPriorityNote(lead: Lead) {
  if (lead.websiteStatus === "BROKEN") {
    return "Fix the broken customer journey first. That is immediate lost demand.";
  }

  if (lead.category === "service") {
    return "Service businesses win fast because every extra call can turn into revenue this week.";
  }

  if (lead.category === "farm") {
    return "Seasonal businesses convert best when you show how near-me traffic turns into same-week visits.";
  }

  if (lead.category === "b2b") {
    return "A small credibility upgrade can unlock a much larger contract value here.";
  }

  return "Retail leads respond best when you show tourists and new locals what they will find before they arrive.";
}

export function getOfferRecommendation(lead: Lead): OfferRecommendation {
  switch (lead.category) {
    case "service":
      return {
        name: "Customer Growth System",
        priceRange: "$1,000-$2,500",
        promise: "Turn search intent into phone calls and quote requests.",
        deliverables: [
          "Mobile-first homepage with click-to-call",
          "Simple quote request form",
          "Google visibility cleanup and local SEO basics",
        ],
      };
    case "farm":
      return {
        name: "Seasonal Traffic Launch",
        priceRange: "$900-$1,800",
        promise: "Capture near-me produce demand and keep seasonal updates current.",
        deliverables: [
          "Availability-driven homepage sections",
          "Directions, hours, and seasonal callouts",
          "Simple update workflow for farm events and inventory",
        ],
      };
    case "b2b":
      return {
        name: "Credibility + Inquiry Engine",
        priceRange: "$1,500-$3,500",
        promise: "Give buyers a clear reason to trust the business and request a quote.",
        deliverables: [
          "Capabilities-focused homepage",
          "Inquiry form and proof section",
          "Clean positioning for higher-ticket sales",
        ],
      };
    default:
      return {
        name: "Local Visibility Setup",
        priceRange: "$500-$1,200",
        promise: "Get foot traffic and discovery working for the business again.",
        deliverables: [
          "One-page site with store details and click-to-call",
          "Featured inventory or destination section",
          "Google Business polish and a simple local SEO pass",
        ],
      };
  }
}

export function buildTalkTrack(lead: Lead): TalkTrack {
  const offer = getOfferRecommendation(lead);
  const value =
    lead.category === "service"
      ? "This makes it easy for people to call, request a quote, and choose you from their phone."
      : lead.category === "farm"
        ? "This gives people a reason to visit this week instead of guessing whether you are open or in season."
        : lead.category === "b2b"
          ? "This gives buyers a credible first impression and a clear way to start a serious conversation."
          : "This lets people see what makes the business worth visiting before they decide where to go.";

  const close = `I can launch something like this for ${offer.priceRange} depending on how much of the system you want turned on.`;

  return {
    walkIn: `Hey, I help local businesses around ${lead.city} get more customers through Google and simple websites. I noticed ${lead.proof.toLowerCase()}. ${lead.angle} I mocked up a quick version of how ${lead.businessName} could look online and bring in more calls or visits.`,
    call: `Hi, is this ${lead.businessName}? My name is Kelvin. I work with local businesses in and around ${lead.city}. Quick question: are you getting customers from Google right now, or mostly from word of mouth? The reason I ask is that ${lead.angle.toLowerCase()}`,
    text: `Hey, this is Kelvin. I work with local businesses around ${lead.city}. I noticed ${lead.proof.toLowerCase()} for ${lead.businessName}. I put together a quick idea that could help bring in more calls and visits. Want me to send it over?`,
    emailSubject: `${lead.businessName}: quick idea to help more local customers find you`,
    emailBody: `Hi ${lead.businessName} team,\n\nI help local businesses around ${lead.city} get more customers through Google and simple websites.\n\nI noticed ${lead.proof.toLowerCase()}. ${lead.angle}\n\nI mocked up a quick concept for how ${lead.businessName} could look online with a stronger phone CTA, a cleaner overview of your services, and an easier way for customers to reach you.\n\nIf you want, I can show you the example in 10 minutes.\n\nKelvin`,
    value,
    close,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function createId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`
}

export function createActivity(
  type: LeadActivityType,
  note: string,
  timestamp = new Date().toISOString(),
): LeadActivity {
  return {
    id: createId("activity"),
    type,
    note,
    timestamp,
  }
}

export function createDefaultStageTracker(
  source: "seed" | "manual" | "google_places" = "manual",
): LeadStage[] {
  return stageDefinitions.map((stage) => {
    if (stage.key === "research_done" && source !== "manual") {
      return {
        ...stage,
        status: "Done",
        note:
          source === "seed"
            ? "Loaded from the original seed brief."
            : "Imported from a live search result.",
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ...stage,
      status: stage.defaultStatus,
      note: "",
      updatedAt: null,
    };
  });
}

export function normalizeStageTracker(
  stageTracker: LeadStage[] | undefined,
  source: "seed" | "manual" | "google_places",
) {
  const defaults = createDefaultStageTracker(source);

  return defaults.map((stage) => {
    const existing = stageTracker?.find((item) => item.key === stage.key);
    return existing
      ? {
          ...stage,
          status: existing.status || stage.status,
          note: existing.note || "",
          updatedAt: existing.updatedAt || null,
        }
      : stage;
  });
}

function deriveContactStatusFromStages(stageTracker: LeadStage[]): ContactStatus {
  const finalDecision = stageTracker.find((stage) => stage.key === "final_decision")?.status;
  if (finalDecision && finalDecision !== "Pending" && finalDecision !== "Nurture Later") {
    return "CLOSED";
  }

  const discoveryStatus = stageTracker.find((stage) => stage.key === "discovery_call")?.status;
  const callStatus = stageTracker.find((stage) => stage.key === "first_call_attempt")?.status;
  const followUpStatus = stageTracker.find((stage) => stage.key === "follow_up")?.status;

  if (discoveryStatus === "Completed" || discoveryStatus === "Scheduled") {
    return "INTERESTED";
  }

  if (followUpStatus === "Responded" || followUpStatus === "Attempted") {
    return "FOLLOWED UP";
  }

  if (
    callStatus === "Interested" ||
    callStatus === "Call Scheduled" ||
    callStatus === "Left Voicemail" ||
    callStatus === "No Answer"
  ) {
    return "CALLED";
  }

  return "NOT CONTACTED";
}

export function normalizeLead(lead: Lead): Lead {
  const normalizedSource = lead.source ?? "manual";
  const stageTracker = normalizeStageTracker(lead.stageTracker, normalizedSource);
  const activities = lead.activities ?? [];
  const stageDrivenStatus = deriveContactStatusFromStages(stageTracker);
  const hasVisitedActivity = activities.some((activity) => activity.type === "visited");
  const hasProcessedActivity = activities.some((activity) => activity.type === "processed");
  const hasInProgressActivity = activities.some((activity) => activity.type === "in_progress");
  const derivedContactStatus: ContactStatus = hasProcessedActivity
    ? "CLOSED"
    : lead.contactStatus === "CLOSED" || stageDrivenStatus === "CLOSED"
      ? "CLOSED"
      : hasVisitedActivity || lead.contactStatus === "VISITED"
        ? "VISITED"
        : stageDrivenStatus !== "NOT CONTACTED"
          ? stageDrivenStatus
          : hasInProgressActivity
            ? "FOLLOWED UP"
            : lead.contactStatus === "CALLED" ||
                lead.contactStatus === "FOLLOWED UP" ||
                lead.contactStatus === "INTERESTED"
              ? lead.contactStatus
              : "NOT CONTACTED";

  return {
    ...lead,
    createdAt: lead.createdAt ?? new Date().toISOString(),
    source: normalizedSource,
    placeId: lead.placeId ?? null,
    websiteUri: lead.websiteUri ?? null,
    mapsUrl: lead.mapsUrl ?? null,
    searchOrigin: lead.searchOrigin ?? null,
    lastProcessedAt: lead.lastProcessedAt ?? null,
    contactStatus: derivedContactStatus,
    activities:
      activities.length > 0
        ? activities
        : [createActivity("created", "Lead added to pipeline.", lead.createdAt ?? new Date().toISOString())],
    stageTracker,
  };
}

export function toCsv(leads: Lead[]) {
  const header = [
    "Business Name",
    "City",
    "Phone",
    "Email",
    "Category",
    "Website Status",
    "Google Rating",
    "Contact Status",
    "Interest Level",
    "Deal Value",
    "Next Action",
    "Notes",
  ];

  const rows = leads.map((lead) => [
    lead.businessName,
    lead.city,
    lead.phone,
    lead.email,
    getCategoryLabel(lead.category),
    lead.websiteStatus,
    lead.googleRating,
    lead.contactStatus,
    lead.interestLevel,
    String(lead.dealValue),
    lead.nextAction,
    lead.notes,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function createLeadDraft(category: LeadCategory = "service") {
  return {
    businessName: "",
    city: "",
    category,
    websiteStatus: "NONE" as WebsiteStatus,
    dealValue: category === "b2b" ? 3000 : 1200,
    nextAction: "",
    angle: "",
  };
}

export function createLeadFromDraft(
  draft: ReturnType<typeof createLeadDraft>,
): Lead {
  return {
    id: createId("lead"),
    createdAt: new Date().toISOString(),
    businessName: draft.businessName.trim() || "New lead",
    city: draft.city.trim() || "United States",
    phone: "",
    email: "",
    category: draft.category,
    websiteStatus: draft.websiteStatus,
    googleRating: "N/A",
    contactStatus: "NOT CONTACTED",
    interestLevel: "MEDIUM",
    dealValue: draft.dealValue,
    nextAction:
      draft.nextAction.trim() || "Verify the listing, then make the first outreach attempt",
    notes: "",
    angle:
      draft.angle.trim() ||
      "A stronger local web presence would make it easier for customers to discover and contact the business.",
    yearsActive: "Established local business",
    proof: deriveProofFromStatus(draft.websiteStatus),
    services: [...getDefaultServices(draft.category)],
    source: "manual",
    placeId: null,
    websiteUri: null,
    mapsUrl: null,
    searchOrigin: null,
    lastProcessedAt: null,
    activities: [createActivity("created", "Lead added manually to the pipeline.")],
    stageTracker: createDefaultStageTracker("manual"),
  }
}

export function createLeadFromDiscovery(result: DiscoveryLead): Lead {
  const category = inferCategoryFromQuery(result.query)
  const note = `Imported from live search for "${result.query}" in ${result.location}.`

  return {
    id: createId("lead"),
    createdAt: new Date().toISOString(),
    businessName: result.businessName,
    city: result.city || result.location,
    phone: result.phone,
    email: "",
    category,
    websiteStatus: result.websiteUri ? "ACTIVE" : "NONE",
    googleRating: result.rating,
    contactStatus: "NOT CONTACTED",
    interestLevel: "MEDIUM",
    dealValue: category === "b2b" ? 3000 : category === "service" ? 1500 : 1200,
    nextAction: `Verify the listing and make the first outreach attempt for ${result.businessName}.`,
    notes: `${note} Business status: ${result.businessStatus || "Unknown"}.`,
    angle:
      result.websiteUri
        ? "The business has a website but still needs a stronger local growth angle."
        : "Google does not show a website for this business, which makes it a strong local lead candidate.",
    yearsActive: "Unknown",
    proof:
      result.websiteUri
        ? `Google Places returned a website: ${result.websiteUri}`
        : "Google Places did not return a website for this business.",
    services: [...getDefaultServices(category)],
    source: "google_places",
    placeId: result.placeId,
    websiteUri: result.websiteUri,
    mapsUrl: result.mapsUrl,
    searchOrigin: `${result.query} in ${result.location}`,
    lastProcessedAt: null,
    activities: [createActivity("imported", note)],
    stageTracker: createDefaultStageTracker("google_places"),
  }
}

function inferCategoryFromQuery(query: string): LeadCategory {
  const normalized = query.toLowerCase()
  if (
    normalized.includes("farm") ||
    normalized.includes("produce") ||
    normalized.includes("garden")
  ) {
    return "farm"
  }

  if (
    normalized.includes("manufact") ||
    normalized.includes("machine") ||
    normalized.includes("packag") ||
    normalized.includes("fabricat")
  ) {
    return "b2b"
  }

  if (
    normalized.includes("shop") ||
    normalized.includes("thrift") ||
    normalized.includes("boutique") ||
    normalized.includes("antique")
  ) {
    return "retail"
  }

  return "service"
}

export function appendLeadActivity(
  lead: Lead,
  type: LeadActivityType,
  note: string,
): Lead {
  const timestamp = new Date().toISOString()
  const nextContactStatus =
    type === "visited"
      ? "VISITED"
      : type === "processed"
        ? "CLOSED"
        : type === "in_progress" && lead.contactStatus === "NOT CONTACTED"
          ? "CALLED"
          : type === "in_progress" && lead.contactStatus !== "CLOSED"
            ? "FOLLOWED UP"
            : lead.contactStatus

  return {
    ...lead,
    contactStatus: nextContactStatus,
    lastProcessedAt: type === "processed" ? timestamp : lead.lastProcessedAt,
    activities: [...lead.activities, createActivity(type, note, timestamp)],
  }
}

export function updateLeadStage(
  lead: Lead,
  stageKey: LeadStageKey,
  status: string,
  note?: string,
): Lead {
  const timestamp = new Date().toISOString()
  const nextStageTracker = lead.stageTracker.map((stage) =>
    stage.key === stageKey
      ? {
          ...stage,
          status,
          note: note ?? stage.note,
          updatedAt: timestamp,
        }
      : stage,
  )

  const nextActivities = [...lead.activities]
  const stage = nextStageTracker.find((item) => item.key === stageKey)
  if (stage && status !== "Pending") {
    nextActivities.push(
      createActivity(
        status === "Won" || status.startsWith("Lost") ? "processed" : "note",
        `${stage.label}: ${status}${stage.note ? ` - ${stage.note}` : ""}`,
        timestamp,
      ),
    )
  }

  const nextContactStatus =
    stageKey === "final_decision" && status !== "Pending" && status !== "Nurture Later"
      ? "CLOSED"
      : stageKey === "first_call_attempt" && status !== "Pending"
        ? "CALLED"
        : stageKey === "discovery_call" && status !== "Pending"
          ? "INTERESTED"
          : stageKey === "follow_up" && status !== "Pending"
            ? "FOLLOWED UP"
            : lead.contactStatus

  return {
    ...lead,
    contactStatus: nextContactStatus,
    lastProcessedAt:
      stageKey === "final_decision" && status !== "Pending" && status !== "Nurture Later"
        ? timestamp
        : lead.lastProcessedAt,
    stageTracker: nextStageTracker,
    activities: nextActivities,
  }
}

export function getHotLeads(leads: Lead[]) {
  return leads.filter(
    (lead) => lead.contactStatus !== "CLOSED" && ["URGENT", "HIGH"].includes(getPriorityLabel(lead)),
  );
}

export function getLeadWorkflowLabel(lead: Lead) {
  if (lead.contactStatus === "VISITED") return "Visited"
  if (lead.contactStatus === "CLOSED") return "Processed"
  if (
    lead.contactStatus === "CALLED" ||
    lead.contactStatus === "FOLLOWED UP" ||
    lead.contactStatus === "INTERESTED"
  ) {
    return "In Progress"
  }
  return "New"
}

export function findLeadByPlaceOrName(
  leads: Lead[],
  placeId: string,
  businessName: string,
  city: string,
) {
  const normalizedName = businessName.trim().toLowerCase()
  const normalizedCity = city.trim().toLowerCase()

  return leads.find((lead) => {
    if (lead.placeId && placeId && lead.placeId === placeId) return true
    return (
      lead.businessName.trim().toLowerCase() === normalizedName &&
      lead.city.trim().toLowerCase() === normalizedCity
    )
  })
}

function deriveProofFromStatus(websiteStatus: WebsiteStatus) {
  switch (websiteStatus) {
    case "NONE":
      return "there is no working website in the search path";
    case "FACEBOOK ONLY":
      return "Facebook is doing the job a real website should be doing";
    case "OUTDATED":
      return "the current site looks outdated and creates friction";
    case "BROKEN":
      return "the current web path is broken and sending customers nowhere useful";
    default:
      return "the current digital presence is underpowered";
  }
}

export function buildDemoHeadline(lead: Lead) {
  switch (lead.category) {
    case "service":
      return `Get more ${lead.city} calls without paying for ads`;
    case "farm":
      return `Turn local searches into same-week farm visits`;
    case "b2b":
      return `Make ${lead.businessName} look as credible online as it is in person`;
    default:
      return `Help more people discover ${lead.businessName} before they drive by`;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildLeadBriefEmail(lead: Lead) {
  const offer = getOfferRecommendation(lead);
  const talkTrack = buildTalkTrack(lead);
  const score = getLeadScore(lead);
  const priority = getPriorityLabel(lead);

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f6efe7; padding:32px; color:#1d1a16;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #ead7c7;">
        <div style="padding:28px 28px 18px; background:linear-gradient(135deg, #1f4f3d, #cc6b2c); color:#fff8f2;">
          <p style="margin:0; font-size:12px; letter-spacing:0.24em; text-transform:uppercase;">ZagaPrime Lead Brief</p>
          <h1 style="margin:12px 0 8px; font-size:28px; line-height:1.15;">${escapeHtml(lead.businessName)}</h1>
          <p style="margin:0; font-size:15px; opacity:0.92;">${escapeHtml(getCategoryLabel(lead.category))} in ${escapeHtml(lead.city)}</p>
        </div>
        <div style="padding:28px;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;"><strong>Priority</strong></td>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;">${escapeHtml(priority)} (${score}/100)</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;"><strong>Website Status</strong></td>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;">${escapeHtml(lead.websiteStatus)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;"><strong>Next Action</strong></td>
              <td style="padding:10px 0; border-bottom:1px solid #ead7c7;">${escapeHtml(lead.nextAction)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;"><strong>Offer</strong></td>
              <td style="padding:10px 0;">${escapeHtml(offer.name)} (${escapeHtml(offer.priceRange)})</td>
            </tr>
          </table>

          <h2 style="margin:0 0 8px; font-size:18px;">Why this lead matters</h2>
          <p style="margin:0 0 18px; line-height:1.7;">${escapeHtml(lead.angle)}</p>

          <h2 style="margin:0 0 8px; font-size:18px;">Proof to reference</h2>
          <p style="margin:0 0 18px; line-height:1.7;">${escapeHtml(lead.proof)}</p>

          <h2 style="margin:0 0 8px; font-size:18px;">Offer recommendation</h2>
          <ul style="padding-left:20px; line-height:1.7; margin:0 0 18px;">
            ${offer.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>

          <h2 style="margin:0 0 8px; font-size:18px;">Talk track</h2>
          <p style="margin:0 0 12px; line-height:1.7;"><strong>Call opener:</strong> ${escapeHtml(talkTrack.call)}</p>
          <p style="margin:0 0 12px; line-height:1.7;"><strong>Value line:</strong> ${escapeHtml(talkTrack.value)}</p>
          <p style="margin:0; line-height:1.7;"><strong>Close:</strong> ${escapeHtml(talkTrack.close)}</p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `ZagaPrime Lead Brief: ${lead.businessName}`,
    "",
    `Category: ${getCategoryLabel(lead.category)}`,
    `City: ${lead.city}`,
    `Priority: ${priority} (${score}/100)`,
    `Website Status: ${lead.websiteStatus}`,
    `Next Action: ${lead.nextAction}`,
    `Offer: ${offer.name} (${offer.priceRange})`,
    "",
    `Angle: ${lead.angle}`,
    `Proof: ${lead.proof}`,
    "",
    "Deliverables:",
    ...offer.deliverables.map((item) => `- ${item}`),
    "",
    `Call opener: ${talkTrack.call}`,
    `Value line: ${talkTrack.value}`,
    `Close: ${talkTrack.close}`,
  ].join("\n");

  return { html, text };
}
