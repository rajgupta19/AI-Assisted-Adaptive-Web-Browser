# User Study Guide — AI-Assisted Adaptive Web Browser
**Group 2 · HAI Project B · IIITD Semester 8**
**Raj Gupta · Rishab Kumar Chowdhary · Ansh Varshney**

---

## Overview

**Design:** Within-subjects, counterbalanced (every participant does both conditions)
**Participants needed:** 8–12
**Time per participant:** ~35–40 minutes
**What you measure:** 5 metrics across 9 tasks (3 pages × 3 tasks)

---

## The 3 Test Pages

All pages are realistic, cluttered article layouts with ads, sidebars, navigation, banners, and buried key facts.

| Page | File | Topic | What makes it hard |
|------|------|--------|-------------------|
| Page 1 | `test-page/index.html` | Health & Science | Long scientific article, 3 inline ads, dense sidebar |
| Page 2 | `test-page/page2.html` | Laptop Review | Spec-heavy content, comparison tables, multiple ad units |
| Page 3 | `test-page/page3.html` | Rajasthan Travel | Long descriptive guide, many sections, travel ads |

---

## The Tasks — Two Sets (A and B), Same Pages

**Key design decision:** Condition A and Condition B use the **same 3 pages** but **different questions**. Participants cannot carry over answers. Both sets are buried at the same depth in the article — Set A answers are in blue boxes, Set B answers are in green boxes.

---

### Page 1 — Health Article

> *"This is a health and science article. Find the specific answer to each question."*

| # | Condition A Question | Answer | Condition B Question | Answer |
|---|---------------------|--------|---------------------|--------|
| T1 | "What is the recommended daily step count for cardiovascular health?" | **8,500 steps** | "How many adults were tracked in the cardiovascular study?" | **78,000 adults** |
| T2 | "What journal published the sleep study?" | **Nature Human Behaviour** | "By what percentage faster did amyloid-beta accumulate in sleep-deprived adults?" | **34% faster** |
| T3 | "By what percentage did reaction time improve in the cognitive study?" | **31%** | "By what percentage did working memory capacity improve?" | **19%** |

---

### Page 2 — Laptop Review

> *"This is a tech review article. Find the specific answer to each question."*

| # | Condition A Question | Answer | Condition B Question | Answer |
|---|---------------------|--------|---------------------|--------|
| T1 | "What is the battery life of the Editor's Choice laptop?" | **11.5 hours** | "What was the Cinebench R24 multi-core score of the Editor's Choice laptop?" | **14,870** |
| T2 | "What is the weight of the best ultraportable laptop?" | **1.19 kg** | "What was the battery life of the best ultraportable laptop?" | **9.8 hours** |
| T3 | "What is the price of the best value laptop?" | **₹45,999** | "What was the battery life of the best value laptop?" | **6.8 hours** |

---

### Page 3 — Travel Guide

> *"This is a travel guide. Find the specific answer to each question."*

| # | Condition A Question | Answer | Condition B Question | Answer |
|---|---------------------|--------|---------------------|--------|
| T1 | "What is the best time of year to visit Rajasthan?" | **October to March** | "What is the daytime temperature range during peak season?" | **18–28°C** |
| T2 | "What is the average daily budget for a mid-range traveller?" | **₹3,800 per day** | "What does the composite fort ticket cost in Jaipur?" | **₹500** |
| T3 | "What is the minimum recommended trip duration?" | **10 days** | "What is the cost of a full Rajasthan private car circuit?" | **₹35,000–55,000** |

---

## The 5 Metrics — How Each is Measured

| Metric | Measured How | What it Shows |
|--------|-------------|---------------|
| **Task completion time** | Timer in popup (Start/Stop Task) | Primary efficiency metric |
| **Click count** | Auto-counted by tracker.js | Interaction/navigation effort |
| **Scroll distance (px)** | Scroll delta tracked per task | How much hunting was needed |
| **Attention focus ratio** | Time on HIGH-scored content ÷ total viewport time | Whether user found the right area |
| **User satisfaction** | Post-session questionnaire (Q1–Q5) | Perceived readability and ease |

All except satisfaction are **automatically logged** to JSON when you click Stop Task.

