# Sitter Ranking

A working pet-sitting search that shows **why** each sitter ranks where they do, gives new verified sitters a fair first chance, and never lets two owners book the same nights.

I built it for my application to the [Founding Engineer role at Sittsy](https://wellfound.com/jobs/4889873-founding-engineer-full-stack-typescript-remote).

**[How the ranking works: slides](https://claude.ai/artifact/2Q22hnr3o7TdPnzANdvAy8#slide-3dd33bdac6c2)**

> **Unofficial concept, not affiliated with Sittsy.** The look is modelled on Sittsy's search page, but no logo, copy, images or real sitter data are used. All 200 sitters around Paris are invented by a seeded generator.

## How it maps to the role

| The role asks for | What is here | What is not here yet |
|---|---|---|
| **Sitter ranking** | Filters, a five-part score, a breakdown for every result, and live weight sliders | Weights tuned on real booking outcomes |
| **Booking growth** | A boarding request journey that is safe under races and retries, and a fair start for new sitters | Recording searches and outcomes to measure the effect |
| **Smart pricing** | `suggestPrice` and `GET /api/price-suggestion`: local p25, median and p75 prices | A screen that shows them, and any link between price and bookings |
| **TypeScript, Next.js, Node.js, PostgreSQL** | The whole project, in strict TypeScript | |

## See it in five minutes

You need Docker.

```bash
git clone <repo-url> sitter-ranking && cd sitter-ranking
docker compose up -d --build
```

Open http://localhost:8080, then:

1. Search for **boarding** with dates. Sitters who are away or already booked drop out before anything is scored.
2. Look at a sitter's score bar. The parts add up to the score exactly.
3. **Turn off the cold-start boost** and watch new sitters fall. The markers show how many places each sitter moved.
4. Move a weight slider. The server re-ranks, and the URL keeps the whole search, so you can share it.
5. **Request to book** a sitter. The status is saved on the server, so it survives a reload.

The race-safety proof is in [`bookings.repository.integration.test.ts`](apps/api/src/modules/bookings/bookings.repository.integration.test.ts): ten owners try for the same nights at once, and exactly one gets them.

## Setup

**Everything in Docker** is the commands above. Compose starts Postgres, runs migrations and seeds the sitters if the table is empty, then starts the API and nginx. Only nginx (8080) and Postgres (5433) are published. The map and address search need internet.

**Local development with hot reload** needs Node 24:

```bash
nvm install && nvm use
docker compose up -d
npm ci
npm run db:seed    # replaces all sitters and bookings with fresh fake data
npm run dev        # web on http://localhost:3000, API on http://localhost:4000
```

The API needs no setup in development. Its settings and defaults are in [`apps/api/src/config`](apps/api/src/config), and a bad value stops it at start-up with every problem listed.

| Command | What it does |
|---|---|
| `bash scripts/check.sh` | Typecheck, lint, unit tests and production builds |
| `npm run test:integration` | Booking rules against real Postgres, in a separate test database |
| `npx playwright install chromium`, then `npm run test:e2e` | Full journeys in desktop and mobile Chromium |
| `bash scripts/smoke.sh` | End-to-end checks on the running Docker stack; it briefly stops and restarts the API |
| `docker compose down -v` | Stop everything and delete the database |

## Technologies

| Layer | Choice |
|---|---|
| Web | Next.js 16 (static export), React 19, TanStack Query, Leaflet with OpenStreetMap, Photon address search |
| API | Node.js 24, Express 5, hand-written input validation, pino logs, helmet, rate limiting |
| Data | PostgreSQL 16, Drizzle ORM with readable SQL migrations |
| Shared logic | A pure TypeScript package used by both apps |
| Tests | Vitest, Testing Library, Supertest, Playwright |
| Running it | Docker Compose, nginx, GitHub Actions workflow |

## How the ranking works

The [slides](https://claude.ai/artifact/2Q22hnr3o7TdPnzANdvAy8#slide-3dd33bdac6c2) explain each part with worked numbers. In short:

**1. Filter.** A sitter must offer the service, be within its radius (dog walking and drop-ins 5 km, day care 10 km, house sitting 15 km, boarding 20 km) and be free on the dates. A high score can't bring back someone who can't take the job.

**2. Score.**

```
score = 0.35 × quality + 0.30 × distance + 0.25 × cold start
      + 0.20 × activity + 0.15 × responsiveness
```

| Part | Formula, each from 0 to 1 | Why it exists |
|---|---|---|
| **Quality** | `r = (4.5 × 5 + total stars) / (5 + reviews)`, then 3★–5★ mapped to 0–1 | Everyone starts with 5 pretend reviews of 4.5★, so one lucky review can't beat a long record |
| **Distance** | `0.5 ^ (km / 2)` | Halves every 2 km; owners have to get there |
| **Cold start** | `1 − age in days / 30`, only if verified, under 30 days old and with no bookings | A new sitter can't earn reviews without a first booking |
| **Activity** | `ln(1 + bookings in 30 days) / ln(31)`, capped at 1 | The first bookings say more than the 25th |
| **Responsiveness** | `1 / (1 + median reply minutes / 30)` | An owner with dates to fill needs a quick answer |

**3. Sort.** Highest score first. Ties go to the closer sitter, then the lower id, so the order is always the same.

One sitter with a single 5★ review gets a rating of 4.58. A sitter with 80 reviews averaging 4.8 gets 4.78, and rightly stays ahead, though seven 5★ reviews in total would be enough for the newcomer to pass. New sitters can catch up quickly, but not on one review.

## Design decisions

**The business rules are pure functions.** `packages/domain` has no database, no HTTP and no clock; "now" is passed in. That makes every rule quick to test and easy to explain, and the API and web app share one set of rules and types.

**A weighted sum, not a machine-learned model.** There is no booking-outcome data to learn from yet, and a marketplace needs to answer "why is this sitter above that one?". Every result returns each part's value, weight and contribution. The cost is that the weights are my judgement until real outcomes can test them.

**Filters decide who can do the job, the score decides order.** Availability and distance limits are facts, so they remove sitters before scoring. Anything that is a matter of preference should only move sitters up or down, so small markets still show results.

**The database is what prevents double booking.** Search results can be out of date, so availability is rechecked when the request is recorded, and a Postgres exclusion constraint makes overlapping bookings impossible:

```sql
EXCLUDE USING gist (sitter_id WITH =, period WITH &&)
  WHERE (status IN ('requested', 'confirmed'))
```

The integration tests caught a real bug here. With ten owners racing, about 1 in 10 losers hit a Postgres deadlock and would have seen a 503. Locking the sitter's row first made them take turns, so losing a race is now a clean "these dates were just taken".

**Retries can't create a second booking.** Each submission carries an idempotency key, so a double-click or a retry after a lost connection returns the same booking.

**The server owns the price.** Quotes are calculated on the server in integer cents. If the price changed since the owner saw it, nothing is recorded and the owner sees the new total to accept.

**The URL is the search.** Service, place, dates, page and changed weights all live in the address bar, so any ranking can be shared, reloaded or walked with Back. Dragging a slider replaces the history entry instead of flooding it.

**Re-ranking happens on the server.** Slider moves wait 150 ms, then TanStack Query fetches, caches and cancels as needed. Ranking in the browser would feel faster, but would mean sending every candidate's data to the client.

**A static front end.** Next.js exports plain files that nginx serves, so there is no Node server for the front end. The cost is no server rendering, which a public, search-engine-facing listing page would want.

**Drizzle over Prisma.** The schema is plain TypeScript, there is no generated client to forget, and each migration is a SQL file you can read.

**Identity is small but real.** There are no accounts. A browser gets a random token in an HttpOnly, SameSite=Lax cookie, only its hash is stored, and another owner's booking answers 404, the same as one that doesn't exist.

**It behaves like a service.** Bad input returns 400 with every problem listed, responses carry a request id that also appears in the logs, health checks separate "running" from "ready", and shutdown finishes requests in flight. If the API goes down, nginx still answers with JSON, and the UI has designed loading, error, offline and empty states.

## Folder structure

npm workspaces: two apps and one shared package. The apps never import each other.

```
apps/
  api/
    drizzle/              SQL migrations
    src/
      config/ logger/     settings and logs
      db/                 schema, client, seed data and scripts
      modules/            sitters, bookings, availability, owners, health
      shared/             HTTP and shutdown helpers
  web/
    src/
      app/                Next.js routes; composes the features
      features/           sitter-search, booking; these never import each other
      components/ hooks/ lib/ utils/    shared code
packages/
  domain/src/             pure logic used by both apps
    ranking/              weights, signals, cold start, scoring, sorting
    booking/ pricing/     stay rules, quotes, status changes; price suggestion
    search/ location/     URL codec, geography
    calendar/ contract/ pagination/ sitter/ shared/
e2e/                      browser journeys (Playwright)
scripts/                  check.sh, smoke.sh
docker-compose.yml        db → db-setup → api → web (nginx)
```

In the web app, each component, hook and helper has its own folder with its code, styles and tests. ESLint enforces the direction: shared → features → app.

## Tests

| Suite | Passing | What it covers |
|---|---|---|
| Unit, API and component | 417 | Ranking rules, API errors, the UI's states and slider re-ranking |
| Integration, real Postgres | 21 | Ten owners racing, one submission sent ten times at once, expiry, price tampering, ownership |
| Browser, desktop and mobile | 10 | Search, quote, request, confirm and cancel against the real API and database |
| Smoke, real Docker stack | All | Routing through nginx, including the API going down and coming back |

`.github/workflows/ci.yml` is set up to run the check, integration and browser suites on every push and pull request.

## Known limits

- **It ranks in memory.** That's instant for 200 sitters, but at marketplace scale Postgres should first narrow the candidates, for example with an indexed PostGIS radius query.
- **The weights are assumptions** until they are tested against real outcomes.
- **The boost doesn't know how many new sitters are in an area,** so many newcomers could crowd a page. A per-page limit is worth testing.
- **Booking covers boarding only and stops at the request.** There are no payments, and the sitter's reply is simulated and labelled as such.
- **It runs locally, with no public deployment yet.** The Compose file uses local passwords and plain HTTP, and the rate limiter assumes one API instance.

## What I would build next

[Sittsy's blog](https://us.sittsy.com/blog) reports that only New York, Miami and Los Angeles reach 15 boarding sitters, and that sitters apply to owners' requests. Thin supply makes dead-end searches costly, which is why a flexible area and near-match dates are high on this list. The same score could also order the sitters who apply to a request.

1. **Pet fit.** Match pet type, size and number. A wrong match is the worst outcome for an owner.
2. **Flexible area.** Widen the search when results are few, and say so.
3. **Near-match dates.** Show sitters who cover most of a stay, clearly labelled.
4. **Learn from results.** Record searches and outcomes, then tune the weights against one main number: **confirmed bookings per eligible search**, while watching cancellations, response time and support demand.
5. **Smart pricing.** Show new sitters their local price range using `suggestPrice`, then use booking outcomes to learn which prices actually get booked.

## Credits

[Figtree](https://github.com/erikdkennedy/figtree) font (SIL OFL). Sitter portraits are illustrations generated from each sitter's id with [DiceBear](https://www.dicebear.com) Lorelei (CC0), so no photo of a real person is used. Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
