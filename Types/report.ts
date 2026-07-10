export type ReportReason =
  | "suspected_scam"
  | "incorrect_information"
  | "duplicate_listing"
  | "vehicle_unavailable"
  | "offensive_content"
  | "other";

export interface ListingReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reportedBy: string;
  reason: ReportReason;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt?: unknown;
}
