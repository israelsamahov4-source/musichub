---
name: Jamly
description: The Hebrew social network for Israeli musicians; a light, quiet app shell where people and music lead.
colors:
  riso-blue: "#2F45C2"
  riso-pink: "#FF4F81"
  riso-yellow: "#FFD84D"
  ink: "#1E1B3A"
  primary: "hsl(231 61% 47%)"
  primary-foreground: "hsl(0 0% 100%)"
  secondary: "hsl(231 70% 96%)"
  secondary-foreground: "hsl(231 61% 40%)"
  background: "hsl(228 33% 97%)"
  foreground: "hsl(246 37% 17%)"
  card: "hsl(0 0% 100%)"
  muted: "hsl(228 26% 95%)"
  muted-foreground: "hsl(240 8% 40%)"
  border: "hsl(228 20% 90%)"
  input: "hsl(228 16% 84%)"
  destructive: "hsl(0 72% 48%)"
  blue-tint: "#E5E9FB"
  pink-tint: "#FFE3EB"
  pink-wash: "#FFF0F4"
  pink-deep: "#B01E4C"
  pink-deepest: "#8E1840"
  yellow-tint: "#FFF2C2"
  yellow-wash: "#FFF6D9"
  yellow-deep: "#6E5200"
typography:
  display:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  name:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  meta:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
  micro:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  sm: "10px"
  md: "12px"
  lg: "14px"
  card: "16px"
  panel: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "40px"
  search-field:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  tab:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
  looking-for-banner:
    backgroundColor: "{colors.pink-wash}"
    textColor: "{colors.pink-deepest}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  count-badge:
    backgroundColor: "{colors.riso-pink}"
    textColor: "{colors.card}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    height: "18px"
  plan-badge-pro:
    backgroundColor: "{colors.yellow-tint}"
    textColor: "{colors.yellow-deep}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  plan-badge-premium:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.riso-yellow}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  audio-player:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "12px"
---

# Design System: Jamly

## Overview

**Creative North Star: "The Quiet Stage"**

Jamly is the category standard played straight at full craft, with Spotify and LinkedIn as the bar. The shell is a light, quiet product frame: a cool near-white ground, white surfaces on hairline borders, soft two-layer shadows, pill controls and one typeface. The chrome steps back so that the performers, people and their music, take the stage. Colour is rationed by meaning rather than spread for decoration: blue acts, pink marks people reaching for each other, yellow marks Pro, and ink carries text and the music itself.

Density is app-like, not editorial. A desktop feed runs in three columns with a narrow centre; on phones it collapses to one column under a compact top bar with a white bottom tab bar. Everything is Hebrew, right to left, with Latin strings (usernames, the brand name) isolated left to right inside it. Most visitors see empty states first, so empty states are built as finished, centred cards, never placeholder text.

The system replaced an earlier risograph-poster look. It keeps the four brand colours and the name, and refuses the poster's devices: no overprinted display type, no paper grain, no ink frames or hard offset shadows, no coloured page bands.

**Key Characteristics:**
- Cool near-white ground, white cards on hairline borders with a soft two-layer shadow.
- One family, Rubik, in a tight UI scale; weight, not size, carries rank.
- Pills for every control; 16px corners for every card.
- Colour by meaning: blue = action, pink = likes / unread / looking for partners, yellow = Pro and highlights, ink = text and the audio player.
- Every person and project gets a stable brand colour from its id.
- Lucide icons at one stroke, thickened only to mark the active tab.

## Colors

Four saturated brand inks on a cool, nearly colourless app neutral; each brand ink has exactly one job.

### Primary
- **Riso Blue** (`riso-blue`, `primary`): every action and the primary button, links, focus rings, the text caret, selection tint (18% alpha), the active phone tab, the "Hub" half of the wordmark, the logo tile, the default profile cover, and the empty-state icon. `secondary` is its pale wash (secondary buttons, empty-state icon disc) with `secondary-foreground` as the deeper blue text on it.

### Secondary
- **Riso Pink** (`riso-pink`): likes (filled heart), unread count badges, the played portion of the audio waveform, and "looking for partners" (the pink message button inside the banner). On light grounds pink text never uses the raw brand pink: it steps down to **Pink Deep** (`pink-deep`, liked-state label, avatar fallback text) or **Pink Deepest** (`pink-deepest`, looking-for labels) for contrast. **Pink Wash** (`pink-wash`) is the ground of the looking-for banner and pill; **Pink Tint** (`pink-tint`) is a pink avatar fallback.

