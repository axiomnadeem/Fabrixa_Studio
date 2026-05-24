// GET /api/daily-reset?uid=...
// Idempotent endpoint a cron service (or pg_cron / Cloud Scheduler) can hit
// to refill coins, AI requests, and reset showroom download counts when
// 24h have elapsed since the last reset. In production this iterates over
// active users in Firestore; here it returns the computed reset values for
// a single uid so the cron can `PUT` them back to the DB.
import { createFileRoute } from "@tanstack/react-router";
import { APP_DATA_0, type SubscriptionTierId } from "@/lib/fabrixa/APP_DATA_0";

const DAY_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/daily-reset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        const tierId = url.searchParams.get("tier") as SubscriptionTierId | null;
        const lastResetAt = Number(url.searchParams.get("lastResetAt") ?? "0");
        const hasAiPack = url.searchParams.get("aiPack") === "1";

        if (!uid || !tierId || !(tierId in APP_DATA_0.tiers)) {
          return new Response("uid and valid tier required", { status: 400 });
        }
        const now = Date.now();
        if (now - lastResetAt < DAY_MS) {
          return Response.json({ ok: true, reset: false, reason: "less than 24h" });
        }
        const tier = APP_DATA_0.tiers[tierId];
        return Response.json({
          ok: true,
          reset: true,
          uid,
          coinBalance: tier.dailyAllowance,
          dailyAiRequestsRemaining: tier.aiIncluded || hasAiPack
            ? APP_DATA_0.aiPack.dailyRequests
            : 0,
          dailyShowroomDownloadsCount: 0,
          lastDailyResetAt: now,
        });
      },
    },
  },
});
