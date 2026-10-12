# 🎮 Pixel Forge Studio

A next-generation web application for a fictional indie game studio featuring a **public website**, a **visitor analytics telemetry engine**, and a **2-proportion Z-test A/B experiment platform**, alongside a **login-protected admin mission control panel**.

---

## ⚡ Architecture Overview

```
                          ┌────────────────────────┐
                          │   Visitor / Browser    │
                          └───────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                     │
           (Public & Admin UI)                (Telemetry & A/B)
                   ▼                                     ▼
      ┌─────────────────────────┐           ┌─────────────────────────┐
      │   React + Vite Client   │ ◄───────► │ Tracking & Identity     │
      │  Dark Cyberpunk Design  │           │ Cookie + LocalStorage   │
      └────────────┬────────────┘           └────────────┬────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │ HTTP REST
                                      ▼
                   ┌─────────────────────────────────────┐
                   │        Node.js + Express API        │
                   │    JWT Auth + Rate Limiting + Bot   │
                   └──────────────────┬──────────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────────┐
                   │          SQLite Database            │
                   │ Events, Profiles, Experiments, DB   │
                   └─────────────────────────────────────┘
```

---

## 🚀 Live Services & Ports

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:3333/](http://localhost:3333/) | Public studio website, game portfolio & admin portal |
| **Backend API** | [http://localhost:5555/](http://localhost:5555/) | Express API, analytics ingestion, visitor identity, A/B engine |

---

## 🔑 Default Staff Credentials

Use these credentials or click the one-click demo pre-fill buttons on the Staff Login page:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pixelforge.io` | `admin123` | Full control (CRUD, experiment promotion, simulator, delete) |
| **Editor** | `editor@pixelforge.io` | `editor123` | Content editing, view analytics & inboxes |

---

## 🛡️ Visitor Identity System

Visitor identity uses a privacy-friendly, multi-layer approach designed to remain stable and meaningful without relying on intrusive tracking:

### 1. Dual-Layer Persistence
- On first visit, a unique visitor ID (e.g. `vis_...`) is generated.
- It is stored simultaneously in **`localStorage`** and a **first-party cookie** (`pf_visitor_id`, 1-year expiry, `SameSite=Lax`).
- If either storage medium is cleared by browser cleanup, the system automatically restores the ID from the surviving layer on the next page load.

### 2. Client-Side Soft Fingerprinting
- A lightweight non-unique client-side hash (`user-agent`, `language`, `timezone`, `screen-resolution`, `platform`) is computed.
- If storage was completely wiped within the past 24 hours, the backend checks for matching recent profiles and links the visit as "likely returning" to prevent duplicate profile inflation.

### 3. Session Inactivity Timeout
- Sessions (`pf_session_id`) automatically expire and rotate after **30 minutes of inactivity**, separating visits into distinct session journeys.

### 4. Privacy & "Do Not Track" (DNT)
- A non-intrusive **Cookie & Telemetry Banner** is displayed to visitors with options to **Accept Telemetry** or **Decline / DNT**.
- The tracking engine honors standard browser `navigator.doNotTrack === '1'` and explicit opt-outs. When declined, no persistent identifiers or cookies are stored.

### 5. Returning Visitor Welcome
- When the `/api/visitor/identify` endpoint confirms a returning visitor (`visitCount > 1`), an unobtrusive toast notification welcomes the user back with their visit count.

---

## 🕹️ Developer Tools & A/B Engine HUD

The floating **A/B Engine HUD** allows real-time experimentation without polluting production telemetry:

- **Visibility**: Visible **ONLY** to logged-in admins or when accessing any URL with the `?dev=1` query parameter (e.g., `http://localhost:3333/?dev=1`). Regular visitors will never see the HUD.
- **Collapsible & Dismissible**: The HUD can be collapsed with the arrow toggle or Escape key, and dismissed for the session with a confirmation prompt.
- **Forced Variants**: When forcing **Variant A** or **Variant B** from the HUD, events and conversions are tagged with `is_forced = true`. Forced actions are strictly excluded from statistical Z-test analysis.
- **Reset Test Identity**: The **Reset my test identity (dev)** button prompts for confirmation, then wipes `localStorage`, cookies, and session state to test the new-visitor experience cleanly.

---

## 📊 Demo Traffic Simulator

To demonstrate rich dashboards and charts without waiting for organic traffic, an optional **Demo Traffic Simulator** is available in the Admin Mission Control panel:

- **Simulate Traffic**: Generates realistic synthetic traffic across randomized referrers, device types, pages, and conversion funnels.
- **Simulation Badge**: All simulated events are marked with `is_simulated = true`. An amber badge clearly indicates when simulated data is present in the database.
- **Toggle Simulation Data**: A checkbox allows administrators to view metrics with or without simulated events included.
- **Clear Demo Data**: Click **CLEAR DEMO DATA** to instantly purge all simulated records from the database, returning dashboards to real organic data and clean empty states.

---

## 🪟 Modals & Overlay UX Standards

All modals, popups, and drawers adhere to strict accessibility and usability standards:

- **Visible Close Target**: Minimum 40×40px tap target with `aria-label` in the top right.
- **Keyboard Dismissal**: Closes automatically on the <kbd>Escape</kbd> key.
- **Backdrop Click**: Closes when clicking outside the panel (with confirmation if unsaved changes exist).
- **Body Scroll Lock**: Disables page scrolling while an overlay is active and restores scroll on close.
- **Keyboard Focus Trap**: Traps <kbd>Tab</kbd> navigation within the active modal and returns focus to the trigger on exit.
- **Responsive Layout**: Constrained to `max-h-[90vh]` with internal smooth scrolling for mobile and small screens.

---

---

## 📝 Devlogs & Game Updates Engine

The studio features a real development update pipeline linking technical articles, patch notes, and design journals directly to game titles:

- **Data Model**: `devlogs` table with `title`, `slug` (unique), `category` (ENGINEERING, PATCH NOTES, SOUND & MUSIC, ART & DESIGN, etc.), `excerpt`, `content` (Markdown), `cover_image`, `game_id` (foreign key to games), `version` (optional patch version), `author`, `status` (`draft` / `published`), and `published_at`.
- **Public Reader (`/devlog/:slug`)**: High-legibility reader (~720px max-width, typographic hierarchy, syntax codeblocks, blockquotes, estimated reading time, previous/next article links, share URL button, and themed 404).
- **Catalogue (`/devlogs`)**: Paginated list with category filters and article cards.
- **Home Showcase**: Displays the latest 3 published devlogs dynamically fetched from the database.
- **Game Dossier Timeline**: Each game detail modal includes an **Updates & Patch Notes** timeline listing all published updates for that game, newest first, each opening directly in the reader.
- **Admin Manager (`Devlogs & Updates`)**: Full CRUD panel with title slug auto-generation, live Markdown preview, category selector, game linkage, and draft/published toggle.
- **Launch Announcement Drafts**: When adding a new game title in Admin Games, ticking *"Create a launch announcement devlog"* automatically provisions a draft update linked to that game.

---

## 🌐 Real Social Links for Team Members

Team members feature validated, platform-accurate social links with no dead placeholder icons:

- **Supported Platforms**: Website/Portfolio, GitHub, LinkedIn, X/Twitter, Instagram, YouTube, ArtStation, Behance, itch.io, Twitch, and Email.
- **Auto-expansion & Validation**: The admin form accepts both full `https://` URLs and handles (e.g., `@username` or plain `username`), automatically normalizing them to the platform's profile URL.
- **Direct Profiles**: Icons render only for defined profiles, opening directly in a new tab with `rel="noopener noreferrer"`, brand hover colors, and accessible `aria-label` tags.
- **Member Share & Verification**: Each member has a share button that copies the direct deep link `/team#member-name` to clipboard with a toast notification. "Verified Dev" badges display only when verified by an admin.

---

## 🎖️ Pilot Pass: Zero-Password Identity & Recovery

The **Pilot Pass** gives returning visitors persistent multi-device recognition and wishlist synchronization without requiring passwords or third-party OAuth logins:

### 1. Philosophy: Identifier vs. Credential
- The `visitor_id` is an identifier, **never** a secret credential.
- Visitors are recognized automatically via local storage and first-party cookies.
- To sync data to a new device or recover after clearing browser cache, visitors use an immutable **Recovery Code**.

### 2. Claiming a Pilot Profile
- Accessible via the footer button or a gentle prompt on the visitor's 2nd visit.
- The visitor chooses a unique **Callsign** (3–20 characters, alphanumeric, with profanity filtering) and an optional recovery email.
- Upon claim, an unambiguous recovery key formatted like `PF-XXXX-XXXX-XXXX-XXXX` (using a 32-character charset excluding easily confused characters `0`, `O`, `1`, `I`) is generated with `crypto.randomBytes`.
- **Single View**: The code is displayed once in a modal with **Copy**, **Download .txt**, and a mandatory confirmation checkbox (*"I have saved my recovery code"*).
- **Security**: The database stores **only a cryptographic SHA-256 hash** of the code; the raw key is never persisted on the server.

### 3. Profile Restoration (`/restore`)
- Visitors can restore their profile on any browser by entering their recovery key.
- **Constant-Time Verification**: Uses `crypto.timingSafeEqual` against stored hashes to prevent timing attacks.
- **Brute-Force Protection**: Rate limited to 5 attempts per 15 minutes per IP and profile, with temporary 15-minute lockouts upon repeated failures.
- **Magic Link**: If an email was provided, visitors can request a single-use magic restore link that expires in 15 minutes (in development, links are printed to the server console).

### 4. Pilot HQ (`/pilot`) & Real Features
- Displays callsign, total visits, linked hardware devices (with individual unlink buttons), and synchronized A/B variant assignments.
- **Wishlist**: Visitors can wishlist game titles using the heart button on game cards or dossier modals. Wishlists synchronize to the pilot profile and persist across devices.
- **Saved Preferences**: Display preferences like the CRT Scanline monitor effect are stored and synchronized.
- **Key Rotation**: A *"Generate new code"* button verifies the existing key and rolls a fresh recovery key, instantly invalidating the old one.
- **Data Deletion**: Complete profile deletion with confirmation and recovery code authorization.
- **Admin Visitors Page**: Displays callsigns, linked device counts, total visits, and conversion statuses, while strictly concealing all recovery hashes.

---

## 🛠️ Database Schema (`pixelforge.db`)

- `users`: Admin and editor accounts with hashed bcrypt passwords (initials-based avatars, no stock photos).
- `games`: Game portfolio data, platforms, screenshots, rating, tags, play URLs (unique slugs).
- `team_members`: Studio staff with department, bios, and verified status (unique names, social links JSON).
- `jobs`: Career listings with requirements and perks (unique titles).
- `messages`: Contact form submissions with read/unread statuses and `is_sample` flag.
- `applications`: Job applications with portfolio links and candidate notes.
- `devlogs`: Studio development updates, Markdown articles, patch notes, linked to games.
- `events`: Ingested telemetry events (`page_view`, `click`, `scroll_depth`, `form_submit`, `heartbeat`), indexed by timestamp and visitor ID.
- `visitor_profiles`: Persistent visitor profiles (total visits, pages visited, device matrix, assigned variants, conversion status).
- `pilot_profiles`: Zero-password identity records (callsign, hashed recovery code, email, preferences, wishlist).
- `pilot_devices`: Hardware instances linked to each Pilot Pass profile.
- `experiments`: A/B tests with Variant A/B JSON configurations and winner states.
- `experiment_assignments`: Sticky allocations mapping `visitor_id` + `experiment_id` &rarr; `variant`.
- `experiment_conversions`: Goal events logged per variant (with `is_forced` and `is_simulated` flags).


---

## 🎮 Game Management System, Store Links & Media Pipeline

### 1. Multi-Platform Store Links (`store_links`)
Games now support direct multi-store links (`store_links`), moving beyond single hardcoded URLs while keeping backward compatibility:
- **Supported Platforms**: Steam, Epic Games Store, GOG, itch.io, PlayStation Store, Xbox, Nintendo eShop, App Store, Google Play, Official Website.
- **Link Structure**:
  ```json
  [
    {
      "platform": "Steam",
      "url": "https://store.steampowered.com/app/2099",
      "isPrimary": true,
      "label": "View on Steam"
    },
    {
      "platform": "PlayStation Store",
      "url": "https://store.playstation.com/concept/cybervanguard",
      "isPrimary": false,
      "label": "PlayStation Store"
    }
  ]
  ```
- **Validation (Client & Server)**:
  - URLs must use secure `https://` protocol only.
  - `javascript:` and `data:` schemes are strictly blocked.
  - Strict domain host validation per platform (e.g., Steam must point to `store.steampowered.com`, GOG to `gog.com`, Epic to `store.epicgames.com`, etc.).
  - "Official Website" accepts any valid `https://` address.

### 2. Dual Media Ingestion: File Upload & URL Pasting
Both game covers (`cover_image` / `banner_img`) and screenshot galleries (`screenshots`) accept dual sources:
- **Server File Upload (`POST /api/content/upload`)**:
  - Protected by JWT authentication (`admin` or `editor` roles required).
  - Rate-limited (max 60 uploads per 15 minutes).
  - 5 MB file size limit with server-side MIME type inspection (`image/jpeg`, `image/png`, `image/webp`).
  - Cryptographically secure filenames saved to `backend/uploads/` and served statically.
- **URL Pasting & Verification**:
  - Live preview in Admin Games manager.
  - Client-side pre-flight image loading verification (`new Image()`) before saving. If the image fails to load, the user receives an alert: *"This link doesn't work as an image. Try another link or upload the file."*
  - Detection for Google Images thumbnails (domains with `encrypted-tbn` or `gstatic`) with inline guidance.
- **Accessible Screenshots**:
  - Reorderable list (Move Up / Move Down).
  - Alt-text field per screenshot for accessibility and SEO.

### 3. Public Game Detail Modal (`GameModal.jsx`)
- **Primary CTA**: Dynamically renders the designated primary store link (e.g. *"View on Steam"*). If no store links exist, gracefully displays *"Not available on any store yet"*.
- **Interactive Platform Specs**: Target platform chips in the Specs sidebar link directly to their corresponding store pages when configured.
- **"Also Available On" Section**: Surfaces secondary platforms with platform icons and secure new-tab navigation (`rel="noopener noreferrer"`).
- **Embedded Trailers**: Automatically converts YouTube URLs into interactive nocookie embed iframes as item #0 in the gallery.
- **Gallery Carousel**: Interactive thumbnails, left/right keyboard arrows, mobile touch swipe, and themed SVG fallback on broken images (`onError`).

### 4. Telemetry & Analytics
- **Events Tracked**:
  - `store_click`: Emitted on every store CTA, secondary platform chip, or spec link click with `game_id`, `game_title`, and `platform`.
  - `steam_click`: Maintained for funnel compatibility.
  - `wishlist_add`: Tracked on Pilot Pass wishlist interactions.
- **Admin Dashboard**:
  - "Clicks per Store Platform" breakdown displaying click volume, unique visitors, and percentage of outbound traffic.
