// Cloudflare Pages Function: /api/backup
// Returns a complete snapshot of poll state (counters + voters + metadata)
// for backup purposes — committee can download as JSON anytime.

const TALLY_NS = "gndec1996batchLIVE2026";
const PRIMARY_VOTERS_BLOB = "https://jsonblob.com/api/jsonBlob/019e8fb0-bb69-76b0-9fb4-10fdcd1905b3";
const MIRROR_VOTERS_BLOB = "https://jsonblob.com/api/jsonBlob/019e8fc4-2a17-762d-863e-70e3b3680b53";

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
  { id: "q24_digital_divide",          opts: ["A","B","C"] },
  { id: "q25_pay_it_forward",          opts: ["A","B","C"] },
  { id: "q26_agrarian_crisis",         opts: ["A","B","C"] },
  { id: "q27_border_district",         opts: ["A","B","C"] },
  { id: "q28_seva_commitment",         opts: ["A","B","C"] }
];

async function fetchCounter(key) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://abacus.jasoncameron.dev/get/${TALLY_NS}/${key}`);
      if (r.ok) {
        const d = await r.json();
        return d.value || 0;
      }
      if (r.status === 429) {
        await new Promise(s => setTimeout(s, 500 * Math.pow(2, i)));
        continue;
      }
      if (r.status === 404) return 0;
    } catch (e) {
      await new Promise(s => setTimeout(s, 300));
    }
  }
  return 0;
}

async function fetchAllCounters() {
  const keys = ["total_submissions"];
  QUESTIONS.forEach(q => q.opts.forEach(opt => keys.push(`${q.id}__${opt}`)));
  const out = {};
  for (let i = 0; i < keys.length; i += 5) {
    const batch = keys.slice(i, i + 5);
    const results = await Promise.all(batch.map(async k => [k, await fetchCounter(k)]));
    results.forEach(([k, v]) => out[k] = v);
    if (i + 5 < keys.length) await new Promise(s => setTimeout(s, 200));
  }
  return out;
}

async function fetchVoters(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const wantsDownload = url.searchParams.get('download') === '1';

  const [counters, primaryVoters, mirrorVoters] = await Promise.all([
    fetchAllCounters(),
    fetchVoters(PRIMARY_VOTERS_BLOB),
    fetchVoters(MIRROR_VOTERS_BLOB)
  ]);

  const snapshot = {
    poll: "1996_batch_scholarship_rubric_2026",
    namespace: TALLY_NS,
    snapshotAt: new Date().toISOString(),
    totalVotes: counters.total_submissions || 0,
    counters,
    voters_primary: primaryVoters,
    voters_mirror: mirrorVoters,
    voters_consistent: JSON.stringify(primaryVoters?.voters || []) === JSON.stringify(mirrorVoters?.voters || []),
    questions: QUESTIONS.length,
    options_per_question: 3
  };

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30",
    "access-control-allow-origin": "*"
  };
  if (wantsDownload) {
    const filename = `poll_backup_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    headers["content-disposition"] = `attachment; filename="${filename}"`;
  }

  return new Response(JSON.stringify(snapshot, null, 2), { headers });
}
