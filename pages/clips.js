// // pages/clips.js
// "use client";

// import useSWR from 'swr';
// import { useState } from 'react';
// import { ExternalLink, Loader2, RefreshCw, Download } from 'lucide-react';

// const fetcher = (url) => fetch(url).then((r) => r.json());

// export default function ClipLibrary() {
//     const { data, isLoading, mutate } = useSWR('/api/clips', fetcher, {
//         refreshInterval: 60_000,
//     });
//     const [search, setSearch] = useState('');

//     const filtered =
//         data?.filter((c) =>
//             c.streamerName.toLowerCase().includes(search.toLowerCase()),
//         ) ?? [];
//     // const [status, setStatus] = useState('idle');
//     // const [progress, setProgress] = useState(0);

//     // const handleDownload = async () => {
//     //     setStatus('downloading');

//     //     try {
//     //         const response = await fetch('/api/downloadClip', {
//     //             method: 'POST',
//     //             headers: { 'Content-Type': 'application/json' },
//     //             body: JSON.stringify({ clipId: clip.clipId })
//     //         });

//     //         const result = await response.json();

//     //         if (result.success) {
//     //             setStatus('success');
//     //             const a = document.createElement('a');
//     //             a.href = result.downloadPath;
//     //             a.download = `${clip.streamerName}_${clip.clipId}.mp4`;
//     //             a.click();
//     //         } else {
//     //             setStatus('error');
//     //         }
//     //     } catch (error) {
//     //         setStatus('error');
//     //         console.error('Download error:', error);
//     //     }
//     // };

//     return (
//         <div className="min-h-screen bg-gray-900 text-white px-4 py-8 max-w-6xl mx-auto">
//             <h1 className="text-3xl font-bold mb-6">🎞️ Clip Library</h1>

//             {/* search + refresh */}
//             <div className="flex items-center gap-3 mb-6">
//                 <input
//                     type="text"
//                     placeholder="Filter by streamer…"
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     className="w-full sm:w-72 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
//                 />
//                 <button
//                     onClick={() => mutate()}
//                     className="p-2 rounded-lg border border-gray-600 hover:bg-gray-800"
//                 >
//                     <RefreshCw size={18} />
//                 </button>
//             </div>

//             {isLoading && (
//                 <div className="flex justify-center py-20">
//                     <Loader2 className="animate-spin" size={32} />
//                 </div>
//             )}

//             {!isLoading && filtered.length === 0 && (
//                 <p className="text-gray-400">No clips found.</p>
//             )}

//             <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
//                 {filtered.map((clip) => (
//                     <div
//                         key={clip._id}
//                         className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col"
//                     >
//                         {/* Twitch embed thumbnail */}
//                         {/* Twitch gives a thumbnail by swapping '.mp4' with '.jpg' on the URL
//                  or via clip.thumbnail_url if you store it. Fallback: Twitch player */}
//                         {/* <a
//                             href={clip.url}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="relative"
//                         >

//                             <iframe
//                                 src={`https://clips.twitch.tv/embed?clip=${clip.clipId}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`}
//                                 height="180"
//                                 width="100%"
//                                 allowFullScreen
//                                 className="block"
//                             />
//                         </a> */}

//                         <div className="p-4 flex-1 flex flex-col">
//                             <h3 className="font-semibold mb-1 text-purple-400">{clip.streamerName}</h3>
//                             <p className="text-sm text-gray-400 mb-2">
//                                 {new Date(clip.createdAt).toLocaleString()}
//                             </p>

//                             <a
//                                 href={clip.url}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="mt-auto inline-flex items-center gap-1 text-sm text-purple-400 hover:underline"
//                             >
//                                 Watch clip <ExternalLink size={14} />
//                             </a>

//                             <button
//                                 className="mt-2 inline-flex items-center gap-1 text-sm text-purple-400 hover:underline"
//                                 disabled={status === 'downloading'}
//                                 onClick={async () => {
//                                     setStatus('downloading');
//                                     try {
//                                         const r = await fetch('/api/downloadClip', {
//                                             method: 'POST',
//                                             headers: { 'Content-Type': 'application/json' },
//                                             body: JSON.stringify({ clipId: clip.clipId }),
//                                         }).then(r => r.json());