---

## Counterbalancing Order

Half of participants do Condition A first; half do B first. This eliminates learning effects.

| Participant | First Session | Second Session |
|-------------|---------------|----------------|
| P01, P03, P05, P07, P09, P11 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P02, P04, P06, P08, P10, P12 | **B** (Adaptive ON) | **A** (Adaptive OFF) |

---

## Setup Checklist (Before Each Session)

- [ ] Chrome open, extension loaded and reloaded (`chrome://extensions` → refresh icon)
- [ ] "Allow access to file URLs" enabled in extension Details
- [ ] Start on Page 1 (`test-page/index.html`) with scroll at top
- [ ] Popup open and pinned to toolbar
- [ ] Participant ID entered (e.g., P01)
- [ ] Condition set (A or B per counterbalancing table)
- [ ] Previous session data NOT cleared (keep accumulating across participants)
- [ ] Printed task question sheets ready (cut into strips — one question per strip)
- [ ] Questionnaire printed (one per session)

---

## Session Protocol

### Introduction (3 min)
Say: *"We're testing a browser extension that adapts webpage layouts based on your browsing behaviour. You'll be asked to find specific facts on three different web pages. There are no right or wrong ways to browse — we're studying the interface, not you. All data is anonymous."*

Do NOT tell them what the extension does or that ads might change — this would bias the study.

### For EACH of the 3 pages (repeat this block):

1. **Open the page** in a fresh tab (File → Open File in Chrome). Scroll to top.
2. **Set popup:** correct page number, Task 1, correct condition.
3. **Say:** *"Take 10 seconds to glance at the page — don't look for anything yet."*
4. *[Condition B only]* Click **Turn On Adaptive Mode** in popup. Let them browse normally — the extension observes silently.
5. **Hand task strip face-down.** Say: *"Turn it over when I say go."*
6. Say **"Go"** → immediately click **Start Task** in popup.
7. Participant finds the answer, says it out loud.
8. Click **Stop Task** immediately when they give the answer. Note answer on your record sheet.
9. For Task 2: reload the page (Ctrl+R), scroll to top. Repeat steps 5–8.
10. For Task 3: reload, repeat.
11. *[Condition B only, after all 3 tasks]* Click **Apply Customised Experience** in popup. Ask participant: *"Do you notice anything different? What changed?"* Note their response.
12. Export data: click **Export JSON**. Save as `P01_CondA_Page1.json` (or appropriate names).

### Between conditions (5 min break)
Give participants the distractor task: fill in the demographics section of the questionnaire. This prevents carry-over of the adaptive experience.

### Post-session questionnaire (5 min)
Administer AFTER both conditions are complete.

---

## Post-Session Questionnaire

*Print one per participant. Rate 1 (strongly disagree) to 5 (strongly agree).*

**For EACH condition separately:**

| # | Statement | Cond A | Cond B |
|---|-----------|--------|--------|
| Q1 | I found the information I was looking for quickly. | /5 | /5 |
| Q2 | The page layout made it easy to navigate. | /5 | /5 |
| Q3 | I felt distracted by irrelevant content. *(reverse scored)* | /5 | /5 |
| Q4 | The reading experience felt comfortable and clear. | /5 | /5 |
| Q5 | I would use this interface for regular browsing. | /5 | /5 |

**Open-ended (Condition B only):**
- Did you notice anything changing as you browsed?
- What felt different compared to the normal layout?

**Demographics (once):**
- Age: ___  Gender: ___  Occupation: ___
- How many hours per day do you browse the web? ___
- Do you use any browser extensions? Y / N

---

## Participant Record Sheet (Print 1 per participant)

```
Participant ID: _______   Date: _________   Order: A→B / B→A

CONDITION A (Adaptive OFF):
  Page 1: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Page 2: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Page 3: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Q1–Q5: ___ ___ ___ ___ ___

CONDITION B (Adaptive ON):
  Page 1: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Page 2: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Page 3: T1 ___s Y/N  |  T2 ___s Y/N  |  T3 ___s Y/N
  Q1–Q5: ___ ___ ___ ___ ___

Notes: __________________________________________________
```

---

