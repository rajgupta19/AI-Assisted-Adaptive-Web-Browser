# Study Conductor Guide
## AI-Assisted Adaptive Web Browser — User Study
**HAI Project B · Group 2 · IIITD Semester 8**
**Raj Gupta · Rishab Kumar Chowdhary · Ansh Varshney**

---

> **Who is this for:** Anyone running a participant session — you do not need to be a developer.
> All you need is the laptop with Chrome and the extension already loaded.

---

## PART 0 — One-Time Setup (Do This Once Before Any Sessions)

> If you are not the person who built the extension, ask the developer to do steps 1–4 for you. After that, any conductor can run sessions.

**Step 1 — Load the extension in Chrome**
1. Open Chrome
2. Go to `chrome://extensions` in the address bar
3. Toggle **Developer mode** ON (switch at top-right)
4. Click **Load unpacked**
5. Navigate to the project folder and select the `extension/` subfolder
6. You should see "AI Adaptive Browser" appear in the list

**Step 2 — Allow file access (critical)**
1. On the "AI Adaptive Browser" card, click **Details**
2. Scroll down to find **"Allow access to file URLs"**
3. Turn it **ON**
4. Go back to `chrome://extensions` and click the **↺ refresh icon** on the card

**Step 3 — Pin the extension to the toolbar**
1. Click the puzzle piece icon (🧩) in Chrome's top-right
2. Click the pin icon next to "AI Adaptive Browser"
3. The extension icon should now appear permanently in your toolbar

**Step 4 — Verify it works**
1. Open `test-page/index.html` in Chrome (File → Open File → select it)
2. Click the extension icon — a popup should open showing "Adaptive Mode is Off"
3. If this works, setup is complete

---

## PART 1 — Before Each Participant Session

Do this checklist fresh for every single participant.

- [ ] Open Chrome on the test laptop
- [ ] Go to `chrome://extensions` and click **↺ refresh** on the extension (clears any stale state)
- [ ] Open `test-page/index.html` as a fresh tab — scroll to the **very top**
- [ ] Click the extension icon to open the popup
- [ ] Type the **Participant ID** (P01, P02, P03… in order)
- [ ] Check the **counterbalancing table** below to know which condition to start with
- [ ] Print (or have ready) the **Task Question Strips** for this session (see Part 3)
- [ ] Print the **Post-Session Questionnaire** (one copy per participant, see Part 5)
- [ ] Print the **Participant Record Sheet** (see Part 6)
- [ ] Previous JSON data does NOT need to be cleared — keep accumulating all participants in storage

### Counterbalancing Table

Half the participants do Condition A first, half do Condition B first. Follow this table exactly — do not deviate.

| Participant ID | First Condition | Second Condition |
|----------------|-----------------|------------------|
| P01 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P02 | **B** (Adaptive ON) | **A** (Adaptive OFF) |
| P03 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P04 | **B** (Adaptive ON) | **A** (Adaptive OFF) |
| P05 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P06 | **B** (Adaptive ON) | **A** (Adaptive OFF) |
| P07 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P08 | **B** (Adaptive ON) | **A** (Adaptive OFF) |
| P09 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P10 | **B** (Adaptive ON) | **A** (Adaptive OFF) |
| P11 | **A** (Adaptive OFF) | **B** (Adaptive ON) |
| P12 | **B** (Adaptive ON) | **A** (Adaptive OFF) |

---

## PART 2 — Introduction Script (Read This to the Participant)

Say exactly this — do not reveal what the extension does in detail:

> *"Thank you for participating. We are testing a browser extension that modifies how web pages are displayed. You will be asked to find specific facts on three different web pages — like looking something up. There are no right or wrong ways to browse. We are studying the interface, not you. Your data is completely anonymous and will only be used for our course project. The session will take about 35–40 minutes. Do you have any questions before we start?"*

**Do NOT tell them:**
- That ads will be dimmed or collapsed
- That sections will be highlighted
- What specific changes the extension makes
- That one condition is "easier" than the other

---

## PART 3 — The Task Questions

> **How to use these:** Print and cut into strips — one strip per task. Hand each strip face-down to the participant. Say "turn it over" only when you have clicked Start Task in the popup.

There are **two sets of questions** — Set A and Set B. They are on the **same pages** but ask about **different facts**, so participants cannot carry answers between conditions.

---

