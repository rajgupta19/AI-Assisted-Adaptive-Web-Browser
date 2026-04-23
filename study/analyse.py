"""
analyse.py — User Study Data Analysis
======================================
Usage:
    python analyse.py                  # reads all *.json files from the study folder
    python analyse.py path/to/data/    # reads json files from a specific folder

Requires: pip install scipy tabulate
"""

import json, glob, sys, os
from collections import defaultdict

try:
    from scipy import stats
    SCIPY = True
except ImportError:
    SCIPY = False
    print("[Warning] scipy not installed — t-tests skipped. Run: pip install scipy\n")

try:
    from tabulate import tabulate
    TABULATE = True
except ImportError:
    TABULATE = False

# ── Load data ────────────────────────────────────────────────────────────────
folder = sys.argv[1] if len(sys.argv) > 1 else "."
json_files = glob.glob(os.path.join(folder, "*.json"))

if not json_files:
    print(f"No JSON files found in '{folder}'. Run from the folder containing study exports.")
    sys.exit(1)

records = []
for f in json_files:
    with open(f) as fh:
        data = json.load(fh)
        if isinstance(data, list):
            records.extend(data)
        elif isinstance(data, dict):
            records.append(data)

print(f"\n=== AI Adaptive Browser — Study Analysis ===")
print(f"Loaded {len(records)} records from {len(json_files)} file(s).\n")

# ── Group by condition ────────────────────────────────────────────────────────
metrics = ["taskDurationS", "clicks", "scrollDeltaPx", "attentionFocusRatio"]
metric_labels = {
    "taskDurationS":       "Task Duration (s)",
    "clicks":              "Click Count",
    "scrollDeltaPx":       "Scroll Distance (px)",
    "attentionFocusRatio": "Attention Focus Ratio",
}

groups = {"A": defaultdict(list), "B": defaultdict(list)}

for r in records:
    cond = r.get("condition", "?")
    if cond not in ("A", "B"):
        continue
    for m in metrics:
        val = r.get(m)
        if val is not None:
            groups[cond][m].append(float(val))

def mean(lst): return sum(lst) / len(lst) if lst else 0
def sd(lst):
    if len(lst) < 2: return 0
    m = mean(lst)
    return (sum((x - m) ** 2 for x in lst) / (len(lst) - 1)) ** 0.5

# ── Summary table ─────────────────────────────────────────────────────────────
rows = []
for m in metrics:
    a_vals = groups["A"][m]
    b_vals = groups["B"][m]
    row = [
        metric_labels[m],
        f"{mean(a_vals):.2f} ± {sd(a_vals):.2f}",
        f"n={len(a_vals)}",
        f"{mean(b_vals):.2f} ± {sd(b_vals):.2f}",
        f"n={len(b_vals)}",
    ]
    # Delta %
    if mean(a_vals) > 0:
        delta = ((mean(b_vals) - mean(a_vals)) / mean(a_vals)) * 100
        row.append(f"{delta:+.1f}%")
    else:
        row.append("N/A")

    # t-test
    if SCIPY and len(a_vals) >= 2 and len(b_vals) >= 2:
        try:
            t, p = stats.ttest_ind(a_vals, b_vals)
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "ns"
            row.append(f"p={p:.3f} {sig}")
        except Exception:
            row.append("N/A")
    else:
        row.append("need scipy")

    rows.append(row)

headers = ["Metric", "Condition A (mean±SD)", "n", "Condition B (mean±SD)", "n", "Delta", "p-value"]

if TABULATE:
    print(tabulate(rows, headers=headers, tablefmt="rounded_outline"))
else:
    print("\t".join(headers))
    for r in rows:
        print("\t".join(str(x) for x in r))

# ── Per-task breakdown ────────────────────────────────────────────────────────
print("\n--- Per-Task Breakdown (Task Duration) ---")
for task_num in [1, 2, 3]:
    a = [r["taskDurationS"] for r in records if r.get("condition") == "A" and r.get("taskNumber") == task_num]
    b = [r["taskDurationS"] for r in records if r.get("condition") == "B" and r.get("taskNumber") == task_num]
    print(f"  Task {task_num}:  A={mean(a):.1f}s (n={len(a)})   B={mean(b):.1f}s (n={len(b)})", end="")
    if SCIPY and len(a) >= 2 and len(b) >= 2:
        _, p = stats.ttest_ind(a, b)
        print(f"   p={p:.3f}", end="")
    print()

# ── Participant summary ───────────────────────────────────────────────────────
print("\n--- Per-Participant Summary (Duration, seconds) ---")
participants = sorted(set(r.get("participantId", "?") for r in records))
for pid in participants:
    a_dur = [r["taskDurationS"] for r in records if r.get("participantId") == pid and r.get("condition") == "A"]
    b_dur = [r["taskDurationS"] for r in records if r.get("participantId") == pid and r.get("condition") == "B"]
    print(f"  {pid}:  A={mean(a_dur):.1f}s over {len(a_dur)} task(s)   |   B={mean(b_dur):.1f}s over {len(b_dur)} task(s)")

print("\nDone. ✓\n")
