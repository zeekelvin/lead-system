import { NextResponse } from "next/server";

import type { DiscoveryLead } from "@/types/pipeline";

export const runtime = "nodejs";

type GooglePlacesResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    businessStatus?: string;
    nationalPhoneNumber?: string;
    rating?: number;
    userRatingCount?: number;
    primaryTypeDisplayName?: { text?: string };
  }>;
};

function parseLocationParts(formattedAddress: string, fallbackLocation: string) {
  const segments = formattedAddress
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const fallbackSegments = fallbackLocation
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const city = segments.length >= 3 ? segments[segments.length - 3] : fallbackSegments[0] || fallbackLocation;
  const stateZip = segments.length >= 2 ? segments[segments.length - 2] : fallbackSegments[1] || "";
  const state = stateZip.split(" ")[0] || fallbackSegments[1] || "";

  return { city, state };
}

function buildDiscoveryLead(
  place: NonNullable<GooglePlacesResponse["places"]>[number],
  query: string,
  location: string,
): DiscoveryLead | null {
  if (!place.id || !place.displayName?.text || !place.formattedAddress) {
    return null;
  }

  const { city, state } = parseLocationParts(place.formattedAddress, location);

  return {
    placeId: place.id,
    businessName: place.displayName.text,
    formattedAddress: place.formattedAddress,
    city,
    state,
    phone: place.nationalPhoneNumber || "",
    rating: typeof place.rating === "number" ? place.rating.toFixed(1) : "N/A",
    userRatingCount: place.userRatingCount || 0,
    websiteUri: place.websiteUri || null,
    mapsUrl: place.googleMapsUri || null,
    businessStatus: place.businessStatus || "BUSINESS_STATUS_UNSPECIFIED",
    primaryType: place.primaryTypeDisplayName?.text || "Unknown",
    query,
    location,
    isActionableNoWebsite: !place.websiteUri,
    websiteDecision: place.websiteUri
      ? "Website found in Google Places"
      : "No website returned in Google Places",
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_MAPS_API_KEY. Add a Google Maps Platform API key with Places API enabled.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { query?: string; location?: string; pageSize?: number }
    | null;

  const query = body?.query?.trim();
  const location = body?.location?.trim();
  const pageSize = Math.min(Math.max(body?.pageSize ?? 12, 1), 20);

  if (!query || !location) {
    return NextResponse.json(
      { error: "Both query and location are required." },
      { status: 400 },
    );
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.websiteUri",
    "places.googleMapsUri",
    "places.businessStatus",
    "places.nationalPhoneNumber",
    "places.rating",
    "places.userRatingCount",
    "places.primaryTypeDisplayName",
  ].join(",");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: `${query} in ${location}`,
      pageSize,
      languageCode: "en",
      regionCode: "US",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    return NextResponse.json(
      {
        error:
          errorPayload?.error?.message ||
          "Google Places could not complete the search request.",
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as GooglePlacesResponse;
  const candidates = (payload.places || [])
    .map((place) => buildDiscoveryLead(place, query, location))
    .filter((place): place is DiscoveryLead => Boolean(place))
    .filter(
      (place) =>
        (place.businessStatus === "OPERATIONAL" ||
          place.businessStatus === "BUSINESS_STATUS_UNSPECIFIED"),
    )
    .sort((left, right) => {
      if (left.isActionableNoWebsite !== right.isActionableNoWebsite) {
        return left.isActionableNoWebsite ? -1 : 1;
      }

      const leftHasPhone = Boolean(left.phone);
      const rightHasPhone = Boolean(right.phone);
      if (leftHasPhone !== rightHasPhone) {
        return leftHasPhone ? -1 : 1;
      }

      return right.userRatingCount - left.userRatingCount;
    });

  const actionableCount = candidates.filter((place) => place.isActionableNoWebsite).length;
  const note =
    candidates.length === 0
      ? `Google Places did not return operational matches for "${query}" in ${location}. Try a broader niche, nearby city, or a state abbreviation like "Phoenix, AZ".`
      : actionableCount > 0
        ? `Showing ${candidates.length} operational businesses in ${location}. ${actionableCount} of them do not have a website returned by Google Places, so those no-website leads are ranked first.`
        : `Google Places returned businesses in ${location}, but none were missing a website. Showing the best operational candidates anyway so you can still work the market in real time.`;

  return NextResponse.json({
    query,
    location,
    results: candidates,
    provider: "google_places",
    note,
  });
}
