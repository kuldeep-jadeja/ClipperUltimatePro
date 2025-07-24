// // pages/api/downloadClip.js
// import fs from "fs";
// import path from "path";
// import fetch from "node-fetch";
// import { pipeline } from "stream/promises";
// import { parse } from "cookie";

// import { connectToDatabase } from "../../lib/mongodb";
// import Clip from "../../models/Clip";

// const THUMB_TO_UUID_MP4 = (thumb) => thumb.split("-preview")[0] + ".mp4";

// /** Try HEAD on each URL; return the first that 200s */
// async function probeUrls(urls) {
//     for (const u of urls) {
//         try {
//             const resp = await fetch(u, { method: "HEAD" });
//             if (resp.ok) return u;
//         } catch {
//             /* ignore */
//         }
//     }
//     return null;
// }

// /** If static probes failed, scrape the embed page for the real <source> URL */
// async function fetchViaEmbed(slug, host) {
//     const embedUrl = `https://clips.twitch.tv/embed?clip=${slug}&parent=${host}`;
//     const html = await fetch(embedUrl).then((r) => r.text());
//     const m = html.match(/<source\s+src="([^"]+\.mp4\?sig=[^"]+)"/);
//     return m ? m[1] : null;
// }

// export default async function handler(req, res) {
//     if (req.method !== "POST")
//         return res.status(405).json({ error: "POST only" });

//     const { clipId } = req.body;
//     if (!clipId || typeof clipId !== "string")
//         return res.status(400).json({ error: "clipId required" });

//     // 1️⃣ Grab user OAuth from cookie
//     const cookies = parse(req.headers.cookie || "");
//     const bearer = cookies.twitch_token;
//     if (!bearer) return res.status(401).json({ error: "no Twitch session" });

//     await connectToDatabase();

//     try {
//         // 2️⃣ Look up clip in Mongo (to cache downloadUrl)
//         const clip = await Clip.findOne({ clipId }).lean();
//         if (!clip) return res.status(404).json({ error: "clip not in DB" });

//         let mp4 = clip.downloadUrl;
//         if (!mp4) {
//             // 3️⃣ Fetch Helix metadata
//             const helix = await fetch(
//                 `https://api.twitch.tv/helix/clips?id=${clipId}`,
//                 {
//                     headers: {
//                         "Client-ID": process.env.TWITCH_CLIENT_ID,
//                         Authorization: `Bearer ${bearer}`,
//                     },
//                 }
//             ).then((r) => r.json());

//             const meta = helix.data?.[0];
//             if (!meta) return res.status(404).json({ error: "clip not found" });

//             // 4️⃣ Build three candidate URLs
//             const uuidMp4 = THUMB_TO_UUID_MP4(meta.thumbnail_url);
//             const slug = meta.url.split("/").pop();  // e.g. Crepuscular…-hash
//             const clipMp4 = `https://clips-media-assets2.twitch.tv/clip-${slug}.mp4`;
//             const legacy = `https://production.assets.clips.twitchcdn.net/${slug}.mp4`;

//             // 5️⃣ Probe them
//             mp4 = await probeUrls([uuidMp4, clipMp4, legacy]);

//             // 6️⃣ If still missing, scrape the embed page
//             if (!mp4) {
//                 const host = req.headers.host || "localhost";
//                 mp4 = await fetchViaEmbed(slug, host);
//             }

//             if (!mp4) {
//                 return res.status(404).json({ error: "no valid CDN URL found" });
//             }

//             // 7️⃣ Cache for next time
//             await Clip.updateOne(
//                 { clipId },
//                 { $set: { downloadUrl: mp4 } },
//                 { upsert: true }
//             );
//         }

//         // 8️⃣ Save to disk under /public/downloads/<broadcaster>/
//         const slug = clipId; // keep names simple
//         const broadcaster = clip.streamerName.replace(/\s+/g, "_");
//         const outDir = path.join(
//             process.cwd(),
//             "public",
//             "downloads",
//             broadcaster
//         );
//         await fs.promises.mkdir(outDir, { recursive: true });
//         const outPath = path.join(outDir, `${slug}.mp4`);

//         if (!fs.existsSync(outPath)) {
//             const cdnRes = await fetch(mp4);
//             if (!cdnRes.ok) {
//                 return res
//                     .status(cdnRes.status)
//                     .json({ error: `CDN responded ${cdnRes.status}` });
//             }
//             await pipeline(cdnRes.body, fs.createWriteStream(outPath));
//         }