### PAGE 1 — Health Article (`test-page/index.html`)

| | Condition A Question | Answer | Condition B Question | Answer |
|---|---|---|---|---|
| **Task 1** | What is the recommended daily step count mentioned as the threshold for cardiovascular health? | **8,500 steps per day** | How many adults were tracked in the cardiovascular cohort study? | **78,000 adults** |
| **Task 2** | What is the name of the academic journal where the sleep study was published? | **Nature Human Behaviour** | By what percentage faster did amyloid-beta accumulate in sleep-deprived adults? | **34% faster** |
| **Task 3** | By what percentage did reaction time improve in the cognitive performance study? | **31%** | By what percentage did working memory capacity improve in the cognitive study? | **19%** |

---

### PAGE 2 — Laptop Review (`test-page/page2.html`)

| | Condition A Question | Answer | Condition B Question | Answer |
|---|---|---|---|---|
| **Task 1** | What is the battery life (in hours) of the Editor's Choice laptop? | **11.5 hours** | What was the Cinebench R24 multi-core score of the Editor's Choice laptop? | **14,870** |
| **Task 2** | What is the weight of the best ultraportable laptop recommended in this article? | **1.19 kg** | What was the battery life of the best ultraportable laptop in the test? | **9.8 hours** |
| **Task 3** | What is the price (in rupees) of the best value laptop? | **₹45,999** | What was the battery life of the best value laptop? | **6.8 hours** |

---

### PAGE 3 — Travel Guide (`test-page/page3.html`)

| | Condition A Question | Answer | Condition B Question | Answer |
|---|---|---|---|---|
| **Task 1** | What is the best time of year to visit Rajasthan? | **October to March** | What is the daytime temperature range during Rajasthan's peak travel season? | **18–28°C** |
| **Task 2** | What is the recommended daily budget for a mid-range traveller in Rajasthan? | **₹3,800 per person per day** | What is the cost of the composite fort ticket in Jaipur for Indian nationals? | **₹500** |
| **Task 3** | What is the minimum recommended trip duration for visiting Rajasthan properly? | **10 days** | What is the total cost range for hiring a private car for the full Rajasthan circuit? | **₹35,000–55,000** |

---

## PART 4 — Running the Session (Step by Step)

### SECTION A — Running Condition A (Adaptive OFF)

> Do this for all 3 pages before switching to Condition B.

**For EACH page (repeat this block 3 times):**

1. Open the correct page in Chrome:
   - Page 1: `test-page/index.html`
   - Page 2: `test-page/page2.html`
   - Page 3: `test-page/page3.html`
2. Scroll to the **very top** of the page
3. Open the popup → confirm Adaptive Mode is **OFF** (you should see the "Adaptive Mode is Off" screen)
4. Set the correct **Page number** and **Task 1** in the popup
5. Set **Condition = A — Original**
6. Say to the participant: *"Take about 10 seconds to glance at this page. Don't look for anything yet — just get familiar with the layout."*
7. Wait 10 seconds
8. Hand them the **Task 1 question strip face-down**
9. Say: *"Turn it over when I say go"*
10. Say **"Go"** → immediately click **▶ Start Task** in the popup
11. Participant browses and finds the answer — they say it out loud when they find it
12. The moment they say the answer, click **■ Stop Task**
13. Write their answer and whether it was correct on the Participant Record Sheet
14. For **Task 2:** Reload the page (Ctrl+R), scroll to top, popup auto-advances to Task 2. Repeat steps 8–13
15. For **Task 3:** Reload, scroll to top, repeat steps 8–13

**After all 3 tasks on a page:**

16. **Click ↓ Export JSON** in the popup
17. Save the file as: `P[ID]_CondA_Page[N].json`
    - Example: `P03_CondA_Page1.json`
18. Open the next page and repeat the entire block

**After all 3 pages of Condition A:**

19. Say: *"Great, that's the first half done. Take a 5-minute break."*
20. Give them the **demographics section** of the questionnaire to fill during the break (age, gender, browsing habits — bottom of the questionnaire form)
21. During the break, set the popup to Condition B for the next section

---

### SECTION B — Running Condition B (Adaptive ON)

> Condition B uses the SAME 3 pages but DIFFERENT questions (Set B from Part 3).

**For EACH page (repeat this block 3 times):**