### Tertiary
- **Riso Yellow** (`riso-yellow`): Pro and highlights only. As text it appears on ink (Premium badge, Pro course badge, check marks on the blue landing panel); as a fill it is a person's or course's brand cover. **Yellow Tint** (`yellow-tint`) with **Yellow Deep** (`yellow-deep`) text is the Pro badge and yellow avatar fallback; **Yellow Wash** (`yellow-wash`) is the ground for pending / draft / payment notices.

### Neutral
- **Ink** (`ink`, close to `foreground`): all text, the dark audio player, the Premium badge ground, and the selected state of filter tabs and the desktop nav underline.
- **Cool Ground** (`background`): the page.
- **White** (`card`, popover): cards, top bar (90% with blur), bottom bar (95% with blur), dialogs, menus, inputs.
- **Mist** (`muted`): chips, the header search field, ghost-button hover, skeletons.
- **Slate Text** (`muted-foreground`): timestamps, handles, captions, inactive nav.
- **Hairline** (`border`, usually at 70–80% alpha) and **Field Edge** (`input`): card edges and dividers; input strokes.
- **Alarm Red** (`destructive`): delete actions, the suspended-account bar, invalid fields (border plus 5% wash).
- **Blue Tint** (`blue-tint`): the blue avatar fallback.

### Named Rules
**The One Job Rule.** Each brand colour means one thing. Blue is never a like, pink is never a generic button, yellow is never a warning on its own. A new surface reuses the meaning, not just the hue.

**The Step-Down Rule.** Pink and yellow are too light to be text on white. On light grounds they appear as a tint or wash with their deep companion (`pink-deep`, `pink-deepest`, `yellow-deep`) as the text colour; raw yellow text only ever sits on ink.

**The Brand-For Rule.** A person, project or course without its own image takes a stable brand colour from its id (`brandFor`, the same hash that picks the avatar tint): blue, pink or yellow. It fills the musician-card cover strip (90% opacity), the project-type icon tile, the course cover and the project page's top strip. Content on blue is white; on pink or yellow it is ink.

## Typography

**Display Font:** Rubik (with system-ui, sans-serif)
**Body Font:** Rubik (with system-ui, sans-serif)

**Character:** A single rounded-geometric family that carries Hebrew and Latin with the same voice. Hierarchy comes from weight (400 / 500 / 600 / 700 / 800) on a narrow size range, as a product UI should.

### Hierarchy
- **Display** (800, clamp 44–72px, line-height 1.02, tight tracking): the landing hero headline only.
- **Headline** (700, 28px on phones to 32px from `md`, line-height 1.25, tight tracking): page titles in the page header and the profile name. Landing section heads use the same weight at 28–36px.
- **Title** (700, 18px): empty-state headings, dialog titles (600), card section heads.
- **Name** (700, 15px): people's names on posts, cards and the sidebar profile card; also stat numbers.
- **Body** (400, 15px, line-height 1.625): post text, bios, message bubbles (snug leading in bubbles). Page-header intro lines are 15px slate.
- **UI** (500–600, 14px): buttons (600), tabs and menu items (500), form text on desktop. Inputs are 16px on phones so iOS does not zoom.
- **Meta** (400, 13px): handle and time under a name, card subtitles, small buttons, profile section labels (600, slate).
- **Label** (500, 12px): chips, plan badges (600), desktop nav labels, location lines.
- **Micro** (11px): count badges (700), phone tab labels (500), message timestamps.

### Named Rules
**The Weight-Carries-Rank Rule.** Rank is set by weight before size. A name is 15px bold beside 13px regular meta, not a larger size. Nothing in the app UI exceeds 32px; the 44–72px display size belongs to the landing hero alone.

**The Numbers-Line-Up Rule.** Counts, times and durations use tabular figures (`.tabular`, every `time` element).

## Layout

Containers: the shell, feed and landing run in a 1152px max-width column (`max-w-6xl`) with 16px side padding (20px on the landing); standard pages use 1024px (`.page`, `max-w-5xl`) and focused pages 672px (`.page-narrow`, `max-w-2xl`), each with 24px vertical padding rising to 40px from `md`.

The feed is three columns from `lg` (1024px): a 232px start column (profile summary card with a blue or image cover, stats, shortcuts), a fluid centre of roughly 540px (composer and posts), and a 300px end column (musicians to know, open projects); both side columns are sticky at 96px from the top. Profile and project detail pages use a fluid main column beside a 300px aside from `lg`. Messages is a 340px conversation list beside the thread from `md`, full-bleed and square-cornered on phones.

Grids: musician cards 2 / 3 / 4 columns (gaps 12px, 16px from `sm`); project and course cards 1 / 2 / 3 columns with 16px gaps.

