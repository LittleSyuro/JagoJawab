// Menyimpan & membaca nilai latihan di Netlify Blobs, supaya nilai dari HP mana pun
// terkumpul di satu tempat dan bisa dilihat di tab "Rekap nilai".
import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const FIELDS = ["nama", "mapel", "mode", "benar", "total", "skor", "detik", "perTopik", "waktu", "catatan", "pelanggaran"];

export default async (req) => {
  const store = getStore({ name: "hasil", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const items = await Promise.all(
      blobs.map(async ({ key }) => {
        const rec = await store.get(key, { type: "json" });
        return rec ? { id: key, ...rec } : null;
      })
    );
    return json(items.filter(Boolean).sort((a, b) => (b.waktu < a.waktu ? -1 : 1)));
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON tidak valid" }, 400); }
    const nama = String(body.nama || "").trim().slice(0, 40);
    if (!nama || !Number.isFinite(body.skor) || !Number.isFinite(body.total)) {
      return json({ error: "Data nilai tidak lengkap" }, 400);
    }
    const rec = {};
    for (const f of FIELDS) if (body[f] !== undefined) rec[f] = body[f];
    rec.nama = nama;
    if (rec.catatan !== undefined) rec.catatan = String(rec.catatan).slice(0, 120);
    if (rec.pelanggaran !== undefined) rec.pelanggaran = Number(rec.pelanggaran) || 0;
    rec.waktu = typeof rec.waktu === "string" ? rec.waktu : new Date().toISOString();
    const id = rec.waktu.replace(/[^0-9]/g, "") + "-" + Math.random().toString(36).slice(2, 8);
    await store.setJSON(id, rec);
    return json({ id }, 201);
  }

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id wajib" }, 400);
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: "Metode tidak didukung" }, 405);
};

export const config = { path: "/api/hasil" };