//                                         if (r.success) {
//                                             setStatus('success');
//                                             /* trigger browser download */
//                                             const a = document.createElement('a');
//                                             a.href = r.downloadPath;
//                                             a.download = `${clip.streamerName}_${clip.clipId}.mp4`;
//                                             a.click();
//                                         } else {
//                                             setStatus('error');
//                                         }
//                                     } catch (err) {
//                                         console.error(err);
//                                         setStatus('error');
//                                     } finally {
//                                         setTimeout(() => setStatus('idle'), 3000);
//                                     }
//                                 }}
//                             >
//                                 {status === 'idle' && <>Download <Download size={14} /></>}
//                                 {status === 'downloading' && 'Downloading…'}
//                                 {status === 'success' && 'Saved!'}
//                                 {status === 'error' && 'Error'}
//                             </button>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }




// pages/clips.js
"use client";

import { useState } from "react";
import useSWR from "swr";
import {
    ExternalLink,
    RefreshCw,
    Loader2,
    Download,
} from "lucide-react";

const fetcher = (url) => fetch(url).then((r) => r.json());

function ClipCard({ clip }) {
    const [status, setStatus] = useState("idle"); // idle | down | ok | err

    const downloadClip = async () => {
        if (status === "down") return;
        setStatus("down");
        try {
            const res = await fetch("/api/downloadClip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clipId: clip.clipId }),
            });
            const json = await res.json();
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                window.open(json.downloadPath, "_blank");
            } else {
                const a = document.createElement("a");
                a.href = json.downloadPath;
                a.download = `${clip.streamerName}_${clip.clipId}.mp4`;
                a.click();
            }
        } catch {
            setStatus("err");
        } finally {
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
            {/* embed */}
            {/* <iframe
                src={`https://clips.twitch.tv/embed?clip=${clip.clipId}&parent=${typeof window !== "undefined"
                    ? window.location.hostname
                    : "localhost"
                    }`}
                height="180"
                width="100%"
                allowFullScreen
                className="block"
            /> */}

            {/* body */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-1 text-purple-400">
                    {clip.streamerName}
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                    {new Date(clip.createdAt).toLocaleString()}
                </p>

                <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-400 hover:underline"
                >
                    Watch clip <ExternalLink size={14} />
                </a>

                {/* download button */}
                <button
                    onClick={downloadClip}
                    disabled={status === "down"}
                    className="mt-2 inline-flex items-center justify-center gap-1 text-sm
                     rounded-lg border border-purple-500 px-3 py-1.5
                     disabled:opacity-60 bg-purple-600 hover:bg-purple-700"
                >
                    {status === "idle" && (
                        <>
                            Download <Download size={14} />
                        </>
                    )}
                    {status === "down" && "Downloading…"}
                    {status === "ok" && "Saved!"}
                    {status === "err" && "Error"}
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------- */
/* main library page                                              */
export default function ClipLibrary() {
    const { data, isLoading, mutate } = useSWR("/api/clips", fetcher, {
        refreshInterval: 60_000,
    });
    const [search, setSearch] = useState("");

    const filtered =
        data?.filter((c) =>
            c.streamerName.toLowerCase().includes(search.toLowerCase())
        ) ?? [];

    return (
        <div className="min-h-screen bg-gray-900 text-white px-4 py-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🎞️ Clip Library</h1>

            {/* search + refresh */}
            <div className="flex items-center gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Filter by streamer…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-72 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                    onClick={() => mutate()}
                    className="p-2 rounded-lg border border-gray-600 hover:bg-gray-800"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {isLoading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            )}

            {!isLoading && filtered.length === 0 && (
                <p className="text-gray-400">No clips found.</p>
            )}

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((clip) => (
                    <ClipCard key={clip._id} clip={clip} />
                ))}
            </div>
        </div>
    );
}