Spacing follows Tailwind's 4px step. Cards pad 16px; page sections stack at 16–24px; inline groups use 8–12px gaps. The top bar is 56px on phones and 64px from `md`; the phone bottom bar is a 5-column grid of 56px-tall tabs plus the safe-area inset, and signed-in pages reserve 80px under the content for it.

### RTL
The document is right to left. Spacing and positioning use logical properties only (start / end, `ps` / `pe`, `ms` / `me`), so mirrored layouts need no overrides. Latin strings inside Hebrew (usernames, the MusicHub wordmark) are wrapped in `.ltr` (direction ltr, isolated). User-written text sets its own direction from its content (`textDir`) and aligns to start. Menus are opened with `dir="rtl"`. Message bubbles cut one corner on the sender's side (own messages `rounded-ss-md` in blue, others `rounded-se-md` in white).

### Touch
On coarse pointers `.tap` gives a control an invisible hit area of at least 44 × 44px without changing its drawn size. Hover effects are gated behind the `can-hover` variant (hover-capable fine pointers) so taps never leave a stuck hover state. Sideways chip and tab rows scroll with `.no-scrollbar`.

## Elevation & Depth

Hybrid: hairline borders define every surface, and a soft, ink-tinted two-layer shadow lifts it slightly. Depth has two levels plus a hover response.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(30 27 58 / 0.04), 0 6px 20px -12px rgb(30 27 58 / 0.14)`): every card at rest, the framed empty state, incoming message bubbles.
- **Pop** (`box-shadow: 0 2px 6px rgb(30 27 58 / 0.06), 0 18px 44px -16px rgb(30 27 58 / 0.28)`): floating layers (dropdown menus, selects, dialogs, the landing preview) and the hover state of linked cards (musician, project, course) on hover-capable devices.
- **Hairline ring** (`box-shadow: inset 0 0 0 1px hsl(var(--border))`): unselected filter tabs; the pink variant (`rgb(255 79 129 / 0.3)`) outlines looking-for pills on the profile.

The sticky top bar and phone bottom bar are translucent white (90% / 95%) with a backdrop blur instead of a shadow.

### Named Rules
**The Soft-Lift Rule.** Shadows are diffuse, ink-tinted and offset downward only. No hard offset shadows, no black shadows, no glow.

## Shapes

Round and friendly, in a fixed ladder. Every control is a full pill: buttons, tabs, chips, badges, the header search, follow buttons, avatars. Every card, the audio player, empty states and dialogs use 16px corners. Inputs, selects, menus, banners and icon tiles use 12px. Landing feature panels and the message composer go to 24px. The logo is a 9/32-radius blue tile holding three rounded equaliser bars and a pink dot; waveform bars are fully rounded. Avatars that overlap a cover sit inside a 4px white ring.

## Components

### Buttons
Calm and tactile: pills that press in.
- **Shape:** full pill; 40px tall (36px small, 48px large, 40px square icon button); semibold 14px (13px small, 15px large); icons 16px.
- **Primary:** riso blue with white text and a faint shadow; hover drops to 90% blue.
- **Outline:** white with a hairline border; hover fills mist. The "quiet" follow button is an outline with a half-strength blue border and blue text.
- **Secondary:** pale blue wash with deep-blue text. **Ghost:** 80% ink text, mist on hover. **Destructive:** alarm red. **Link:** blue text, underline on hover.
- **Press:** every button scales to 0.97 on press (150ms ease-out). Focus shows a 2px blue ring. Disabled is 50% opacity.
- **Follow / Following:** primary (or quiet outline) with a user-plus icon; once following, an outline with a user-check icon.

### Chips
- **Style:** mist pill, 12px medium text at 80% ink, 2px × 10px padding. Used for genres, roles and filters.
- **Looking for:** pink wash with pink-deepest semibold text (musician cards), or white with a pink hairline ring (profile).
- **Plan badges:** Pro is a yellow-tint pill with yellow-deep text and a star; Premium is an ink pill with yellow text and a crown. Status pills elsewhere follow the same tint-plus-deep-text pattern.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white on the cool ground.
- **Shadow Strategy:** Card at rest; Pop on hover for linked cards (see Elevation).
- **Border:** hairline at 80% alpha; internal dividers at 70%.
- **Internal Padding:** 16px (base Card parts default to 24px).
- **Post card:** avatar 48px, name 15px bold with plan badge, handle and time in 13px slate, overflow menu at the end; body at 15px; a three-way action row (like, comment, share) under a hairline, as ghost buttons with 12px corners.
- **Musician card:** a 56px brand-colour cover strip, a 72px avatar overlapping it in a white ring, centred name, two-line subtitle, location, one looking-for pill, a full-width follow button pinned to the bottom; the whole card is the link.
- **Project card:** a 48px brand-colour icon tile with the project-type icon, title, meta line, two-line description and roles wanted.
- **Course card:** a 16:9 brand-colour cover (or image) with the category pill and a faded graduation cap; Pro courses carry the ink-and-yellow Pro badge at the top start.

### Inputs / Fields
- **Style:** white field, 1px field-edge stroke, 12px corners, 40px tall, 14px horizontal padding; 16px text on phones, 14px from `md`; slate placeholder.
- **Focus:** 2px blue ring (selects use a 1px ring).
- **Error / Disabled:** invalid fields take a red border and a 5% red wash; disabled is 50% opacity with a not-allowed cursor.
- **Search:** the header search is a mist pill with a leading search icon that turns white with a faint blue border on focus. The message composer is a borderless mist field with 24px corners that turns white on focus.

### Navigation
- **Desktop top bar:** white at 90% with blur, hairline bottom, 64px. Logo and wordmark, the search pill, then icon-over-label nav items (22px icons, 12px labels, 76px minimum width). Inactive items are slate; the active item turns ink, thickens its icon stroke (1.8 to 2.4) and shows a 2px ink underline. The "me" menu is the avatar over a small label with a chevron.
- **Phone:** a compact 56px top bar with icon buttons for search and notifications; signed-in members get a fixed white bottom tab bar (five tabs, 24px icons, 11px labels) where the active tab is riso blue with a thickened stroke. Visitors get a scrolling row of pill links instead (active pill ink, others mist).
- **Count badges:** pink pills of 11px bold white numbers with a 2px white ring, capped at "99+", pinned to the icon's top end.
- **Filter tabs:** a scrolling row of white pills with a hairline ring; the active tab fills ink with white text.

### Audio Player (signature)
The one dark object in a light world: music is the content, so the player is ink. A 16px-cornered ink panel holds a 48px white circular play button (hover 1.05, press 0.95), the title in 13px semibold white with the subtitle at 60% white, the elapsed / total time in tabular 60% white, and a 52-bar waveform whose bars are seeded from the file (the same track always has the same shape). Played bars turn riso pink; unplayed bars are 25% white. An invisible range input over the waveform is the seek control. Only one track plays at a time.

### Avatars
Circular, from 28px to 128px. Without a photo, the fallback is the person's initials in bold on one of three soft tints chosen from their id: blue tint with riso-blue text, pink tint with pink-deep text, or yellow tint with yellow-deep text. The same hash gives the person's brand colour (see The Brand-For Rule).

### Empty States
A centred white card (or frameless inside another panel) with a 56px pale-blue disc holding a 24px blue icon, an 18px bold heading, one 14px slate line and one action. They must look finished, because they are what most visitors see.

### Motion
- **Press:** buttons scale to 0.97, 150ms ease-out; the play button scales to 0.95 and grows to 1.05 on hover.
- **Rise:** content arriving after load (posts) fades in from 6px below over 320ms on `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Like:** the heart fills pink and settles at 1.1 scale over 200ms.
- **Linked cards:** shadow eases from Card to Pop over 200ms, hover-capable devices only.
- **Overlays:** menus, selects and dialogs fade and zoom from 95% (Radix data-state animations).
- **Reduced motion:** animations collapse to a single 0.01ms frame and only colour, background, border, opacity and shadow transitions remain, so feedback stays without movement.