//         // 9️⃣ Respond with the public web path
//         const downloadPath = `/downloads/${broadcaster}/${slug}.mp4`;
//         res.json({ success: true, downloadPath });
//     } catch (e) {
//         console.error("downloadClip error", e);
//         res.status(500).json({ error: "download failed" });
//     }
// }


// pages/api/downloadClip.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import { parse } from "cookie";

import { connectToDatabase } from "../../lib/mongodb";
import Clip from "../../models/Clip";

// External secure API for fetching download URL
const EXTERNAL_API_BASE = "https://0np5twiut4.execute-api.us-east-1.amazonaws.com/dev/api/v2/media/fetch/secure-token-xyz789";

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "POST only" });

    const { clipId } = req.body;
    if (!clipId || typeof clipId !== "string")
        return res.status(400).json({ error: "clipId required" });

    // 1️⃣ Grab user OAuth from cookie
    const cookies = parse(req.headers.cookie || "");
    const bearer = cookies.twitch_token;
    if (!bearer) return res.status(401).json({ error: "no Twitch session" });

    await connectToDatabase();

    try {
        // 2️⃣ Look up clip in Mongo (to cache downloadUrl)
        const clip = await Clip.findOne({ clipId }).lean();
        if (!clip) return res.status(404).json({ error: "clip not in DB" });

        let mp4 = clip.downloadUrl;

        if (!mp4) {
            // 3️⃣ Try secure external API
            try {
                const externalRes = await fetch(`${EXTERNAL_API_BASE}?id=${clipId}`);
                const externalJson = await externalRes.json();
                const externalClip = externalJson?.data?.[0];
                mp4 = externalClip?.video_url || null;
            } catch (err) {
                console.warn("External API fetch failed:", err);
            }

            // 4️⃣ Fallback to Twitch Helix metadata if external fails
            if (!mp4) {
                const helix = await fetch(
                    `https://api.twitch.tv/helix/clips?id=${clipId}`,
                    {
                        headers: {
                            "Client-ID": process.env.TWITCH_CLIENT_ID,
                            Authorization: `Bearer ${bearer}`,
                        },
                    }
                ).then((r) => r.json());

                const meta = helix.data?.[0];
                if (!meta) return res.status(404).json({ error: "clip not found (Helix)" });

                const thumb = meta.thumbnail_url;
                const slug = meta.url.split("/").pop();

                const candidates = [
                    thumb.split("-preview")[0] + ".mp4",
                    `https://clips-media-assets2.twitch.tv/clip-${slug}.mp4`,
                    `https://production.assets.clips.twitchcdn.net/${slug}.mp4`
                ];

                for (const url of candidates) {
                    try {
                        const probe = await fetch(url, { method: "HEAD" });
                        if (probe.ok) {
                            mp4 = url;
                            break;
                        }
                    } catch {/* skip */ }
                }

                // Last resort: scrape embed page
                if (!mp4) {
                    const embedUrl = `https://clips.twitch.tv/embed?clip=${slug}&parent=${req.headers.host || "localhost"}`;
                    const html = await fetch(embedUrl).then(r => r.text());
                    const m = html.match(/<source\s+src="([^"]+\.mp4\?sig=[^"]+)"/);
                    if (m) mp4 = m[1];
                }

                if (!mp4) {
                    return res.status(404).json({ error: "no valid video URL found" });
                }
            }

            // 5️⃣ Cache video URL in DB
            await Clip.updateOne(
                { clipId },
                { $set: { downloadUrl: mp4 } },
                { upsert: true }
            );
        }

        // 6️⃣ Save to disk under /public/downloads/<broadcaster>/
        const slug = clipId;
        const broadcaster = clip.streamerName.replace(/\s+/g, "_");
        const outDir = path.join(process.cwd(), "public", "downloads", broadcaster);
        await fs.promises.mkdir(outDir, { recursive: true });

        const outPath = path.join(outDir, `${slug}.mp4`);
        if (!fs.existsSync(outPath)) {
            const cdnRes = await fetch(mp4);
            if (!cdnRes.ok) {
                return res
                    .status(cdnRes.status)
                    .json({ error: `CDN responded ${cdnRes.status}` });
            }
            await pipeline(cdnRes.body, fs.createWriteStream(outPath));
        }

        const downloadPath = `/downloads/${broadcaster}/${slug}.mp4`;
        res.json({ success: true, downloadPath });
    } catch (e) {
        console.error("downloadClip error", e);
        res.status(500).json({ error: "download failed" });
    }
}
