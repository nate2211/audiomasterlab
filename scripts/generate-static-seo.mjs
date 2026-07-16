import { mkdir, readFile, writeFile } from "node:fs/promises";

const routes = {
  audio: ["Audio Player & Browser Audio Tools", "Upload audio, build playlists, apply WebAudio effects and keep playback running while navigating AudioMaster Lab."],
  archive: ["Internet Archive Audio Browser", "Search public Archive.org audio, add direct playable media to playlists and continue listening across every page."],
  news: ["Latest Music News & New Releases", "Read the newest music articles, release updates, videos and public music stories available to AudioMaster Lab."],
  editor: ["Online Audio Editor", "Edit waveforms, effects, regions and browser audio projects, then export finished audio."],
  recorder: ["Online Audio Recorder", "Record microphones, vocals and instruments in your browser with waveform monitoring and export tools."],
  youtube: ["YouTube Music Workspace", "Search and organize embeddable music videos in AudioMaster Lab."],
  transcribe: ["Audio Transcription Tool", "Transcribe supported audio in the browser and export TXT, SRT, VTT or JSON."],
  visualizer: ["3D Audio Visualizer", "Build waveform, spectrum, oscilloscope and 3D music visualizations in your browser."],
  community: ["AudioMaster Lab Community", "Discover shared tracks, browser audio projects and community posts."],
  help: ["AudioMaster Lab Help", "Learn how to use the player, editor, Archive browser, recorder, transcription and visualization tools."],
  about: ["About AudioMaster Lab", "Learn about the browser-based AudioMaster Lab creative audio workspace."],
  contact: ["Contact AudioMaster Lab", "Contact AudioMaster Lab for support, feedback and feature requests."],
  privacy: ["Privacy Policy", "Read how AudioMaster Lab handles browser audio, saved settings and user information."],
  terms: ["Terms of Use", "Read the terms for using AudioMaster Lab browser audio tools."],
  copyright: ["Copyright", "AudioMaster Lab copyright information and responsible media-use guidance."],
};

const shell = await readFile("dist/index.html", "utf8");
for (const [route, [title, description]] of Object.entries(routes)) {
  const canonical = `https://audiomasterlab.com/${route}`;
  const visible = `<main id="seo-content" style="position:absolute;left:-10000px"><h1>${title}</h1><p>${description}</p><a href="/audio">Audio Player</a> <a href="/archive">Archive Audio</a> <a href="/news">Music News</a></main>`;
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":route === "news" ? "CollectionPage" : "WebPage",name:title,url:canonical,description,isPartOf:{"@type":"WebSite",name:"AudioMaster Lab",url:"https://audiomasterlab.com/"}})}</script>`;
  const html = shell
    .replace(/<title>.*?<\/title>/, `<title>${title} | AudioMaster Lab</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}">`)
    .replace("</head>", `${jsonLd}</head>`)
    .replace('<div id="root"></div>', `${visible}<div id="root"></div>`);
  await mkdir(`dist/${route}`, { recursive: true });
  await writeFile(`dist/${route}/index.html`, html);
}
console.log(`Generated ${Object.keys(routes).length} crawlable route documents without react-snap.`);
