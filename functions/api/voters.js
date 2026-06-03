// Cloudflare Pages Function: /api/voters
// Returns the live voter list (with answers). Server-side fetch from jsonblob → no browser CORS issues.

const PRIMARY = "https://jsonblob.com/api/jsonBlob/019e8fb0-bb69-76b0-9fb4-10fdcd1905b3";
const MIRROR  = "https://jsonblob.com/api/jsonBlob/019e8fc4-2a17-762d-863e-70e3b3680b53";

async function tryFetch(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

export async function onRequest(context) {
  // Try primary first
  let data = await tryFetch(PRIMARY);
  let source = "primary";
  if (!data || !Array.isArray(data.voters)) {
    data = await tryFetch(MIRROR);
    source = "mirror";
  }
  const voters = (data && Array.isArray(data.voters)) ? data.voters : [];

  return new Response(JSON.stringify({
    ok: true,
    source,
    count: voters.length,
    voters,
    fetchedAt: new Date().toISOString()
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}