1. Open the correct page fresh in a new tab
2. Scroll to the **very top**
3. Open popup → set Page number, Task 1, **Condition = B — Adaptive**
4. Say: *"Take about 10 seconds to glance at this page."*
5. Wait 10 seconds
6. **Click "Turn On Adaptive Mode"** in the popup
7. The green pill notification appears on the page bottom-right
8. Say: *"Please scroll through the page slowly and read a little — just browse naturally for about 20–30 seconds."*
9. Watch the popup — score bars will start filling in
10. After exact 30 seconds, click **"Apply Customised Experience"** in the popup.
11. The page adapts — key sections get highlighted, ads dim
12. Say nothing about what changed — let the participant notice on their own
13. Hand them the **Task 1 question strip (Set B) face-down**
14. Say: *"Turn it over when I say go"*
15. Say **"Go"** → click **▶ Start Task**
16. Participant finds the answer, says it out loud
17. Click **■ Stop Task** immediately
18. Record on the Participant Record Sheet
19. For **Task 2:** Reload the page → Turn On again → browse 20s → Apply → Start Task → repeat
20. For **Task 3:** Reload → Turn On → browse → Apply → Start Task → repeat

**After all 3 tasks on a page:**

21. **Click ↓ Export JSON**
22. Save as: `P[ID]_CondB_Page[N].json`
    - Example: `P03_CondB_Page1.json`
23. Open the next page and repeat

**After all 3 pages of Condition B:**

24. Give participant the **Post-Session Questionnaire** (Part 5)

---

### Important Notes for Condition B

- If the "Apply" button says *"Not enough data yet"* — ask the participant to keep browsing for 10 more seconds, then click Apply again
- Always reload the page between tasks — signals reset automatically when you click Start Task, but a fresh scroll position gives a fair starting point
- If the page does not adapt visually after clicking Apply — check that the extension is still enabled at `chrome://extensions` and reload it

---

## PART 5 — Post-Session Questionnaire

> Print one copy per participant. They fill it in AFTER completing both conditions.

```
╔══════════════════════════════════════════════════════════════════╗
║         POST-SESSION QUESTIONNAIRE                               ║
║         AI Adaptive Browser — User Study                         ║
║         Participant ID: _______    Date: ___________             ║
╚══════════════════════════════════════════════════════════════════╝

SECTION 1 — CONDITION A (Without Adaptive Extension)

Rate each statement from 1 to 5:
  1 = Strongly Disagree
  2 = Disagree
  3 = Neutral
  4 = Agree
  5 = Strongly Agree

Q1. I found the information I was looking for quickly.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q2. The page layout made it easy to navigate and find content.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q3. I felt distracted by irrelevant content (ads, banners, sidebars).
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]
    *** NOTE TO CONDUCTOR: This is REVERSE scored — higher = more distracted ***

Q4. The reading experience felt comfortable and clear.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q5. I would enjoy using this layout for regular browsing.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Open questions:
- What made it difficult to find the answers?
  __________________________________________________________________

- Which elements on the page distracted you most?
  __________________________________________________________________

──────────────────────────────────────────────────────────────────────

SECTION 2 — CONDITION B (With Adaptive Extension)

Q1. I found the information I was looking for quickly.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q2. The page layout made it easy to navigate and find content.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q3. I felt distracted by irrelevant content (ads, banners, sidebars).
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]
    *** NOTE TO CONDUCTOR: This is REVERSE scored — higher = more distracted ***

Q4. The reading experience felt comfortable and clear.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Q5. I would enjoy using this layout for regular browsing.
    Page 1: [ ]    Page 2: [ ]    Page 3: [ ]

Open questions (Condition B specific):
- Did you notice anything changing about the page layout?
  __________________________________________________________________

- Did the changes help or confuse you? Please explain.
  __________________________________________________________________

- What would you improve about the adaptive experience?
  __________________________________________________________________

──────────────────────────────────────────────────────────────────────

SECTION 3 — DEMOGRAPHICS (Fill during the break between conditions)

Age: _______     Gender: _______     Occupation: _______

How many hours per day do you spend browsing the web on average?
  [ ] Less than 1 hr   [ ] 1–2 hrs   [ ] 2–4 hrs   [ ] More than 4 hrs

Do you currently use any browser extensions?
  [ ] Yes — which ones: _________________________     [ ] No

Have you ever used a content/ad blocker?
  [ ] Yes     [ ] No

How comfortable are you with technology in general?
  [ ] Not comfortable   [ ] Somewhat comfortable   [ ] Very comfortable

╚══════════════════════════════════════════════════════════════════╝
```

