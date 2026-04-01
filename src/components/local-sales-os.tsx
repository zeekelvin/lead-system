"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import {
  appendLeadActivity,
  buildDemoHeadline,
  buildLeadBriefEmail,
  buildTalkTrack,
  createLeadDraft,
  createLeadFromDiscovery,
  createLeadFromDraft,
  findLeadByPlaceOrName,
  formatCurrency,
  getCategoryLabel,
  getLeadScore,
  getHotLeads,
  getOfferRecommendation,
  getPriorityLabel,
  getPriorityNote,
  getLeadWorkflowLabel,
  leadStageDefinitions,
  normalizeLead,
  toCsv,
  updateLeadStage,
} from "@/lib/pipeline";
import {
  dailyExecutionChecklist,
  offerLadder,
  searchHistoryStorageKey,
  seedLeads,
  storageKey,
} from "@/lib/seed";
import type {
  ContactStatus,
  DiscoveryLead,
  Lead,
  LeadSearchHistoryItem,
  LeadStage,
  LeadStageKey,
  LeadCategory,
  PriorityLabel,
  WebsiteStatus,
} from "@/types/pipeline";
import {
  contactStatuses,
  interestLevels,
  leadCategories,
  websiteStatuses,
} from "@/types/pipeline";

type DraftLead = ReturnType<typeof createLeadDraft>;
type FilterCategory = LeadCategory | "all";
type FilterStatus = ContactStatus | "all";
type SummaryFilter = "all" | "hot" | "open" | "focus";
type WorkboardTab = "opener" | "hook" | "offer" | "email" | "voicemail" | "objections";

const summaryFilterLabels: Record<SummaryFilter, string> = {
  all: "All leads",
  hot: "Hot opportunities",
  open: "Open pipeline",
  focus: "Best next swing",
};

const inputClass =
  "w-full rounded-[18px] border border-line bg-white/80 px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:bg-white";

const stageStatusOptions: Record<LeadStageKey, string[]> = {
  research_done: ["Pending", "Done"],
  first_call_attempt: [
    "Pending",
    "No Answer",
    "Left Voicemail",
    "Not Interested",
    "Interested",
    "Call Scheduled",
  ],
  email_sent: ["Pending", "Sent", "No Email Found"],
  discovery_call: ["Pending", "Scheduled", "Completed", "Cancelled", "Skip"],
  proposal_sent: ["Pending", "Proposal Sent", "Not Ready Yet"],
  follow_up: ["Pending", "Attempted", "Responded", "Ghosted"],
  final_decision: [
    "Pending",
    "Won",
    "Lost - Price",
    "Lost - Timing",
    "Lost - Competitor",
    "Nurture Later",
  ],
};

function hasActivity(lead: Lead, type: "visited" | "in_progress" | "processed") {
  return lead.activities.some((activity) => activity.type === type);
}

function getTrackedLeadTone(lead: Lead) {
  if (lead.contactStatus === "CLOSED") return "border-line bg-[#f5f0ea]";
  if (hasActivity(lead, "visited")) return "border-accent-2/40 bg-[#fff5ec]";
  if (getLeadWorkflowLabel(lead) === "In Progress") return "border-accent bg-[#f4fbf7]";
  return "border-line bg-white/72";
}

function getStageOptionClass(isActive: boolean, status: string) {
  if (isActive && (status === "Won" || status === "Done" || status === "Completed" || status === "Sent")) {
    return "border-accent bg-accent text-white";
  }

  if (isActive && status.startsWith("Lost")) {
    return "border-red-500 bg-red-600 text-white";
  }

  if (isActive && status === "Nurture Later") {
    return "border-accent-2 bg-accent-2 text-white";
  }

  if (isActive && status !== "Pending") {
    return "border-foreground bg-foreground text-white";
  }

  return "border-line bg-white text-foreground hover:bg-[#f6efe7]";
}

function describeLeadProblem(lead: Lead) {
  switch (lead.websiteStatus) {
    case "BROKEN":
      return "your current web path is broken or routing people to the wrong place";
    case "NONE":
      return "people can find the business, but they have nowhere solid to click once they do";
    case "FACEBOOK ONLY":
      return "Facebook is acting like the website, which means you are losing search intent";
    case "OUTDATED":
      return "the current site creates friction and makes the business look older than it is";
    default:
      return "the current digital setup is not converting search attention into calls";
  }
}

function buildUrgentOpener(lead: Lead) {
  if (lead.websiteStatus !== "BROKEN") return "";

  return `URGENT Opener - Broken Website\nHey, is this the owner of ${lead.businessName}?\n\nHey - my name is Kelvin Osazee from ZagaPrime | Apex Builders. I'm calling because I was doing research on local ${lead.city} businesses and I came across something about ${lead.businessName} that you probably do not know about, and it is actively hurting your business. Got 60 seconds?`;
}

function buildStandardOpener(lead: Lead) {
  return `Standard Cold Call Opener\nHey, is this the owner of ${lead.businessName}?\n\nHey - my name is Kelvin Osazee, calling from ZagaPrime | Apex Builders. We help local businesses turn Google searches into calls and booked jobs. Super quick - got about 60 seconds?\n\nIf yes: go to the hook.\nIf busy: ask for a better callback time.\nIf they ask who this is: "I'm Kelvin Osazee from ZagaPrime | Apex Builders. I came across ${lead.businessName} while doing local research and noticed something I thought you would want to know about. Two minutes?"`;
}

function buildHookScript(lead: Lead) {
  return `The reason I am calling is simple: ${describeLeadProblem(lead)}. When someone searches for a business like yours in ${lead.city}, the first impression should make it easy to trust you, call you, and pick you. Right now that handoff is weak, and it is costing you real customers.`;
}

