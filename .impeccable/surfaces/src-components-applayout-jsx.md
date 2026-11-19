---
version: 1
slug: "src-components-applayout-jsx"
primary_target: "src/components/AppLayout.jsx"
related_targets: ["src/pages/Feed.jsx","src/pages/Profile.jsx","src/pages/Discover.jsx"]
---

# App shell and member screens

Scope: the signed-in app (feed, profile, musicians, projects, courses, messages, notifications, settings) and its shell. Mode: Operate.
Audience and job: Israeli music community members, mostly on phones, splitting time between the feed and finding people/projects.
Constraints: Hebrew RTL; name Jamly (formerly MusicHub) and the four brand colors stay; pre-launch, so empty states are common and must look finished.
User steer: the poster look reads banal and "like a landing page". Light app. Craft bar: Spotify and LinkedIn.

## Direction contract

THESIS: The category standard played straight at full craft: a light, quiet product shell where people and music lead. Refuses the poster: no overprinted display type, no paper grain, no ink frames or hard offset shadows, no coloured page bands.
OWN-WORLD: Cool near-white ground, white surfaces on hairline borders and soft two-layer shadows, 16px card radius, pill controls. Rubik in a tight UI scale (13/14/15/18/24/32), weight carries rank. Riso blue does every action and active state; pink only for likes, unread and "looking for partners"; yellow only for Pro and highlights; ink for text and the dark audio player. Lucide icons, one stroke.
STORY: A member opens the app, sees who in their scene posted music and who is looking for partners, plays a track in place, follows, messages or joins a project, and finds their own profile reading like a professional page.
FIRST VIEWPORT: Desktop: a white top bar (logo, search, icon-over-label nav, me), three columns: profile summary card and shortcuts at the start, composer and feed in the centre (560px), musicians to know and open projects at the end. Phone: compact top bar, the feed, a white bottom tab bar with the active tab in blue. Profile: LinkedIn-style header card with cover, overlapping avatar, name at 28-32px, headline, location, counts, Follow and Message actions.
FORM: canon (the user took the category standard after the roll), references Spotify and LinkedIn. seed:8a46a639d4c1e68b
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