## YOUR DEMO SESSION (Ansh — Participant P00)

Since you're doing a demo first, use **P00** as your ID. Do BOTH conditions yourself so you can see what the data looks like before real participants start.

### Exactly what to do:

**CONDITION A — Original Layout (do this first)**

Page 1 (`index.html`): Condition A, no extension
- T1: *"What is the recommended daily step count for cardiovascular health?"* → **8,500 steps**
- T2: *"What journal published the sleep study?"* → **Nature Human Behaviour**
- T3: *"By what percentage did reaction time improve?"* → **31%**

Page 2 (`page2.html`): Condition A, no extension
- T1: *"What is the battery life of the Editor's Choice laptop?"* → **11.5 hours**
- T2: *"What is the weight of the best ultraportable laptop?"* → **1.19 kg**
- T3: *"What is the price of the best value laptop?"* → **₹45,999**

Page 3 (`page3.html`): Condition A, no extension
- T1: *"What is the best time of year to visit Rajasthan?"* → **October to March**
- T2: *"What is the average daily budget for a mid-range traveller?"* → **₹3,800 per day**
- T3: *"What is the minimum recommended trip duration?"* → **10 days**

Export after each page → `P00_CondA_Page1.json`, `P00_CondA_Page2.json`, `P00_CondA_Page3.json`

---

**CONDITION B — Adaptive Mode ON (DIFFERENT QUESTIONS)**

Page 1 (`index.html`): Turn On → browse 20s → Apply → then tasks:
- T1: *"How many adults were tracked in the cardiovascular study?"* → **78,000 adults**
- T2: *"By what percentage faster did amyloid-beta accumulate in sleep-deprived adults?"* → **34% faster**
- T3: *"By what percentage did working memory capacity improve?"* → **19%**

Page 2 (`page2.html`): Turn On → browse 20s → Apply → then tasks:
- T1: *"What was the Cinebench R24 score of the Editor's Choice laptop?"* → **14,870**
- T2: *"What was the battery life of the best ultraportable laptop?"* → **9.8 hours**
- T3: *"What was the battery life of the best value laptop?"* → **6.8 hours**

Page 3 (`page3.html`): Turn On → browse 20s → Apply → then tasks:
- T1: *"What is the daytime temperature range during Rajasthan's peak season?"* → **18–28°C**
- T2: *"What does the composite fort ticket cost in Jaipur?"* → **₹500**
- T3: *"What is the cost of a full Rajasthan private car circuit?"* → **₹35,000–55,000**

Export after each page → `P00_CondB_Page1.json`, `P00_CondB_Page2.json`, `P00_CondB_Page3.json`

### How to see your results:

**Immediately in the popup:** After each Stop Task you'll see:
```
Done: 34.2s | 3 clicks | 820px scroll
```

**Full data:** Open the exported JSON file in any text editor or VS Code. Each record looks like:
```json
{
  "participantId": "P00",
  "condition": "A",
  "pageNumber": 1,
  "taskNumber": 1,
  "taskDurationS": 34.2,
  "clicks": 3,
  "scrollDeltaPx": 820,
  "attentionFocusRatio": 0.42,
  "topEngaged": [...]
}
```

**Compare A vs B:** Look at `taskDurationS` and `scrollDeltaPx` across the same tasks. Condition B should show lower numbers if the extension is working.

**Run the analysis script** after collecting all participant data:
```
pip install scipy tabulate
python study/analyse.py path/to/json/folder/
```

This prints a table with mean ± SD for each metric per condition, plus p-values.

---

## Expected Results if Extension is Working

| Metric | Expected Direction | Why |
|--------|-------------------|-----|
| Task duration | **B < A** (faster) | Key content highlighted, less hunting |
| Click count | **B < A** (fewer) | Less navigating through irrelevant sections |
| Scroll distance | **B < A** (less) | Relevant sections brought to attention |
| Attention focus ratio | **B > A** (higher) | More time on content, less on ads/nav |
| Q1, Q2, Q4 satisfaction | **B > A** (better ratings) | Easier, clearer layout |
| Q3 distraction | **B < A** (less distracted) | Ads dimmed, clutter reduced |