function buildOfferScript(lead: Lead) {
  const offer = getOfferRecommendation(lead);

  return `${offer.name} - ${offer.priceRange}\nThis is built to help ${lead.businessName} get more qualified ${lead.category === "service" ? "calls and quote requests" : lead.category === "retail" ? "store visits" : lead.category === "farm" ? "same-week visits" : "inquiries and serious conversations"}.\n\nDeliverables:\n- ${offer.deliverables.join("\n- ")}\n\nClose: I can build and launch this quickly, keep it simple for your team, and make sure the next customer knows exactly why they should choose ${lead.businessName}.`;
}

function buildVoicemailScript(lead: Lead) {
  return `Hey, this is Kelvin Osazee from ZagaPrime | Apex Builders calling for ${lead.businessName}. I was doing some local research and noticed ${describeLeadProblem(lead)}. I put together a quick idea that could help you turn more searches into calls and customers. Call me back when you get a chance - I can walk you through it in a couple of minutes.`;
}

function buildObjectionScripts(lead: Lead) {
  return [
    {
      label: "We already get business from word of mouth",
      response: `That is a great sign because it means the business already delivers. What I want to do is make sure strangers who do not know you yet get the same confidence when they search for ${lead.businessName} online.`,
    },
    {
      label: "We already have a website",
      response: `Totally fair. What I noticed is that the issue is not just having a website - it is whether that website is helping someone trust you and take the next step fast enough. Right now ${describeLeadProblem(lead)}.`,
    },
    {
      label: "Send me something first",
      response: `Absolutely. I can send a quick summary, but it will make more sense if I first confirm the one thing you want more of right now - more calls, more walk-ins, or more qualified inquiries?`,
    },
    {
      label: "Now is not the right time",
      response: `No problem. Before I let you go, would it be helpful if I sent a simple before-and-after idea so you have it when the timing is better? That way you are not starting from scratch later.`,
    },
  ];
}