---

## PART 6 — Participant Record Sheet

> Print one per participant. Keep this for your own reference.

```
╔══════════════════════════════════════════════════════════════════╗
║  PARTICIPANT RECORD SHEET                                        ║
║  ID: _______   Date: __________   Conductor: ______________      ║
║  Order: A → B  /  B → A   (circle one)                          ║
╚══════════════════════════════════════════════════════════════════╝

CONDITION A — Original Layout
                          Time (s)    Correct?   Notes
Page 1 — Task 1 (steps)   _______     Y / N     _______________
Page 1 — Task 2 (journal) _______     Y / N     _______________
Page 1 — Task 3 (%)       _______     Y / N     _______________

Page 2 — Task 1 (battery) _______     Y / N     _______________
Page 2 — Task 2 (weight)  _______     Y / N     _______________
Page 2 — Task 3 (price)   _______     Y / N     _______________

Page 3 — Task 1 (season)  _______     Y / N     _______________
Page 3 — Task 2 (budget)  _______     Y / N     _______________
Page 3 — Task 3 (days)    _______     Y / N     _______________

CONDITION B — Adaptive Layout
                          Time (s)    Correct?   Notes
Page 1 — Task 1 (78k)     _______     Y / N     _______________
Page 1 — Task 2 (34%)     _______     Y / N     _______________
Page 1 — Task 3 (19%)     _______     Y / N     _______________

Page 2 — Task 1 (score)   _______     Y / N     _______________
Page 2 — Task 2 (9.8h)    _______     Y / N     _______________
Page 2 — Task 3 (6.8h)    _______     Y / N     _______________

Page 3 — Task 1 (temp)    _______     Y / N     _______________
Page 3 — Task 2 (₹500)    _______     Y / N     _______________
Page 3 — Task 3 (35k-55k) _______     Y / N     _______________

JSON files exported? (check each)
  [ ] P__CondA_Page1  [ ] P__CondA_Page2  [ ] P__CondA_Page3
  [ ] P__CondB_Page1  [ ] P__CondB_Page2  [ ] P__CondB_Page3

General observations about this participant's behaviour:
__________________________________________________________________
__________________________________________________________________
╚══════════════════════════════════════════════════════════════════╝
```

---

## PART 7 — JSON Files: When to Download and What to Do

### When to Export

Export a JSON file at the end of **every page**, not at the end of the full session. This gives you 6 JSON files per participant (3 pages × 2 conditions).

| When | What to click | What to name the file |
|------|--------------|----------------------|
| After Page 1, Condition A | ↓ Export JSON | `P01_CondA_Page1.json` |
| After Page 2, Condition A | ↓ Export JSON | `P01_CondA_Page2.json` |
| After Page 3, Condition A | ↓ Export JSON | `P01_CondA_Page3.json` |
| After Page 1, Condition B | ↓ Export JSON | `P01_CondB_Page1.json` |
| After Page 2, Condition B | ↓ Export JSON | `P01_CondB_Page2.json` |
| After Page 3, Condition B | ↓ Export JSON | `P01_CondB_Page3.json` |

> **Important:** The popup stores data cumulatively — it does NOT auto-clear between pages. Exporting after each page captures only the tasks done so far. If you forget to export mid-session and only export at the very end, you will still get all 9 tasks in one file — but naming will be harder. Export after each page to keep things clean.

> **After each full session:** Click **✕ Clear** in the popup to wipe the stored data before the next participant begins.

### Where the Files Are Saved

Chrome saves them to your default Downloads folder. After each session, move all 6 files into a dedicated folder:

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

### What the JSON Contains

Each file contains an array of task records. Open any file in a text editor — it looks like this:

```json
[
  {
    "participantId": "P01",
    "condition": "A",
    "pageNumber": 1,
    "taskNumber": 1,
    "taskDurationS": 43.2,
    "clicks": 6,
    "scrollDeltaPx": 1340,
    "attentionFocusRatio": 0.27,
    "topEngaged": [...],
    "timestamp": "2026-04-10T10:22:15.000Z",
    "url": "file:///test-page/index.html"
  },
  {
    "participantId": "P01",
    "condition": "A",
    "pageNumber": 1,
    "taskNumber": 2,
    "taskDurationS": 38.7,
    ...
  }
]
```

