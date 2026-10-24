# AlumTrack — Public View (Design Only)

Front-end design of the four pages a visitor sees first. No backend, no database, no login logic — buttons and links navigate between pages using placeholder content.

## Visual direction

- Palette: white base, black text, dark red as the dominant brand color (headers, buttons, accents), yellow for highlights/badges, green for status chips (e.g. "Verified", "Employed").
- Typography: the default system/UI sans-serif used across Lovable — no custom display fonts.
- Clean institutional look: sharp cards, thin borders, generous spacing, MSU-style formality.

## Pages

**1. Home (`/`)**

- Home: "AlumTrack — Alumni Tracing System and Online Platform, MSU Main Campus" with Search Alumni and Login/Sign in buttons.
- Summary stat strip (alumni traced, colleges, batches, events) using placeholder numbers.
- "What you can do" cards: Search Alumni, Alumni Map, News & Events, Register/Update Profile.
- Preview strip of latest news, linking to News & Events.
- Short OARCC teaser linking to the OARCC page.

**2. Search (`/search`)**

- Search bar for name.
- Left sidebar filters: Course, College, Region, Batch Year (dropdowns/checkboxes, plus a Clear Filters action).
- Results as alumni cards: profile picture, full name, course, batch, job title, company, region.
- Grid/list toggle and a result count line. Sample alumni data is hard-coded for the design.

**3. News & Events (`/news`)**

- Featured post at top, then a grid of news/event cards with date, category tag (News / Event / Job), image, title, excerpt.
- Simple category filter tabs.
- Cards are clickable to a detail view of the same posted content.

**4. OARCC (`/oarcc`)**

- Office header: Office of the President — Office of Alumni Relations and Career Center.
- Brief description (1972 creation, Special Order #119-P, Reorganization Plan) exactly as provided.
- Vision and Mission side-by-side panels.
- Goals as a numbered list.
- Core Values as chips: Teamwork, Excellence, Transparency, Equity, Accountability, Participative, Commitment.
- Function of the Office paragraph.
- Three Sections cards: Research and Multi-media; Administrative; Community Service and Development of Alumni Support.
- Contact block: address, 0956-739-3998, [msuoarcc@gmail.com](mailto:msuoarcc@gmail.com), office hours Mon–Fri 8AM–5PM, plus social buttons.

## Shared shell

- Top navigation: AlumTrack logo, links to Home, Search, News & Events, OARCC, and a Login button (routes to a placeholder login page).
- Footer: office contact summary, quick links, socials, copyright.
- Responsive: mobile menu, stacked filters on Search.

## Technical notes

- Routes: `src/routes/index.tsx` (rewritten from the placeholder), `search.tsx`, `news.tsx`, `oarcc.tsx`, plus a minimal `login.tsx` so the Login button lands somewhere.
- Colors defined as semantic tokens in `src/styles.css` (oklch) — no hard-coded color classes in components.
- Header/footer rendered in `src/routes/__root.tsx` around the outlet.
- Each route gets its own title/description/OG metadata.
- All alumni, news, and stats are static placeholder data in the components.

## Not in this pass

Alumni/admin dashboards, registration and login behavior, GIS map, and any data persistence — those come after the public view is approved.