export function LocalSalesOS() {
  const [leads, setLeads] = useState<Lead[]>(seedLeads.map(normalizeLead));
  const [selectedLeadId, setSelectedLeadId] = useState(seedLeads[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("all");
  const [draftLead, setDraftLead] = useState<DraftLead>(createLeadDraft());
  const [hydrated, setHydrated] = useState(false);
  const [activeWorkTab, setActiveWorkTab] = useState<WorkboardTab>("opener");
  const [copyState, setCopyState] = useState("");
  const [briefState, setBriefState] = useState("");
  const [isSendingBrief, setIsSendingBrief] = useState(false);
  const [searchHistory, setSearchHistory] = useState<LeadSearchHistoryItem[]>([]);
  const [discoveryQuery, setDiscoveryQuery] = useState("landscaping");
  const [discoveryLocation, setDiscoveryLocation] = useState("Dallas, TX");
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryLead[]>([]);
  const [discoveryNote, setDiscoveryNote] = useState("");
  const [discoveryError, setDiscoveryError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isStageTrackerOpen, setIsStageTrackerOpen] = useState(true);
  const [stageDraft, setStageDraft] = useState<LeadStage[]>([]);
  const [stageSaveState, setStageSaveState] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const storedLeads = window.localStorage.getItem(storageKey);
    const storedHistory = window.localStorage.getItem(searchHistoryStorageKey);

    if (storedLeads) {
      try {
        const parsed = JSON.parse(storedLeads) as Lead[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeLead);
          setLeads(normalized);
          setSelectedLeadId(normalized[0].id);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory) as LeadSearchHistoryItem[];
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory);
        }
      } catch {
        window.localStorage.removeItem(searchHistoryStorageKey);
      }
    }

    setHydrated(true);
  }, []);

  const saveLeads = useEffectEvent((nextLeads: Lead[]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(nextLeads));
  });

  useEffect(() => {
    if (!hydrated) return;
    saveLeads(leads);
  }, [hydrated, leads]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(searchHistoryStorageKey, JSON.stringify(searchHistory));
  }, [hydrated, searchHistory]);

  useEffect(() => {
    if (!copyState) return;
    const timeout = window.setTimeout(() => setCopyState(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const filteredLeads = leads.filter((lead) => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      `${lead.businessName} ${lead.city} ${lead.notes} ${lead.services.join(" ")}`
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesCategory = categoryFilter === "all" || lead.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || lead.contactStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const openLeads = leads.filter((lead) => lead.contactStatus !== "CLOSED");
  const filteredOpenLeads = filteredLeads.filter((lead) => lead.contactStatus !== "CLOSED");
  const hotLeads = getHotLeads(leads);
  const topLead =
    [...filteredOpenLeads].sort((left, right) => getLeadScore(right) - getLeadScore(left))[0] ??
    [...openLeads].sort((left, right) => getLeadScore(right) - getLeadScore(left))[0];
  const summaryFilteredLeads = filteredLeads.filter((lead) => {
    switch (summaryFilter) {
      case "hot":
        return hotLeads.some((hotLead) => hotLead.id === lead.id);
      case "open":
        return lead.contactStatus !== "CLOSED";
      case "focus":
        return lead.id === topLead?.id;
      default:
        return true;
    }
  });

  useEffect(() => {
    if (summaryFilteredLeads.length === 0) return;
    if (!summaryFilteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(summaryFilteredLeads[0].id);
    }
  }, [summaryFilteredLeads, selectedLeadId]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) ?? summaryFilteredLeads[0] ?? leads[0];
  const selectedLeadStageTracker = selectedLead?.stageTracker;

  useEffect(() => {
    if (!selectedLeadId || !selectedLeadStageTracker) {
      setStageDraft([]);
      setStageSaveState("");
      return;
    }

    setStageDraft(selectedLeadStageTracker.map((stage) => ({ ...stage })));
    const latestSave = selectedLeadStageTracker
      .map((stage) => stage.updatedAt)
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .sort()
      .at(-1);

    setStageSaveState(latestSave ? `Saved ${new Date(latestSave).toLocaleTimeString()}` : "");
  }, [selectedLeadId, selectedLeadStageTracker]);

  const talkTrack = selectedLead ? buildTalkTrack(selectedLead) : null;
  const recommendedOffer = selectedLead ? getOfferRecommendation(selectedLead) : null;
  const emailPreview =
    selectedLead && talkTrack
      ? `Subject: ${talkTrack.emailSubject}\n\n${talkTrack.emailBody}`
      : "";
  const briefPreview = selectedLead ? buildLeadBriefEmail(selectedLead).text : "";
  const urgentOpener = selectedLead ? buildUrgentOpener(selectedLead) : "";
  const standardOpener = selectedLead ? buildStandardOpener(selectedLead) : "";
  const hookScript = selectedLead ? buildHookScript(selectedLead) : "";
  const offerScript = selectedLead ? buildOfferScript(selectedLead) : "";
  const voicemailScript = selectedLead ? buildVoicemailScript(selectedLead) : "";
  const objectionScripts = selectedLead ? buildObjectionScripts(selectedLead) : [];
  const loggedStageCount = stageDraft.filter((stage) => stage.status !== "Pending").length;
  const workboardCopy: Record<WorkboardTab, string> = {
    opener: [urgentOpener, standardOpener].filter(Boolean).join("\n\n"),
    hook: hookScript,
    offer: offerScript,
    email: emailPreview,
    voicemail: voicemailScript,
    objections: objectionScripts
      .map((item) => `${item.label}\n${item.response}`)
      .join("\n\n"),
  };
  const openPipelineValue = leads
    .filter((lead) => lead.contactStatus !== "CLOSED")
    .reduce((total, lead) => total + lead.dealValue, 0);

  function updateLead<K extends keyof Lead>(field: K, value: Lead[K]) {
    if (!selectedLead) return;
    setLeads((current) =>
      current.map((lead) => (lead.id === selectedLead.id ? { ...lead, [field]: value } : lead)),
    );
  }

  function updateDraft<K extends keyof DraftLead>(field: K, value: DraftLead[K]) {
    setDraftLead((current) => ({ ...current, [field]: value }));
  }

  function updateStageDraft(stageKey: LeadStageKey, updates: Partial<LeadStage>) {
    setStageDraft((current) =>
      current.map((stage) => (stage.key === stageKey ? { ...stage, ...updates } : stage)),
    );
  }

  function addLead() {
    if (!draftLead.businessName.trim()) return;
    const nextLead = createLeadFromDraft(draftLead);

    startTransition(() => {
      setLeads((current) => [nextLead, ...current]);
      setSelectedLeadId(nextLead.id);
      setDraftLead(createLeadDraft(draftLead.category));
      setSearch("");
      setCategoryFilter("all");
      setStatusFilter("all");
    });
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
    } catch {
      setCopyState("failed");
    }
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(leads)], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zagaprime-local-growth-os.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  function resetLeads() {
    const nextLeads = seedLeads.map(normalizeLead);
    startTransition(() => {
      setLeads(nextLeads);
      setSelectedLeadId(nextLeads[0].id);
      window.localStorage.removeItem(storageKey);
    });
  }

  async function sendLeadBrief() {
    if (!selectedLead) return;
    setIsSendingBrief(true);
    setBriefState("");

    try {
      const response = await fetch("/api/lead-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: selectedLead }),
      });
      const payload = (await response.json()) as { error?: string; to?: string };
      if (!response.ok) throw new Error(payload.error || "Could not send the brief.");
      setBriefState(`Lead brief sent to ${payload.to}.`);
    } catch (error) {
      setBriefState(error instanceof Error ? error.message : "Could not send the brief.");
    } finally {
      setIsSendingBrief(false);
    }
  }

  function logLeadActivity(type: "visited" | "in_progress" | "processed") {
    if (!selectedLead) return;

    const note =
      type === "visited"
        ? "Visited the business in person."
        : type === "processed"
          ? "Marked as processed / closed."
          : "Lead is actively being worked right now.";

    setLeads((current) =>
      current.map((lead) =>
        lead.id === selectedLead.id ? appendLeadActivity(lead, type, note) : lead,
      ),
    );
  }

  function closeStageTracker() {
    if (!selectedLead) return;
    setStageDraft(selectedLead.stageTracker.map((stage) => ({ ...stage })));
    setIsStageTrackerOpen(false);
  }

  function saveStageTracker(closeAfter = false) {
    if (!selectedLead) return;

    let nextLead = selectedLead;
    let hasChanges = false;

    stageDraft.forEach((draftStage) => {
      const existingStage = nextLead.stageTracker.find((stage) => stage.key === draftStage.key);
      if (!existingStage) return;

      const nextNote = draftStage.note.trim();
      if (existingStage.status === draftStage.status && existingStage.note === nextNote) {
        return;
      }

      hasChanges = true;
      nextLead = updateLeadStage(nextLead, draftStage.key, draftStage.status, nextNote);
    });

    if (!hasChanges) {
      if (closeAfter) setIsStageTrackerOpen(false);
      return;
    }

    const normalizedLead = normalizeLead(nextLead);
    const savedLabel = `Saved ${new Date().toLocaleTimeString()}`;

    setLeads((current) =>
      current.map((lead) => (lead.id === selectedLead.id ? normalizedLead : lead)),
    );
    setStageDraft(normalizedLead.stageTracker.map((stage) => ({ ...stage })));
    setStageSaveState(savedLabel);

    if (closeAfter) {
      setIsStageTrackerOpen(false);
    }
  }

  async function runDiscoverySearch(
    query = discoveryQuery,
    location = discoveryLocation,
  ) {
    if (!query.trim() || !location.trim()) return;

    setIsSearching(true);
    setDiscoveryError("");
    setDiscoveryNote("");

    try {
      const response = await fetch("/api/discover-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim(),
          pageSize: 15,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        note?: string;
        results?: DiscoveryLead[];
        query?: string;
        location?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Discovery search failed.");
      }

      const results = payload.results || [];
      const actionableCount = results.filter((result) => result.isActionableNoWebsite).length;
      setDiscoveryResults(results);
      setDiscoveryNote(payload.note || "");
      setSearchHistory((current) => [
        {
          id: `search-${Date.now()}`,
          query: query.trim(),
          location: location.trim(),
          searchedAt: new Date().toISOString(),
          totalCandidates: results.length,
          actionableCount,
          importedLeadIds: [],
        },
        ...current,
      ].slice(0, 12));
    } catch (error) {
      setDiscoveryResults([]);
      setDiscoveryError(
        error instanceof Error ? error.message : "Discovery search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function importDiscoveryLead(result: DiscoveryLead) {
    const existingLead = findLeadByPlaceOrName(
      leads,
      result.placeId,
      result.businessName,
      result.city,
    );

    if (existingLead) {
      setSelectedLeadId(existingLead.id);
      setIsStageTrackerOpen(true);
      return;
    }

    const importedLead = normalizeLead(createLeadFromDiscovery(result));

    startTransition(() => {
      setLeads((current) => [importedLead, ...current]);
      setSelectedLeadId(importedLead.id);
      setIsStageTrackerOpen(true);
      setSearchHistory((current) =>
        current.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                importedLeadIds: [...entry.importedLeadIds, importedLead.id],
              }
            : entry,
        ),
      );
    });
  }

  const summaryCards = [
    {
      key: "all" as const,
      label: "Leads in play",
      value: String(leads.length),
      detail: "Seeded from the conversation, then editable in the CRM.",
    },
    {
      key: "hot" as const,
      label: "Hot opportunities",
      value: String(hotLeads.length),
      detail: "Urgent or high-priority leads based on digital weakness and intent.",
    },
    {
      key: "open" as const,
      label: "Open pipeline",
      value: formatCurrency(openPipelineValue),
      detail: "Projected value across every lead that is not yet closed.",
    },
    {
      key: "focus" as const,
      label: "Best next swing",
      value: topLead?.businessName ?? "No lead selected",
      detail: topLead?.nextAction ?? "Add a lead to start the queue.",
    },
  ];

  return (
    <main className="w-full">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="glass-panel noise relative overflow-hidden rounded-[32px] px-6 py-7 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_340px]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                ZagaPrime Local Growth OS
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Turn the GPT research into a USA-wide local client-acquisition machine.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted sm:text-lg">
                This app starts with your Andover seed leads, then expands into a
                nationwide system for finding, tracking, and working no-website local
                business leads across cities and states in the U.S.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Chip label="Starts with 6 starter seed leads" tone="default" />
                <Chip label="Searches new U.S. cities live" tone="success" />
                <Chip label="Auto-saves to this browser" tone="success" />
                <Chip label="Optional Resend brief-to-inbox flow" tone="warning" />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[28px] border border-white/60 bg-white/72 p-4 shadow-[0_18px_60px_rgba(31,20,10,0.08)]">
              <p className="text-sm font-medium text-muted">Fast actions</p>
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90"
              >
                Export CRM CSV
              </button>
              <button
                type="button"
                onClick={resetLeads}
                className="rounded-full border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-foreground hover:bg-white"
              >
                Reset To Seed Leads
              </button>
              <p className="text-xs leading-6 text-muted">
                {hydrated ? "Local browser sync is active." : "Loading your saved pipeline..."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => {
                setSummaryFilter(card.key);
                if (card.key === "focus" && topLead) {
                  setSelectedLeadId(topLead.id);
                }
              }}
              aria-pressed={summaryFilter === card.key}
              className={`glass-panel cursor-pointer rounded-[26px] p-5 text-left hover:-translate-y-0.5 hover:bg-white/90 ${
                summaryFilter === card.key ? "ring-2 ring-accent/50 bg-white/90" : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{card.detail}</p>
            </button>
          ))}
        </section>

        <section className="glass-panel rounded-[30px] p-5 sm:p-6">
          <PanelTitle
            eyebrow="Live Lead Finder"
            title="Search new cities, states, and service niches in real time"
            description="This searches across the U.S., ranks no-website businesses first, and still gives you fallback candidates when Google Places already has websites for the entire market."
          />

          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
                <Field label="What businesses do you want?">
                  <input
                    value={discoveryQuery}
                    onChange={(event) => setDiscoveryQuery(event.target.value)}
                    placeholder="landscaping, thrift store, chimney sweep"
                    className={inputClass}
                  />
                </Field>
                <Field label="Where?">
                  <input
                    value={discoveryLocation}
                    onChange={(event) => setDiscoveryLocation(event.target.value)}
                    placeholder="Chicago, IL"
                    className={inputClass}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void runDiscoverySearch()}
                    disabled={isSearching}
                    className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSearching ? "Searching..." : "Search Live"}
                  </button>
                </div>
              </div>

              {discoveryError ? (
                <div className="rounded-[22px] border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
                  {discoveryError}
                </div>
              ) : null}

              {discoveryNote ? (
                <div className="rounded-[22px] border border-line bg-white/72 px-4 py-3 text-sm leading-6 text-muted">
                  {discoveryNote}
                </div>
              ) : null}

              <div className="grid gap-4">
                {discoveryResults.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-line bg-white/62 px-4 py-6 text-sm leading-7 text-muted">
                    Run a live search to find operational businesses in any U.S. city or state. Leads without a website are ranked first, and strong fallback candidates still show if the market is saturated.
                  </div>
                ) : (
                  discoveryResults.map((result) => {
                    const matchingLead = findLeadByPlaceOrName(
                      leads,
                      result.placeId,
                      result.businessName,
                      result.city,
                    );

                    return (
                      <div
                        key={result.placeId}
                        className={`rounded-[24px] border p-4 ${
                          matchingLead
                            ? getTrackedLeadTone(matchingLead)
                            : result.isActionableNoWebsite
                              ? "border-accent/35 bg-[#fffbf6]"
                              : "border-line bg-white/72"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {result.businessName}
                            </p>
                            <p className="text-sm leading-6 text-muted">
                              {result.formattedAddress}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Chip
                              label={result.isActionableNoWebsite ? "No website in Places" : "Website found in Places"}
                              tone={result.isActionableNoWebsite ? "warning" : "default"}
                            />
                            {matchingLead ? (
                              <>
                                <Chip
                                  label={
                                    matchingLead.contactStatus === "CLOSED"
                                      ? "Already closed"
                                      : hasActivity(matchingLead, "visited")
                                        ? "Visited earlier"
                                        : "Already tracked"
                                  }
                                  tone={matchingLead.contactStatus === "CLOSED" ? "default" : "success"}
                                />
                                <Chip
                                  label={getLeadWorkflowLabel(matchingLead)}
                                  tone={matchingLead.contactStatus === "CLOSED" ? "default" : "success"}
                                />
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                          <span>{result.primaryType}</span>
                          <span>{result.rating} stars</span>
                          <span>{result.userRatingCount} reviews</span>
                          <span>{result.phone || "No phone returned"}</span>
                          <span>{result.websiteDecision}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              matchingLead
                                ? setSelectedLeadId(matchingLead.id)
                                : importDiscoveryLead(result)
                            }
                            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                          >
                            {matchingLead ? "Open tracked lead" : "Import to CRM"}
                          </button>
                          {result.mapsUrl ? (
                            <a
                              href={result.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-[#f6efe7]"
                            >
                              Open Maps
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-line bg-white/72 p-4">
                <p className="text-sm font-semibold text-foreground">Recent searches</p>
                <div className="mt-3 space-y-3">
                  {searchHistory.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">
                      Your live search history will show up here.
                    </p>
                  ) : (
                    searchHistory.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setDiscoveryQuery(entry.query);
                          setDiscoveryLocation(entry.location);
                          void runDiscoverySearch(entry.query, entry.location);
                        }}
                        className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-left hover:bg-[#f6efe7]"
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {entry.query} in {entry.location}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {new Date(entry.searchedAt).toLocaleString()} - {entry.actionableCount ?? 0} no-website leads out of {entry.totalCandidates ?? entry.actionableCount ?? 0} candidates
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-line bg-white/72 p-4">
                <p className="text-sm font-semibold text-foreground">Provider requirement</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Real-time search uses Google Places from a server route, so this works on Vercel and on your phone as long as the deployment has a valid API key.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6">
            <div className="glass-panel rounded-[28px] p-5">
              <PanelTitle
                eyebrow="Lead Radar"
                title="Filter, rank, and pick the next business"
                description={`Showing ${summaryFilteredLeads.length} lead${summaryFilteredLeads.length === 1 ? "" : "s"} in the ${summaryFilterLabels[summaryFilter].toLowerCase()} view.`}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chip label={`Viewing: ${summaryFilterLabels[summaryFilter]}`} tone="success" />
                {summaryFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setSummaryFilter("all")}
                    className="rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground hover:bg-white"
                  >
                    Clear card filter
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                <Field label="Search">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, city, or notes"
                    className={inputClass}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value as FilterCategory)}
                      className={inputClass}
                    >
                      <option value="all">All categories</option>
                      {leadCategories.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Contact status">
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
                      className={inputClass}
                    >
                      <option value="all">All stages</option>
                      {contactStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="mt-5 flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
                {summaryFilteredLeads.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-line bg-white/60 px-4 py-6 text-sm leading-7 text-muted">
                    No leads match the current filters.
                  </div>
                ) : (
                  summaryFilteredLeads.map((lead) => {
                    const selected = lead.id === selectedLead?.id;
                    const priority = getPriorityLabel(lead);
                    const workflowLabel = getLeadWorkflowLabel(lead);
                    const visitedEarlier = hasActivity(lead, "visited");
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`rounded-[24px] border p-4 text-left ${
                          selected
                            ? "border-accent bg-white shadow-[0_14px_45px_rgba(31,20,10,0.08)]"
                            : lead.contactStatus === "CLOSED"
                              ? "border-line bg-[#f5f0ea] hover:bg-[#f1e7db]"
                              : "border-line bg-white/66 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-foreground">{lead.businessName}</p>
                            <p className="text-sm text-muted">
                              {lead.city} - {getCategoryLabel(lead.category)}
                            </p>
                          </div>
                          <PriorityBadge priority={priority} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Chip label={lead.websiteStatus} tone="default" />
                          <Chip label={lead.contactStatus} tone="default" />
                          <Chip
                            label={workflowLabel}
                            tone={lead.contactStatus === "CLOSED" ? "default" : "success"}
                          />
                          {visitedEarlier ? <Chip label="Visited earlier" tone="warning" /> : null}
                          <Chip label={`${getLeadScore(lead)}/100 score`} tone="success" />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">{lead.nextAction}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <PanelTitle
                eyebrow="Add Lead"
                title="Drop a new business into the system"
                description="Keep the form tight, then polish details inside the cockpit."
              />
              <div className="mt-4 grid gap-3">
                <Field label="Business name">
                  <input
                    value={draftLead.businessName}
                    onChange={(event) => updateDraft("businessName", event.target.value)}
                    placeholder="Newton Auto Repair"
                    className={inputClass}
                  />
                </Field>
                <Field label="City">
                  <input
                    value={draftLead.city}
                    onChange={(event) => updateDraft("city", event.target.value)}
                    placeholder="Phoenix"
                    className={inputClass}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <select
                      value={draftLead.category}
                      onChange={(event) => updateDraft("category", event.target.value as LeadCategory)}
                      className={inputClass}
                    >
                      {leadCategories.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Website status">
                    <select
                      value={draftLead.websiteStatus}
                      onChange={(event) => updateDraft("websiteStatus", event.target.value as WebsiteStatus)}
                      className={inputClass}
                    >
                      {websiteStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Target deal value">
                  <input
                    type="number"
                    value={String(draftLead.dealValue)}
                    onChange={(event) => updateDraft("dealValue", Number(event.target.value) || 0)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Next action">
                  <input
                    value={draftLead.nextAction}
                    onChange={(event) => updateDraft("nextAction", event.target.value)}
                    placeholder="Call with a quick demo"
                    className={inputClass}
                  />
                </Field>
                <Field label="Pitch angle">
                  <textarea
                    value={draftLead.angle}
                    onChange={(event) => updateDraft("angle", event.target.value)}
                    rows={3}
                    placeholder="What digital problem hurts this business right now?"
                    className={inputClass}
                  />
                </Field>
                <button
                  type="button"
                  onClick={addLead}
                  className="rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Add Lead To Pipeline
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <PanelTitle
                eyebrow="Daily Cadence"
                title="Use the operating rhythm from the brief"
                description="The system only works if every lead gets a next move."
              />
              <div className="mt-4 space-y-3">
                {dailyExecutionChecklist.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-[22px] border border-line bg-white/62 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            {selectedLead ? (
              <>
                <div className="glass-panel rounded-[28px] p-5">
                  <PanelTitle
                    eyebrow="Lead Cockpit"
                    title={selectedLead.businessName}
                    description="Edit the lead, tighten the offer, and let the tracker update visit, progress, and closed status automatically."
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip label={getCategoryLabel(selectedLead.category)} tone="success" />
                    <Chip label={selectedLead.websiteStatus} tone="warning" />
                    <Chip label={selectedLead.contactStatus} tone="default" />
                    {hasActivity(selectedLead, "visited") ? (
                      <Chip label="Visited earlier" tone="warning" />
                    ) : null}
                    {hasActivity(selectedLead, "in_progress") ? (
                      <Chip label="In progress" tone="success" />
                    ) : null}
                    <PriorityBadge priority={getPriorityLabel(selectedLead)} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Business name">
                        <input
                          value={selectedLead.businessName}
                          onChange={(event) => updateLead("businessName", event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="City">
                        <input
                          value={selectedLead.city}
                          onChange={(event) => updateLead("city", event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          value={selectedLead.phone}
                          onChange={(event) => updateLead("phone", event.target.value)}
                          placeholder="973-555-0101"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          value={selectedLead.email}
                          onChange={(event) => updateLead("email", event.target.value)}
                          placeholder="owner@example.com"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Category">
                        <select
                          value={selectedLead.category}
                          onChange={(event) => updateLead("category", event.target.value as LeadCategory)}
                          className={inputClass}
                        >
                          {leadCategories.map((category) => (
                            <option key={category} value={category}>
                              {getCategoryLabel(category)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Website status">
                        <select
                          value={selectedLead.websiteStatus}
                          onChange={(event) => updateLead("websiteStatus", event.target.value as WebsiteStatus)}
                          className={inputClass}
                        >
                          {websiteStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Contact status (auto-tracked)">
                        <input
                          value={selectedLead.contactStatus}
                          readOnly
                          className={`${inputClass} cursor-not-allowed bg-[#f8f1ea]`}
                        />
                      </Field>
                      <Field label="Workflow label">
                        <input
                          value={getLeadWorkflowLabel(selectedLead)}
                          readOnly
                          className={`${inputClass} cursor-not-allowed bg-[#f8f1ea]`}
                        />
                      </Field>
                      <Field label="Interest level">
                        <select
                          value={selectedLead.interestLevel}
                          onChange={(event) => updateLead("interestLevel", event.target.value as Lead["interestLevel"])}
                          className={inputClass}
                        >
                          {interestLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Google rating">
                        <input
                          value={selectedLead.googleRating}
                          onChange={(event) => updateLead("googleRating", event.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Deal value">
                        <input
                          type="number"
                          value={String(selectedLead.dealValue)}
                          onChange={(event) => updateLead("dealValue", Number(event.target.value) || 0)}
                          className={inputClass}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Next action">
                          <input
                            value={selectedLead.nextAction}
                            onChange={(event) => updateLead("nextAction", event.target.value)}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Pitch angle">
                          <textarea
                            value={selectedLead.angle}
                            onChange={(event) => updateLead("angle", event.target.value)}
                            rows={3}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Notes">
                          <textarea
                            value={selectedLead.notes}
                            onChange={(event) => updateLead("notes", event.target.value)}
                            rows={4}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <MetricCard label="Lead score" value={`${getLeadScore(selectedLead)}/100`} />
                      <MetricCard label="Priority" value={getPriorityLabel(selectedLead)} />
                      <MetricCard label="Target value" value={formatCurrency(selectedLead.dealValue)} />
                      <div className="rounded-[24px] border border-line bg-white/72 p-4">
                        <p className="text-sm font-semibold text-foreground">Quick tracking</p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Visits, active work, and closed leads are auto-detected from these logs and the stage tracker.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => logLeadActivity("in_progress")}
                            className="rounded-full bg-foreground px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90"
                          >
                            Mark In Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => logLeadActivity("visited")}
                            className="rounded-full bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-accent/90"
                          >
                            Log Visit
                          </button>
                          <button
                            type="button"
                            onClick={() => logLeadActivity("processed")}
                            className="rounded-full bg-accent-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-accent-2/90"
                          >
                            Mark Processed
                          </button>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-line bg-white/72 p-4 text-sm leading-6">
                        <p className="font-semibold text-foreground">Why this lead matters</p>
                        <p className="mt-2 text-muted">{getPriorityNote(selectedLead)}</p>
                        <p className="mt-3 text-foreground">
                          <span className="font-medium">Proof:</span> {selectedLead.proof}
                        </p>
                        <p className="mt-2 text-foreground">
                          <span className="font-medium">Years active:</span> {selectedLead.yearsActive}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-line bg-white/72 p-4 text-sm leading-6">
                        <p className="font-semibold text-foreground">Lead dossier</p>
                        <p className="mt-2 text-muted">
                          Work the lead here, then export only after the activity, scripts, and stage history are updated.
                        </p>
                        <div className="mt-3 space-y-2 text-foreground">
                          <p>
                            <span className="font-medium">Source:</span> {selectedLead.source.replaceAll("_", " ")}
                          </p>
                          <p>
                            <span className="font-medium">Search origin:</span> {selectedLead.searchOrigin || "Manual lead"}
                          </p>
                          <p>
                            <span className="font-medium">Website:</span> {selectedLead.websiteUri || selectedLead.websiteStatus}
                          </p>
                          <p>
                            <span className="font-medium">Last worked:</span>{" "}
                            {selectedLead.lastProcessedAt
                              ? new Date(selectedLead.lastProcessedAt).toLocaleString()
                              : selectedLead.activities.length > 0
                                ? new Date(selectedLead.activities[selectedLead.activities.length - 1].timestamp).toLocaleString()
                                : "Not logged yet"}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedLead.mapsUrl ? (
                            <a
                              href={selectedLead.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground hover:bg-[#f6efe7]"
                            >
                              Open Maps
                            </a>
                          ) : null}
                          {selectedLead.websiteUri ? (
                            <a
                              href={selectedLead.websiteUri}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground hover:bg-[#f6efe7]"
                            >
                              Open Website
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-line bg-white/72 p-4">
                        <p className="text-sm font-semibold text-foreground">Activity log</p>
                        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                          {[...selectedLead.activities]
                            .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
                            .map((activity) => (
                              <div key={activity.id} className="rounded-[18px] bg-[#fffaf5] px-4 py-3 text-sm leading-6">
                                <p className="font-medium text-foreground">{activity.note}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                                  {activity.type.replaceAll("_", " ")} - {new Date(activity.timestamp).toLocaleString()}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] p-5">
                  <PanelTitle
                    eyebrow="Demo Generator"
                    title="Use this live mockup as the close-assist"
                    description="The preview mirrors the exact promise you pitch: easier discovery, cleaner trust, faster contact."
                  />
                  <div className="mt-5 overflow-hidden rounded-[30px] border border-line bg-white shadow-[0_20px_60px_rgba(31,20,10,0.08)]">
                    <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-orange-700 px-5 py-4 text-white sm:px-7 sm:py-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-white/70">Demo homepage</p>
                      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{selectedLead.businessName}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                        {buildDemoHeadline(selectedLead)}
                      </p>
                    </div>
                    <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_320px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Why it works</p>
                        <h3 className="mt-2 text-2xl font-semibold text-foreground">{selectedLead.angle}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                          Serving {selectedLead.city} and the surrounding market. The site makes the next step obvious on mobile, gives Google a page to rank, and turns curiosity into a call or visit.
                        </p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                          {selectedLead.services.map((service) => (
                            <div key={service} className="rounded-[24px] border border-line bg-[#fff7f0] p-4">
                              <p className="text-sm font-semibold text-foreground">{service}</p>
                              <p className="mt-2 text-sm leading-6 text-muted">
                                Clean copy, instant credibility, and a faster path to the next conversation.
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4 rounded-[28px] border border-line bg-[#fff9f3] p-5">
                        <div className="rounded-[22px] bg-white px-4 py-4">
                          <p className="text-sm font-semibold text-foreground">Talk track</p>
                          <p className="mt-2 text-sm leading-6 text-muted">{talkTrack?.value}</p>
                        </div>
                        <div className="rounded-[22px] bg-slate-950 px-4 py-4 text-white">
                          <p className="text-sm font-semibold">Pitch this part live</p>
                          <p className="mt-2 text-sm leading-6 text-white/78">
                            &quot;I put this together quickly to show how customers could find and contact you online without changing how you run the business.&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <PanelTitle
                      eyebrow="Stage Tracker"
                      title="Track every step from research to final decision"
                      description="This is the working pipeline for the lead. Saving the tracker updates the lead status, visit history, and closed-state highlighting automatically."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        label={`${loggedStageCount}/${leadStageDefinitions.length} stages logged`}
                        tone="success"
                      />
                      <button
                        type="button"
                        onClick={() => setIsStageTrackerOpen((current) => !current)}
                        className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-foreground hover:bg-white"
                      >
                        {isStageTrackerOpen ? "Hide tracker" : "Open tracker"}
                      </button>
                    </div>
                  </div>

                  {isStageTrackerOpen ? (
                    <>
                      <div className="mt-5 space-y-4">
                        {leadStageDefinitions.map((definition, index) => {
                          const stage =
                            stageDraft.find((item) => item.key === definition.key) ??
                            selectedLead.stageTracker.find((item) => item.key === definition.key);

                          if (!stage) return null;

                          return (
                            <div
                              key={definition.key}
                              className="rounded-[24px] border border-line bg-white/72 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {definition.label}
                                    </p>
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                      {stage.status}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs leading-5 text-muted">
                                  {stage.updatedAt
                                    ? `Updated ${new Date(stage.updatedAt).toLocaleString()}`
                                    : "No update logged yet"}
                                </p>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {stageStatusOptions[definition.key].map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStageDraft(definition.key, { status })}
                                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${getStageOptionClass(stage.status === status, status)}`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>

                              <div className="mt-4">
                                <Field label="Add a note">
                                  <textarea
                                    value={stage.note}
                                    onChange={(event) =>
                                      updateStageDraft(definition.key, { note: event.target.value })
                                    }
                                    rows={2}
                                    placeholder="Add context, objections, or the next step..."
                                    className={inputClass}
                                  />
                                </Field>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-line bg-[#fff8f1] px-4 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {stageSaveState || "Update stages, then save the tracker."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={closeStageTracker}
                            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-[#f6efe7]"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => saveStageTracker(false)}
                            className="rounded-full border border-foreground bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-[#f6efe7]"
                          >
                            Save Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => saveStageTracker(true)}
                            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                          >
                            Save & Close
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-line bg-white/72 px-4 py-4">
                      <p className="text-sm leading-6 text-muted">
                        {stageSaveState || "Tracker closed. Reopen it whenever you need to update call outcomes, follow-ups, or the final decision."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsStageTrackerOpen(true)}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
                      >
                        Open Stage Tracker
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="glass-panel rounded-[28px] p-5">
                    <PanelTitle
                      eyebrow="Lead Workboard"
                      title="Work the lead right on-site before you export"
                      description="Openers, hook, offer, email, voicemail, and objections stay attached to the selected lead so you can call, log progress, and move the deal forward in one place."
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {([
                        "opener",
                        "hook",
                        "offer",
                        "email",
                        "voicemail",
                        "objections",
                      ] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveWorkTab(tab)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            activeWorkTab === tab
                              ? "bg-foreground text-white"
                              : "border border-line bg-white/70 text-foreground hover:bg-white"
                          }`}
                        >
                          {tab === "opener"
                            ? "Opener"
                            : tab === "hook"
                              ? "Hook"
                              : tab === "offer"
                                ? "Offer"
                                : tab === "email"
                                  ? "Email"
                                  : tab === "voicemail"
                                    ? "Voicemail"
                                    : "Objections"}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[26px] border border-line bg-white/72 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {activeWorkTab === "opener"
                            ? "Phone opener"
                            : activeWorkTab === "hook"
                              ? "Hook"
                              : activeWorkTab === "offer"
                                ? "Offer"
                                : activeWorkTab === "email"
                                  ? "Email"
                                  : activeWorkTab === "voicemail"
                                    ? "Voicemail"
                                    : "Objections"}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyText(activeWorkTab, workboardCopy[activeWorkTab])}
                          className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-[#f5eee8]"
                        >
                          {copyState === activeWorkTab ? "Copied" : "Copy"}
                        </button>
                      </div>

                      {activeWorkTab === "opener" ? (
                        <div className="mt-4 space-y-4">
                          {urgentOpener ? (
                            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4">
                              <p className="text-sm font-semibold text-red-900">Urgent opener</p>
                              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-950 font-sans">
                                {urgentOpener}
                              </pre>
                            </div>
                          ) : null}
                          <div className="rounded-[22px] border border-line bg-[#fffaf5] px-4 py-4">
                            <p className="text-sm font-semibold text-foreground">Standard cold call opener</p>
                            <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground font-sans">
                              {standardOpener}
                            </pre>
                          </div>
                        </div>
                      ) : null}

                      {activeWorkTab === "hook" ? (
                        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground font-sans">
                          {hookScript}
                        </pre>
                      ) : null}

                      {activeWorkTab === "offer" ? (
                        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground font-sans">
                          {offerScript}
                        </pre>
                      ) : null}

                      {activeWorkTab === "email" ? (
                        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground font-sans">
                          {emailPreview}
                        </pre>
                      ) : null}

                      {activeWorkTab === "voicemail" ? (
                        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground font-sans">
                          {voicemailScript}
                        </pre>
                      ) : null}

                      {activeWorkTab === "objections" ? (
                        <div className="mt-4 space-y-4">
                          {objectionScripts.map((item) => (
                            <div key={item.label} className="rounded-[22px] border border-line bg-[#fffaf5] px-4 py-4">
                              <p className="text-sm font-semibold text-foreground">{item.label}</p>
                              <p className="mt-3 text-sm leading-7 text-muted">{item.response}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[24px] border border-line bg-white/72 p-4">
                        <p className="text-sm font-semibold text-foreground">Call objective</p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Move the lead from awareness into a booked next step while the pain point is still fresh.
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-line bg-white/72 p-4">
                        <p className="text-sm font-semibold text-foreground">Next best move</p>
                        <p className="mt-2 text-sm leading-6 text-muted">{selectedLead.nextAction}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[24px] border border-line bg-white/72 p-4">
                      <p className="text-sm font-semibold text-foreground">Offer summary</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {recommendedOffer?.name} - {recommendedOffer?.priceRange}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                        {recommendedOffer?.deliverables.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="glass-panel rounded-[28px] p-5">
                    <PanelTitle
                      eyebrow="Resend Brief"
                      title="Email the selected lead brief to your inbox"
                      description="This is wired for Vercel + Resend, but limited to your configured inbox."
                    />
                    <div className="mt-4 rounded-[24px] border border-line bg-white/72 p-4">
                      <p className="text-sm font-semibold text-foreground">Internal lead summary</p>
                      <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-muted font-sans">
                        {briefPreview}
                      </pre>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={sendLeadBrief}
                        disabled={isSendingBrief}
                        className="rounded-full bg-accent-2 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-2/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSendingBrief ? "Sending..." : "Email Brief To My Inbox"}
                      </button>
                      <p className="text-xs leading-6 text-muted">
                        Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_TO_EMAIL` in Vercel to activate this.
                      </p>
                      {briefState ? (
                        <p className="rounded-[18px] border border-line bg-white/82 px-4 py-3 text-sm leading-6 text-foreground">
                          {briefState}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] p-5">
                  <PanelTitle
                    eyebrow="Offer Ladder"
                    title="Keep pricing simple while you close the first local wins"
                    description="Sell outcomes first, then layer in automation when the business is ready."
                  />
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {offerLadder.map((item) => (
                      <div key={item.name} className="rounded-[24px] border border-line bg-white/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{item.price}</p>
                        <h3 className="mt-2 text-xl font-semibold text-foreground">{item.name}</h3>
                        <p className="mt-3 text-sm leading-6 text-muted">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-panel rounded-[28px] p-10 text-center text-muted">
                Select or create a lead to open the cockpit.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function PanelTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-accent/10 text-accent"
      : tone === "warning"
        ? "bg-accent-2/12 text-orange-900"
        : "bg-[#efe2d4] text-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: PriorityLabel }) {
  const toneClass =
    priority === "URGENT"
      ? "bg-red-600 text-white"
      : priority === "HIGH"
        ? "bg-orange-500 text-white"
        : priority === "MEDIUM"
          ? "bg-accent text-white"
          : "bg-[#efe2d4] text-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {priority}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-[#fffaf5] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