## Do's and Don'ts

### Do:
- **Do** give every action riso blue and keep pink for likes, unread counts and looking-for, yellow for Pro and highlights.
- **Do** put new cards on white with a hairline border, 16px corners and the Card shadow; lift linked cards to Pop on hover only behind `can-hover`.
- **Do** make every control a pill and press it to 0.97.
- **Do** step pink and yellow down to their tint-plus-deep-text pairs on light grounds.
- **Do** colour people, projects and courses without images with `brandFor(id)`, white content on blue and ink content on pink or yellow.
- **Do** use logical properties (start / end) and wrap Latin strings in `.ltr`.
- **Do** design the empty state as a finished card with one next step.
- **Do** keep icons to Lucide at one stroke, thickening only for the active tab.

### Don't:
- **Don't** bring back the poster: no overprinted display type, no paper grain, no ink frames, no hard offset shadows, no coloured page bands.
- **Don't** set app UI type above 32px or add a second typeface.
- **Don't** use raw pink or yellow as text on white.
- **Don't** use pink or yellow for a primary button; the pink message button belongs only inside the looking-for banner.
- **Don't** make any surface other than the audio player (and the small ink Premium / Pro-course badges) dark.
- **Don't** show invented members, posts or counts in shipping UI; illustration content is labelled as an example.
