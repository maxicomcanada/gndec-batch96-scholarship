// Cloudflare Pages Function: /api/vote
// POST: append voter {name, phone, fingerprint, timestamp} to jsonblob voters list
// GET ?phone=...: check if phone already voted (for client dedup)

const VOTERS_BLOB = "https://jsonblob.com/api/jsonBlob/019e8fb0-bb69-76b0-9fb4-10fdcd1905b3";
const MIRROR_BLOB = "https://jsonblob.com/api/jsonBlob/019e8fc4-2a17-762d-863e-70e3b3680b53";

function normalizePhone(p) {
  if (!p) return "";
  return String(p).replace(/[^0-9]/g, "").slice(-10); // keep last 10 digits
}

async function getVoters() {
  try {
    const r = await fetch(VOTERS_BLOB, { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      return Array.isArray(d.voters) ? d.voters : [];
    }
  } catch (e) {}
  return [];
}

async function saveVoters(voters) {
  const body = JSON.stringify({
    voters,
    updated: new Date().toISOString(),
    poll: "gndec1996batchLIVE2026"
  });
  // Write to BOTH primary and mirror blob in parallel — redundancy
  const primaryPromise = fetch(VOTERS_BLOB, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body
  });
  const mirrorPromise = fetch(MIRROR_BLOB, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      voters,
      updated: new Date().toISOString(),
      poll: "gndec1996batchLIVE2026",
      mirror: true
    })
  });
  const [primary, mirror] = await Promise.all([
    primaryPromise.catch(() => ({ ok: false })),
    mirrorPromise.catch(() => ({ ok: false }))
  ]);
  return primary; // primary status used for the caller's decision
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    });
  }

  // GET: check if phone already voted
  if (request.method === "GET") {
    const phoneRaw = url.searchParams.get("phone") || "";
    const phone = normalizePhone(phoneRaw);
    if (!phone || phone.length < 7) {
      return new Response(JSON.stringify({ voted: false, reason: "invalid phone" }), {
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }
    const voters = await getVoters();
    const found = voters.find(v => v.phone === phone);
    return new Response(JSON.stringify({
      voted: !!found,
      when: found ? found.timestamp : null
    }), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      }
    });
  }

  // POST: append voter
  if (request.method === "POST") {
    let payload;
    try { payload = await request.json(); }
    catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "bad json" }), {
        status: 400,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }
    const name = String(payload.name || "").trim().slice(0, 100);
    const phone = normalizePhone(payload.phone);
    const fp = String(payload.fingerprint || "").slice(0, 64);
    if (!name || !phone || phone.length < 7) {
      return new Response(JSON.stringify({ ok: false, error: "missing name or phone" }), {
        status: 400,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }

    const voters = await getVoters();
    if (voters.find(v => v.phone === phone)) {
      return new Response(JSON.stringify({ ok: false, error: "phone already voted" }), {
        status: 409,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }

    voters.push({
      name,
      phone,
      fp,
      ip: request.headers.get("cf-connecting-ip") || "",
      country: request.headers.get("cf-ipcountry") || "",
      ua: (request.headers.get("user-agent") || "").slice(0, 200),
      timestamp: new Date().toISOString()
    });
    await saveVoters(voters);

    return new Response(JSON.stringify({ ok: true, count: voters.length }), {
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
    });
  }

  return new Response("method not allowed", { status: 405 });
}
