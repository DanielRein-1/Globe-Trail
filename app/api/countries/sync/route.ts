import { createErrorResponse } from "@/lib/api/response";

export async function POST() {
  return createErrorResponse(
    "Public country synchronization is disabled. Use the local country import command.",
    "SYNC_DISABLED",
    403,
  );
}
