// Cloudflare Pages Function: /api/results
// Aggregates all poll counters in a single response.
// Caches at the edge (cache-control) so 100 batchmates = ~5 hits to abacus per minute.

const TALLY_NS = "gndec1996scholarpoll26";

const QUESTIONS = [
  { id: "q1_income_weight",   opts: ["A","B","C","D","E"] },
  { id: "q2_income_method",   opts: ["A","B","C","D"] },
  { id: "q3_assets",          opts: ["A","B","C","D","E"] },
  { id: "q4_dependents",      opts: ["A","B","C","D"] },
  { id: "q5_parents",         opts: ["A","B","C","D","E"] },
  { id: "q6_widow",           opts: ["A","B","C","D","E"] },
  { id: "q7_disability",      opts: ["A","B","C","D","E"] },
  { id: "q8_firstgen",        opts: ["A","B","C","D","E"] },
  { id: "q9_girl",            opts: ["A","B","C","D","E"] },
  { id: "q10_punjab",         opts: ["A","B","C","D","E","F"] },
  { id: "q11_rural",          opts: ["A","B","C","D","E"] },
  { id: "q12_marks",          opts: ["A","B","C","D","E"] },
  { id: "q13_backlogs",       opts: ["A","B","C","D","E"] },
  { id: "q14_trend",          opts: ["A","B","C","D"] },
  { id: "q15_working",        opts: ["A","B","C","D","E"] },
  { id: "q16_awards",         opts: ["A","B","C","D","E"] },
  { id: "q17_recommendation", opts: ["A","B","C","D","E"] },
  { id: "q18_leadership",     opts: ["A","B","C","D"] },
  { id: "q19_previous",       opts: ["A","B","C","D","E","F"] },
  { id: "q20_other_aid",      opts: ["A","B","C","D","E"] },
  { id: "q21_fraud",          opts: ["A","B","C","D","E"] },
  { id: "q22_amount",         opts: ["A","B","C","D","E"] },
  { id: "q23_scale",          opts: ["A","B","C","D"] },
  { id: "q24_tiebreak",       opts: ["A","B","C","D","E"] },
  { id: "q25_awardees",       opts: ["A","B","C","D","E"] }
];

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 250;

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
        // Exponential backoff
        await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
        continue;
      }
      if (r.status === 404) return 0; // Counter not yet created
    } catch (e) {
      await new Promise(res => setTimeout(res, 200));
    }
  }
  return 0;
}

async function fetchAll() {
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
  cacheUrl.search = ""; // canonical cache key
  const cacheKey = new Request(cacheUrl.toString(), context.request);
  const cache = caches.default;

  // Try edge cache first
  let resp = await cache.match(cacheKey);
  if (resp) {
    return resp;
  }

  // Fresh aggregation
  const data = await fetchAll();

  resp = new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    counters: data
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=20, s-maxage=20",
      "access-control-allow-origin": "*"
    }
  });

  // Store in edge cache (async, doesn't delay response)
  context.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}
