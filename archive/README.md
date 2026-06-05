# GNDEC 1996 Batch Scholarship — Complete Archive

**Captured:** 2026-06-05 · **Total votes:** 46 · **Questions:** 28 · **Sections:** 7

This is a self-contained archive of the 1996 batch scholarship rubric poll. Everything needed to read the results, re-deploy the system, or verify the data is included.

## What's in here

```
gndec1996_scholarship_archive_2026-06-05/
├── README.md                  ← you are here
├── data/                       ← the raw and processed poll data
│   ├── full_backup.json        ← canonical snapshot (counters + voter list + metadata)
│   ├── question_summary.csv    ← human-readable per-question summary (open in Excel)
│   └── raw_results.json        ← /api/results endpoint snapshot
├── pages/                      ← all live HTML pages (frozen at this date)
│   ├── poll.html               ← the "voting closed · thank you" page (current state)
│   ├── poll_results.html       ← live dashboard
│   ├── snapshot.html           ← quick summary view
│   ├── charts.html             ← graphical results
│   ├── interpretation.html     ← detailed verdicts with prose interpretation
│   ├── rubric.html             ← auto-generated final rubric
│   └── voters.html             ← admin per-voter detail view
├── source/                     ← Cloudflare Pages Functions (server-side API)
│   ├── results.js              ← /api/results endpoint
│   ├── vote.js                 ← /api/vote endpoint (now blocks new POSTs)
│   ├── voters.js               ← /api/voters endpoint
│   └── backup.js               ← /api/backup endpoint
└── backups/                    ← historical backup snapshots
```

## How to read the data

**For a quick read:** open `data/question_summary.csv` in Excel or Numbers. One row per question, with section, vote breakdown (A/B/C counts), winner, winning percentage, winning answer label, and verdict (strong/medium/contested).

**For programmatic use:** `data/full_backup.json` has the canonical snapshot — raw counters, question summary, voter list (empty due to data loss noted below), question definitions, and metadata.

**For human interpretation:** open `pages/interpretation.html` in any browser. It pulls live data from the deployed CF Pages site by default; for purely offline use, the CSV is the cleanest.

## Critical data integrity note

The **vote counters** (per-question A/B/C tallies) are COMPLETE and AUTHORITATIVE. These were stored on `abacus.jasoncameron.dev` and never lost.

The **per-voter identity records** (names, phone numbers, individual answers per voter) are UNAVAILABLE. They were stored on JSONBlob (a free third-party service) and were lost when both the primary and mirror blobs expired on 2026-06-05. The two "mirror" copies were on the same provider, which means the redundancy was illusory — when JSONBlob expired the blobs, both vanished simultaneously. This is documented in `data/full_backup.json` under `data_integrity_note`.

What this means in practice: we know exactly what the batch voted in aggregate (the 46 votes, every A/B/C breakdown, every winning %), but we cannot trace which individual person voted what.

## The verdict — in one paragraph

This is fundamentally a need-based scholarship with academic considerations as a floor, not a ceiling. The batch wants the rubric to weight family hardship (orphan, widow mother, disability, agrarian distress, drug-crisis family) far more than marks. Working students should win over higher scorers. Backlogs should not be penalised. Income thresholds should be guidelines, not cliffs. The Punjab connection matters — at minimum a +20% bonus. The award should spread broadly (around 20 students at ₹15K each on a ₹3L budget) rather than concentrate, with a modest emergency buffer. Don't punish previous recipients, but don't entitle them either. Build a giving-back culture through encouragement, not contract.

For per-question depth see `pages/interpretation.html`. For the final scoring rubric see `pages/rubric.html`.

## How to redeploy from this archive

The poll was deployed on **Cloudflare Pages** with **GitHub auto-deploy** from this repo:
`maxicomcanada/gndec-batch96-scholarship`

To rebuild on a new deployment:

1. Create a new GitHub repo, push all files from `pages/` to the root and `source/` to `functions/api/`
2. Connect the repo to Cloudflare Pages (free tier is sufficient)
3. The poll uses two external services:
   - `abacus.jasoncameron.dev` — anonymous counters (worked perfectly)
   - `jsonblob.com` — voter list (this is what failed; for any future deployment, replace with Cloudflare KV bound directly to the Pages project — durable, on your CF account)
4. The TALLY namespace constant is `gndec1996batchLIVE2026`. If you reuse the codebase for a new poll, change this to a fresh string, otherwise the existing 46 votes will appear under the new instance
5. Functions/api/*.js are Cloudflare Pages Functions — they auto-route on deploy

## If you ever need to reopen voting

In `source/vote.js`, flip `VOTING_CLOSED = true` to `false`. Then in `pages/poll.html`, restore the original voting form from git history (the commit log on the GitHub repo shows when poll.html changed to the closed-thank-you page). Both reversible.

## Live URLs (working at time of archive)

- Voting closed page: https://gndec-batch96-scholarship.pages.dev/poll · short: tinyurl.com/gndec96-poll
- Snapshot: https://gndec-batch96-scholarship.pages.dev/snapshot · short: tinyurl.com/gndec96-live
- Charts: https://gndec-batch96-scholarship.pages.dev/charts · short: tinyurl.com/gndec96-charts
- Verdicts: https://gndec-batch96-scholarship.pages.dev/interpretation · short: tinyurl.com/gndec96-verdict
- Rubric: https://gndec-batch96-scholarship.pages.dev/rubric
- Live dashboard: https://gndec-batch96-scholarship.pages.dev/poll_results
- Voters (admin): https://gndec-batch96-scholarship.pages.dev/voters · admin code: gndec1996

## Archive provenance

- Generated: 2026-06-05
- Project: GNDEC 1996 batch alumni scholarship rubric poll
- Status: voting closed, rubric finalised by batch consensus
- GitHub source-of-truth: `maxicomcanada/gndec-batch96-scholarship`
- Storage locations for this archive: workspace folder (local), GitHub repo (`backups/` directory), downloadable ZIP

Sat sri akaal.
