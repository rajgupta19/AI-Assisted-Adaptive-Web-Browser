# AI-Assisted Adaptive Web Browser

> **HAI Project B · Group 2 · IIITD Semester 8**  
> Raj Gupta · Rishab Kumar Chowdhary · Ansh Varshney

---

## What Is This?

A **Chrome browser extension** that observes how you interact with a webpage — where you hover, how long sections stay in your viewport, where you pause your scroll — and uses that behavioural data to **restructure the page in real-time**.

High-attention sections are visually emphasised. Low-engagement content is collapsed. Known ad patterns are dimmed. The result is a page that reflects *your* reading behaviour rather than the site's original layout.

The extension was built as the experimental artefact for a controlled **within-subjects Human-AI Interaction (HAI) user study** comparing task performance on adaptive vs. non-adaptive pages.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Repository Structure](#repository-structure)
3. [Extension Architecture](#extension-architecture)
4. [Data Flow](#data-flow)
5. [Installation](#installation)
6. [Running the Extension](#running-the-extension)
7. [User Study Design](#user-study-design)
8. [Test Suite](#test-suite)
9. [Data Analysis](#data-analysis)
10. [JSON Data Format](#json-data-format)
11. [Troubleshooting](#troubleshooting)

---

## How It Works

### The three-stage pipeline

```
Browse page → Collect signals → Score elements → Apply layout
```

**Stage 1 — Signal collection (`tracker.js`)**  
The moment adaptive mode is switched on, the extension starts passively monitoring five behavioural signals for every qualifying DOM element on the page:

| Signal | What it measures |
|---|---|
| `viewportMs` | Milliseconds an element spends visible in the browser viewport |
| `hoverMs` | Milliseconds the mouse cursor is positioned over the element |
| `clickCount` | Number of click events on the element |
| `scrollPauses` | How many times the user paused scrolling while this element was visible |
| `revisits` | How many times the element re-entered the viewport after having left |

No changes are made to the page at this stage. The extension only watches.

**Stage 2 — Engagement scoring (`scorer.js`)**  
Every three seconds, the scorer reads the accumulated signals and computes a normalised engagement score (0–1) for each element using a weighted formula:

```
raw = (viewportMs/60s)×0.30 + (hoverMs/30s)×0.25 + (clicks/10)×0.20
    + (scrollPauses/20)×0.15 + (revisits/10)×0.10

normScore = raw / max(all raw scores)

label = HIGH     if normScore ≥ 0.60
      = LOW      if normScore ≤ 0.30
      = MEDIUM   otherwise
```

The live scores are polled by the popup every 2 seconds and displayed as animated progress bars.

**Stage 3 — Layout adaptation (`adapter.js`)**  
When the user (or study conductor) clicks **"Apply Customised Experience"**, the adapter reads the current scores and applies CSS classes to the page:

| Class | Applied to | Visual effect |
|---|---|---|
| `ai-highlight` | HIGH-scored elements | Blue outline + subtle glow ring |
| `ai-collapsed` | LOW-scored elements | Opacity 35%, height collapsed to 60px (expands on hover) |
| `ai-dimmed` | Known ad/promo selectors | Opacity 15%, grayscale 80%, pointer-events off |

> **Design decision:** Layout changes are only applied on explicit user request — never automatically. This gives the study conductor control over exactly when the adaptation happens.

---

## Repository Structure

```
AI-Assisted-Adaptive-Web-Browser/
│
├── extension/                    ← Load this folder in Chrome
│   ├── manifest.json             ← MV3 extension config
│   ├── background/
│   │   └── service-worker.js     ← Message broker + state store
│   ├── content/
│   │   ├── tracker.js            ← Stage 1: signal collection
│   │   ├── scorer.js             ← Stage 2: engagement scoring
│   │   └── adapter.js            ← Stage 3: layout adaptation
│   ├── popup/
│   │   ├── popup.html            ← Extension popup UI
│   │   ├── popup.js              ← Popup logic + study controls
│   │   └── popup.css             ← Dark-mode popup styles
│   ├── styles/
│   │   └── adaptive.css          ← Injected page stylesheet
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── study/
│   ├── STUDY_GUIDE.md            ← Academic study design & protocol
│   └── analyse.py                ← Python post-study analysis script
│
├── test-page/
│   ├── index.html                ← Test page 1: Health & Science article
│   ├── page2.html                ← Test page 2: Laptop Review
│   ├── page3.html                ← Test page 3: Rajasthan Travel Guide
│   └── style.css                 ← Shared stylesheet for test pages
│
├── tests/                        ← Automated test suite (this project)
│   ├── setup/
│   │   └── chrome-mock.js        ← Global Chrome API mock
│   ├── unit/
│   │   ├── scorer.test.js        ← 30+ scorer tests
│   │   ├── tracker.test.js       ← 25+ tracker tests
│   │   ├── adapter.test.js       ← 30+ adapter tests
│   │   ├── service-worker.test.js← 25+ service worker tests
│   │   └── popup.test.js         ← 35+ popup tests
│   └── python/
│       └── test_analyse.py       ← 30+ pytest tests for analyse.py
│
├── jest.config.js                ← Jest test runner config
├── package.json                  ← npm scripts + devDependencies
├── CONDUCTOR_GUIDE.md            ← Step-by-step session guide for conductors
└── README.md                     ← This file
```

---

## Extension Architecture

```
┌──────────────────────────────────────────┐
│           popup.html / popup.js           │
│   Study controls · Score display · Timer  │
│   (uses executeScript for direct calls)   │
└─────────────────┬────────────────────────┘
                  │ sendMessage / executeScript
┌─────────────────▼────────────────────────┐
│          service-worker.js                │
│  Message router · chrome.storage.local    │
│  Persists: adaptiveEnabled, sessionData   │
└──────────┬───────────────────────────────┘
           │ tabs.sendMessage / executeScript
┌──────────▼───────────────────────────────┐
│       Content Scripts (injected per tab)  │
│  tracker.js  →  scorer.js  →  adapter.js  │
│  window.__aiSignals  ·  window.__aiScores │
│  adaptive.css (injected stylesheet)       │
└───────────────────────────────────────────┘
```

**Key architectural choices:**

- **Manifest V3** — uses a service worker (not a background page), `chrome.scripting.executeScript`, and declarative content script injection.
- **Direct executeScript for time-sensitive calls** — the popup calls `executeScript` directly on the active tab for enable/apply/reset operations rather than routing through the service worker. This is more reliable and works for `file://` URLs.
- **`file://` support** — the manifest includes `"file://*/*"` in host permissions. The "Allow access to file URLs" setting must also be enabled in Chrome's extension Details page.
- **No external framework** — pure vanilla JS throughout. No React, no bundler, no build step.

---

## Data Flow

```
User browses the page (Adaptive ON)
         │
         ▼
tracker.js collects signals per element
(hover, viewport, clicks, scroll pauses, revisits)
         │
         ▼ (every 3 seconds)
scorer.js normalises & classifies elements
(HIGH ≥ 0.60 · MEDIUM · LOW ≤ 0.30)
         │
         ▼ (every 2 seconds)
popup.js polls & renders live score bars
         │
  "Apply Customised Experience" clicked
         │
         ▼
adapter.js applies CSS classes to DOM
(ai-highlight · ai-collapsed · ai-dimmed)
         │
  Conductor clicks ▶ Start Task → ■ Stop Task
         │
         ▼
popup.js reads metrics via __aiGetTaskMetrics()
builds record → LOG_SESSION → chrome.storage.local
         │
  ↓ Export JSON → .json file downloaded
         │
         ▼
study/analyse.py computes statistics (t-tests)
```

---

## Installation

### Prerequisites

- Google Chrome (or any Chromium browser)
- Node.js ≥ 18 (for running JavaScript tests)
- Python ≥ 3.9 (for running Python analysis and tests)

### One-time Chrome setup

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** → select the `extension/` folder from this repository
4. On the extension card, click **Details** → enable **"Allow access to file URLs"**
5. Reload the extension using the ↺ button
6. Click the puzzle-piece icon 🧩 → pin **"AI Adaptive Browser"** to your toolbar

### Verify it works

1. Open `test-page/index.html` in Chrome (File → Open File)
2. Click the extension icon — you should see "Adaptive Mode is Off"

---

## Running the Extension

### Condition A (no extension — control)

1. Open a test page, scroll to the top
2. Confirm the popup shows "Adaptive Mode is Off"
3. In Study Controls: enter Participant ID, select Page, select Task 1, set Condition = A
4. Click ▶ **Start Task** → participant finds the answer → click ■ **Stop Task**
5. Repeat for Tasks 2 and 3
6. Click ↓ **Export JSON**, save as `P01_CondA_Page1.json`

### Condition B (adaptive ON)

1. Open a test page, scroll to the top
2. Click **Turn On Adaptive Mode** — the green pill appears on the page
3. Have the participant browse naturally for ~20–30 seconds
4. Watch score bars fill in the popup
5. Click **Apply Customised Experience** — the page restructures
6. Set Condition = B, click ▶ **Start Task** → participant finds answer → ■ **Stop Task**
7. Export JSON after each page

> Full step-by-step instructions with exact verbal scripts are in [`CONDUCTOR_GUIDE.md`](./CONDUCTOR_GUIDE.md).

---

## User Study Design

| Property | Value |
|---|---|
| Design | Within-subjects, counterbalanced |
| Participants | 8–12 (P01–P12) |
| Session length | ~35–40 minutes |
| Conditions | A = original layout · B = adaptive layout |
| Test pages | 3 (health article, laptop review, travel guide) |
| Tasks per page | 3 fact-finding tasks |
| Task sets | Two (A and B questions on the same pages; no carry-over possible) |
| Metrics | Task duration (s) · click count · scroll distance (px) · attention focus ratio · Likert satisfaction (Q1–Q5) |

### Counterbalancing

Odd-numbered participants (P01, P03, P05…) complete Condition A first.  
Even-numbered participants (P02, P04, P06…) complete Condition B first.  
This eliminates ordering and learning effects.

### Expected outcome

| Metric | Expected direction |
|---|---|
| Task duration | B < A (faster with adaptive layout) |
| Click count | B < A (less hunting) |
| Scroll distance | B < A (less navigation effort) |
| Attention focus ratio | B > A (more time on relevant content) |
| Q1, Q2, Q4 satisfaction | B > A (easier and clearer) |
| Q3 distraction (reverse scored) | B < A (ads dimmed) |

---

## Test Suite

The test suite covers every JavaScript module and the Python analysis script with **~145 test cases**.

### JavaScript tests (Jest + jsdom)

#### Setup

```bash
npm install
```

#### Run all tests

```bash
npm test
```

#### Run with coverage report

```bash
npm run test:coverage
```

Coverage output is written to `coverage/` (HTML report at `coverage/index.html`).

#### Run in watch mode (re-runs on file save)

```bash
npm run test:watch
```

### What each test file covers

| File | Module tested | Test count | What it verifies |
|---|---|---|---|
| `tests/unit/scorer.test.js` | `content/scorer.js` | 30+ | Weighted score formula, signal caps, normalisation, HIGH/MEDIUM/LOW thresholds, `__aiGetTopElements` sorting |
| `tests/unit/tracker.test.js` | `content/tracker.js` | 25+ | Signal shape, click accumulation, `attentionFocusRatio` maths, `__aiResetSignals` zeroing, message listener toggling |
| `tests/unit/adapter.test.js` | `content/adapter.js` | 30+ | Notification pill create/remove, CSS class mutations per score label, ad selector dimming, `removeAdaptations`, message handlers |
| `tests/unit/service-worker.test.js` | `background/service-worker.js` | 25+ | All 7 message types, storage persistence, tab-forwarding, install defaults, no-tab edge cases |
| `tests/unit/popup.test.js` | `popup/popup.js` | 35+ | `esc()` sanitisation, timer formatting, `renderScores`/`renderObsSummary` HTML, DOM state switching, task record structure, start-task validation |

### How the Chrome API mock works

All tests use a custom Chrome API stub defined in `tests/setup/chrome-mock.js`. It is loaded automatically by Jest via `setupFiles` in `jest.config.js`.

The mock provides:

- **`chrome.storage.local`** — an in-memory `_data` object with `get()`/`set()`/`clear()` (callback + Promise API)
- **`chrome.runtime.onMessage._trigger(msg)`** — fires all registered `onMessage` listeners
- **`chrome.runtime.onInstalled._trigger()`** — simulates a first-install event
- **`chrome.tabs.query`** — returns a configurable fake tab array
- **`chrome.tabs.sendMessage`** — jest.fn() for verifying forwarded messages
- **`chrome.scripting.executeScript`** / **`insertCSS`** — jest.fn() stubs
- **`global.IntersectionObserver`** / **`global.MutationObserver`** — jsdom-compatible stubs with `_fire()` / `_trigger()` test helpers
- **`chrome._reset()`** — wipes storage and listener arrays; call in `beforeEach()`

### Python tests (pytest)

#### Setup

```bash
pip install pytest scipy tabulate
```

#### Run tests

```bash
pytest tests/python/test_analyse.py -v
```

#### What is tested

| Test class | What it checks |
|---|---|
| `TestMean` | `mean()` for empty lists, single values, floats, identical values |
| `TestStandardDeviation` | `sd()` for edge cases, matches `statistics.stdev()` exactly |
| `TestDeltaPercentage` | Division-by-zero guard, negative/positive/zero deltas, formula correctness |
| `TestGrouping` | Records split by condition, unknown conditions ignored, missing fields skipped, multi-participant pooling |
| `TestCLI` | End-to-end subprocess tests: exits 0 with valid data, prints correct record count, per-task/per-participant breakdowns, handles empty/dict-style JSON, prints "Done" marker |

---

## Data Analysis

After collecting all participant JSON files:

```bash
# Put all files in one folder, then:
pip install scipy tabulate
python study/analyse.py study-data/all/
```

Example output:

```
╭──────────────────────────┬──────────────────┬──────────────────┬─────────┬───────────╮
│ Metric                   │ Condition A      │ Condition B      │ Delta   │ p-value   │
├──────────────────────────┼──────────────────┼──────────────────┼─────────┼───────────┤
│ Task Duration (s)        │ 41.2 ± 8.3       │ 24.7 ± 5.1       │ -40.1%  │ p=0.012 * │
│ Click Count              │ 4.8 ± 1.2        │ 2.1 ± 0.9        │ -56.3%  │ p=0.008 * │
│ Scroll Distance (px)     │ 1180 ± 340       │ 520 ± 190        │ -55.9%  │ p=0.021 * │
│ Attention Focus Ratio    │ 0.28 ± 0.09      │ 0.61 ± 0.12      │ +117.9% │ p=0.003 * │
╰──────────────────────────┴──────────────────┴──────────────────┴─────────┴───────────╯
```

The script also prints a per-task breakdown and a per-participant summary.

---

## JSON Data Format

Each exported file is an array of task records:

```json
[
  {
    "participantId":       "P01",
    "condition":           "A",
    "pageNumber":          1,
    "taskNumber":          1,
    "taskDurationMs":      34200,
    "taskDurationS":       34.2,
    "clicks":              3,
    "scrollDeltaPx":       820,
    "attentionFocusRatio": 0.42,
    "topEngaged": [
      { "tag": "SECTION", "text": "Cardiovascular Health...", "normScore": 87, "label": "HIGH" }
    ],
    "timestamp":           "2026-04-10T10:22:15.000Z",
    "url":                 "file:///test-page/index.html"
  }
]
```

### Naming convention

```
P{ID}_Cond{A|B}_Page{1|2|3}.json
```

Example: `P03_CondB_Page2.json` = Participant 3, Condition B, Page 2.

### File organisation

```
study-data/
├── P01/
│   ├── P01_CondA_Page1.json
│   ├── P01_CondA_Page2.json
│   ├── P01_CondA_Page3.json
│   ├── P01_CondB_Page1.json
│   ├── P01_CondB_Page2.json
│   └── P01_CondB_Page3.json
├── P02/
│   └── ...
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Popup does not open | Click extension icon; if missing, go to `chrome://extensions` and pin it |
| Scores never appear in popup | Participant needs to scroll and hover on the page for ~20s before scores register |
| "Apply" says "Not enough data" | Ask participant to browse for 10 more seconds, then try Apply again |
| Green pill does not appear after Turn On | Reload the page, then click Turn On again |
| Page does not visually change after Apply | Check extension is enabled at `chrome://extensions`; reload extension and page |
| Timer shows "--:--" and won't start | Participant ID field is empty — fill it in first |
| JSON file has 0 records | Stop Task was never clicked — data is only saved on Stop; re-run the task |
| `npm test` fails with "Cannot find module" | Run `npm install` first |
| `pytest` fails with `ModuleNotFoundError: scipy` | Run `pip install scipy tabulate` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension runtime | Chrome Manifest V3 |
| Content scripts | Vanilla JS (IIFE pattern, no bundler) |
| Styling | Vanilla CSS (injected stylesheet) |
| Data persistence | `chrome.storage.local` |
| JS test runner | Jest 29 + jest-environment-jsdom |
| Chrome API mocks | Custom jest mock (`tests/setup/chrome-mock.js`) |
| Python analysis | Standard library + scipy + tabulate |
| Python test runner | pytest |

---

*Project version 1.0 · April 2026 · HAI Group 2 · IIITD*
