// Cloudflare Pages Function: /api/results
// Aggregates all 18 question counters + total into a single response.
// Fresh namespace = clean start.

const TALLY_NS = "gndec1996rubric2026v3";

const QUESTIONS = [
  { id: "q1_need_vs_merit",            opts: ["A","B","C"] },
  { id: "q2_low_marks_low_income",     opts: ["A","B","C"] },
  { id: "q3_above_threshold_no_assets",opts: ["A","B","C"] },
  { id: "q4_tiebreaker",               opts: ["A","B","C"] },
  { id: "q5_son_or_daughter",          opts: ["A","B","C"] },
  { id: "q6_punjab_bonus",             opts: ["A","B","C"] },
  { id: "q7_rural_village",            opts: ["A","B","C"] },
  { id: "q8_first_gen",                opts: ["A","B","C"] },
  { id: "q9_orphan_policy",            opts: ["A","B","C"] },
  { id: "q10_widow_mother",            opts: ["A","B","C"] },
  { id: "q11_disability_policy",       opts: ["A","B","C"] },
  { id: "q12_working_student",         opts: ["A","B","C"] },
  { id: "q13_backlog_policy",          opts: ["A","B","C"] },
  { id: "q14_achievement_vs_marks",    opts: ["A","B","C"] },
  { id: "q15_declining_marks",         opts: ["A","B","C"] },
  { id: "q16_previous_beneficiary",    opts: ["A","B","C"] },
  { id: "q17_other_aid",               opts: ["A","B","C"] },
  { id: "q18_budget_split",            opts: ["A","B","C"] },
  { id: "q19_emergency_support",       opts: ["A","B","C"] },
  { id: "q20_drug_crisis",             opts: ["A","B","C"] },
  { id: "q21_sibling_rule",            opts: ["A","B","C"] },
  { id: "q22_disowned_student",        opts: ["A","B","C"] },
  { id: "q23_mental_health",           opts: ["A","B","C"] },
  { id: "q24_digital_divide",          opts: ["A","B","C"] }
];

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

async function fetchOne(key, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(`https://abacus.jasoncameron.dev/get/${TALLY_NS}/${key}`, {
        cf: { cacheTtl: 0 }
      });
      if (r.ok) {
        const d = await r.json();
        return d.value || 0;
      }
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
        continue;
      }
      if (r.status === 404) return 0;
    } catch (e) {
      await new Promise(res => setTimeout(res, 200));
    }
  }
  return 0;
}

async function fetchAll() {
  // Only 55 counters total (1 + 18*3) — should fit comfortably in rate limits
  const keys = ["total_submissions"];
  QUESTIONS.forEach(q => q.opts.forEach(opt => keys.push(`${q.id}__${opt}`)));

  const out = {};
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async k => [k, await fetchOne(k)]));
    batchResults.forEach(([k, v]) => out[k] = v);
    if (i + BATCH_SIZE < keys.length) {
      await new Promise(res => setTimeout(res, BATCH_DELAY_MS));
    }
  }
  return out;
}

export async function onRequest(context) {
  const cacheUrl = new URL(context.request.url);
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), context.request);
  const cache = caches.default;

  let resp = await cache.match(cacheKey);
  if (resp) return resp;

  const data = await fetchAll();

  resp = new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    counters: data
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=30",
      "access-control-allow-origin": "*"
    }
  });

  context.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}