### What Each Field Means

| Field | What it measures |
|-------|-----------------|
| `taskDurationS` | Time in seconds from Start Task to Stop Task — **primary metric** |
| `clicks` | Number of clicks made during the task — interaction effort |
| `scrollDeltaPx` | Pixels scrolled during the task — navigation effort |
| `attentionFocusRatio` | Fraction of viewport time spent on high-engagement content (0–1) — attention quality |
| `condition` | "A" = no extension, "B" = with adaptive extension |
| `pageNumber` | 1, 2, or 3 |
| `taskNumber` | 1, 2, or 3 |

### How to Analyse the Data

**Option 1 — Quick manual comparison (Excel / Google Sheets)**

1. Open all JSON files
2. Copy each task record into a spreadsheet with these columns:
   `participantId | condition | page | task | durationS | clicks | scrollPx | focusRatio`
3. Create a pivot table: rows = metric, columns = Condition A vs B
4. Compare means — Condition B should show lower duration, clicks, scroll and higher focusRatio

**Option 2 — Automated analysis script**

1. Put all JSON files into one folder (e.g., `study-data/all/`)
2. Open a terminal in the project folder
3. Run:
   ```
   pip install scipy tabulate
   python study/analyse.py study-data/all/
   ```
4. The script prints a formatted results table like this:

```
╭──────────────────────────┬──────────────────┬──────────────────┬─────────┬───────────╮
│ Metric                   │ Condition A      │ Condition B      │ Delta   │ p-value   │
├──────────────────────────┼──────────────────┼──────────────────┼─────────┼───────────┤
│ Task Duration (s)        │ 41.2 ± 8.3       │ 24.7 ± 5.1       │ -40.1%  │ p=0.012 * │
│ Click Count              │ 4.8 ± 1.2        │ 2.1 ± 0.9        │ -56.3%  │ p=0.008 * │
│ Scroll Distance (px)     │ 1180 ± 340       │ 520 ± 190        │ -55.9%  │ p=0.021 * │
│ Attention Focus Ratio    │ 0.28 ± 0.09      │ 0.61 ± 0.12      │ +117.9% │ p=0.003 * │
╰──────────────────────────┴──────────────────┴──────────────────┴─────────┴───────────╝
* p < 0.05   ** p < 0.01   *** p < 0.001   ns = not significant
```

**Option 3 — Questionnaire scores**

Manually enter Q1–Q5 scores from the printed questionnaires into the spreadsheet.
- Q3 is reverse-scored: final score = 6 − raw score
- Compute mean per condition across all participants for each question
- Higher mean = better experience for Q1, Q2, Q4, Q5
- Lower mean = less distracted for Q3 (after reverse scoring)

---

## PART 8 — Troubleshooting

| Problem | What to do |
|---------|-----------|
| Popup does not open | Click the extension icon in toolbar; if missing, go to `chrome://extensions` and pin it |
| Scores never appear in popup | The participant needs to scroll and hover on the page — remind them to browse naturally for 20–30 seconds before applying |
| "Apply" button says "Not enough data" | Ask participant to keep browsing for 10 more seconds, then click Apply again |
| Green pill does not appear | Reload the page after clicking Turn On |
| Page does not visually change after Apply | Check extension is enabled at `chrome://extensions`; reload the extension and the page |
| Timer shows "--:--" and won't start | Check that Participant ID is filled in |
| JSON file is empty or has 0 records | You likely forgot to click Stop Task — the data is only saved on Stop; re-run the task |
| Participant gave wrong answer | Note it as incorrect on the record sheet, still click Stop Task and record the time — wrong answers are valid data points about the interface |
| Participant gave up | Note as "DNF" (Did Not Finish), click Stop Task after 120 seconds maximum |

---

## PART 9 — End of All Sessions Checklist

Once all participants are done:

- [ ] All JSON files moved into `study-data/` folder, organised by participant
- [ ] All paper questionnaires collected and stored
- [ ] All participant record sheets filled in
- [ ] Run `python study/analyse.py study-data/all/` to generate the results table
- [ ] Enter questionnaire scores into the spreadsheet
- [ ] Cross-check JSON task times against your handwritten record sheet — flag any large discrepancies

---

*Guide version 1.0 · April 2026 · HAI Group 2 · IIITD*
