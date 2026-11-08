/* Social and action icon library. Shared by the page renderer (require) and the dashboard (<script src="/icons.js">). */
(function (root) {
  const SV = (d, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
  const ICONS = {
    instagram: { n: "Instagram", s: SV('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>') },
    tiktok: { n: "TikTok", s: SV('<path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.3 7.3 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z"/>', 1) },
    facebook: { n: "Facebook", s: SV('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z"/>', 1) },
    x: { n: "X", s: SV('<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/>', 1) },
    threads: { n: "Threads", s: SV('<path d="M16.8 11.4c-.4-3.1-2.3-4.6-4.9-4.6-3 0-4.9 2.2-4.9 5.3 0 3.4 2.1 5.5 5.1 5.5 2.5 0 4.2-1.4 4.5-3.5.3-2.3-1.4-3.7-4-3.7-1.8 0-3 .9-3 2.1 0 1.2 1.1 1.9 2.5 1.8 2-.2 3-1.8 2.9-4.6"/>') },
    youtube: { n: "YouTube", s: SV('<path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15V9l5.2 3L10 15Z"/>', 1) },
    linkedin: { n: "LinkedIn", s: SV('<path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3 9h3v12H3V9Zm6 0h3v1.7c.6-1 1.8-2 3.7-2C19 8.7 21 10.4 21 14v7h-3v-6.3c0-1.9-.7-3-2.3-3-1.7 0-2.7 1.2-2.7 3V21H9V9Z"/>', 1) },
    pinterest: { n: "Pinterest", s: SV('<path d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.1-1.9 0-2.7l1.1-4.6s-.3-.6-.3-1.4c0-1.3.8-2.3 1.7-2.3.8 0 1.2.6 1.2 1.3 0 .8-.5 2-.8 3.1-.2.9.5 1.7 1.4 1.7 1.7 0 3-1.8 3-4.4 0-2.3-1.6-3.9-4-3.9-2.7 0-4.3 2-4.3 4.2 0 .8.3 1.7.7 2.2l.1.3-.3 1c0 .2-.2.2-.4.1-1.2-.6-2-2.4-2-3.8 0-3.1 2.3-6 6.5-6 3.4 0 6.1 2.4 6.1 5.7 0 3.4-2.1 6.1-5.1 6.1-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.9-.8 1.9-1.2 2.6A9 9 0 1 0 12 3Z"/>', 1) },
    spotify: { n: "Spotify", s: SV('<circle cx="12" cy="12" r="9.5"/><path d="M7 9.5c3.5-1 7.3-.7 10 .9M7.6 12.6c2.9-.8 5.9-.5 8.2.8M8.2 15.5c2.3-.6 4.6-.4 6.4.6"/>') },
    whatsapp: { n: "WhatsApp", s: SV('<path d="M4 20l1.2-4.1A8.5 8.5 0 1 1 8.4 19L4 20Z"/><path d="M9 8.5c.2 2.9 2.6 5.5 5.6 6l1-1.4-1.8-.9-.8.8c-1-.4-1.9-1.3-2.4-2.4l.8-.8-.8-1.8-1.6.5Z"/>') },
    email: { n: "Email", s: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>') },
    phone: { n: "Phone", s: SV('<path d="M5 3h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 13.5V17a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2Z"/>') },
    maps: { n: "Maps", s: SV('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>') },
    web: { n: "Website", s: SV('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>') },
    calendar: { n: "Calendar", s: SV('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>') },
    bag: { n: "Bag", s: SV('<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>') },
    menu: { n: "Menu", s: SV('<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>') },
    truck: { n: "Delivery", s: SV('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>') },
    gift: { n: "Gift", s: SV('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C10 4 7 4.5 7 6.5S10 8 12 8Zm0 0c2-4 5-3.5 5-1.5S14 8 12 8Z"/>') },
    star: { n: "Star", s: SV('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8L12 3Z"/>') },
    arrow: { n: "Arrow", s: SV('<path d="M7 17 17 7M8 7h9v9"/>') },
  };
  const guessIcon = x => {
    const s = (String(x.label || "") + " " + String(x.url || "")).toLowerCase();
    const rules = [["instagram",/instagram|instagr\.am/],["tiktok",/tiktok/],["facebook",/facebook|fb\.com/],["threads",/threads\.net/],["x",/twitter|x\.com/],["youtube",/youtube|youtu\.be/],["linkedin",/linkedin/],["pinterest",/pinterest/],["spotify",/spotify/],["whatsapp",/whatsapp|wa\.me/],["email",/mailto:/],["phone",/^tel:/],["maps",/maps\.|goo\.gl\/maps/]];
    const hit = rules.find(([, r]) => r.test(s)); return hit ? hit[0] : "web";
  };
  const api = { ICONS, guessIcon };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
