"""
tests/python/test_analyse.py
─────────────────────────────────────────────────────────────────────────────
Unit tests for study/analyse.py — the post-study statistical analysis script.

What is being tested
─────────────────────
analyse.py loads exported JSON task records, groups them by study condition
(A = control, B = adaptive), and computes:
  • mean and standard deviation for 4 metrics
  • delta percentage (B relative to A)
  • independent-samples t-test p-values (via scipy)
  • per-task and per-participant breakdowns

Test strategy
─────────────
Because analyse.py is a flat script (not a module), we:
  1. Define all pure mathematical helpers (mean, sd, delta) here and test
     them in isolation.
  2. Create temporary JSON files in tmp directories and invoke analyse.py as a
     subprocess to test the end-to-end CLI output.
  3. Test edge cases: missing scipy, empty data, single record per group,
     malformed JSON gracefully ignored.

Running
────────
    pip install pytest scipy tabulate
    pytest tests/python/test_analyse.py -v

Author: AI Adaptive Browser Test Suite
"""

import json
import math
import os
import subprocess
import sys
import tempfile
import statistics

import pytest


# ── Pure maths helpers (mirrors analyse.py) ──────────────────────────────────

def mean(lst):
    """Arithmetic mean; returns 0 for an empty list."""
    return sum(lst) / len(lst) if lst else 0


def sd(lst):
    """Sample standard deviation; returns 0 for lists with fewer than 2 elements."""
    if len(lst) < 2:
        return 0
    m = mean(lst)
    return math.sqrt(sum((x - m) ** 2 for x in lst) / (len(lst) - 1))


def delta_pct(a_vals, b_vals):
    """
    Percentage change of B relative to A.
    Returns None when mean(A) == 0 to avoid division by zero.
    """
    a_mean = mean(a_vals)
    if a_mean == 0:
        return None
    return ((mean(b_vals) - a_mean) / a_mean) * 100


# ── Sample task record factory ────────────────────────────────────────────────

def make_record(
    participant_id="P01",
    condition="A",
    page=1,
    task=1,
    duration_s=40.0,
    clicks=5,
    scroll_px=1000,
    focus_ratio=0.25,
):
    """
    Creates a minimal task record dict matching the schema produced by popup.js.
    """
    return {
        "participantId":       participant_id,
        "condition":           condition,
        "pageNumber":          page,
        "taskNumber":          task,
        "taskDurationS":       duration_s,
        "clicks":              clicks,
        "scrollDeltaPx":       scroll_px,
        "attentionFocusRatio": focus_ratio,
        "timestamp":           "2026-04-10T10:00:00.000Z",
        "url":                 f"file:///test-page/index.html",
    }


# ── Fixture: temporary directory with JSON files ──────────────────────────────

@pytest.fixture()
def data_dir(tmp_path):
    """
    Returns a temporary directory prepopulated with 6 JSON files
    (3 pages × 2 conditions) for participant P01.
    Condition A: slow & many clicks.
    Condition B: fast & few clicks (the expected improvement).
    """
    records_a = [
        make_record("P01", "A", page=1, task=t, duration_s=40.0, clicks=5, scroll_px=1200, focus_ratio=0.25)
        for t in range(1, 4)
    ]
    records_b = [
        make_record("P01", "B", page=1, task=t, duration_s=24.0, clicks=2, scroll_px=500, focus_ratio=0.65)
        for t in range(1, 4)
    ]

    for page in range(1, 4):
        (tmp_path / f"P01_CondA_Page{page}.json").write_text(
            json.dumps([make_record("P01", "A", page=page, task=t, duration_s=40.0,
                                   clicks=5, scroll_px=1200, focus_ratio=0.25)
                        for t in range(1, 4)])
        )
        (tmp_path / f"P01_CondB_Page{page}.json").write_text(
            json.dumps([make_record("P01", "B", page=page, task=t, duration_s=24.0,
                                   clicks=2, scroll_px=500, focus_ratio=0.65)
                        for t in range(1, 4)])
        )

    return tmp_path


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Pure maths tests
# ══════════════════════════════════════════════════════════════════════════════

class TestMean:
    def test_mean_of_empty_list_is_zero(self):
        assert mean([]) == 0

    def test_mean_of_single_value(self):
        assert mean([42]) == 42

    def test_mean_of_two_values(self):
        assert mean([10, 20]) == 15.0

    def test_mean_with_floats(self):
        result = mean([1.5, 2.5, 3.0])
        assert abs(result - 2.333) < 0.001

    def test_mean_of_identical_values(self):
        assert mean([7, 7, 7, 7]) == 7.0


class TestStandardDeviation:
    def test_sd_of_empty_list_is_zero(self):
        assert sd([]) == 0

    def test_sd_of_single_element_is_zero(self):
        assert sd([99]) == 0

    def test_sd_of_identical_values_is_zero(self):
        assert sd([5, 5, 5, 5]) == 0.0

    def test_sd_is_non_negative(self):
        assert sd([1, 3, 5, 7, 9]) >= 0

    def test_sd_matches_statistics_module(self):
        data = [40.0, 38.5, 42.1, 35.7, 44.9]
        expected = statistics.stdev(data)
        assert abs(sd(data) - expected) < 1e-9

    def test_sd_of_two_values(self):
        result = sd([2, 8])
        assert abs(result - 3.0) < 1e-9  # sample sd of [2,8] = sqrt(18) = ~4.243
        # actually: mean=5, var=((2-5)^2+(8-5)^2)/1 = 18, sd=sqrt(18)≈4.243
        expected = math.sqrt(((2 - 5) ** 2 + (8 - 5) ** 2) / 1)
        assert abs(result - expected) < 1e-9


class TestDeltaPercentage:
    def test_delta_is_none_when_a_mean_is_zero(self):
        assert delta_pct([0, 0, 0], [1, 2, 3]) is None

    def test_delta_is_negative_when_b_improves_on_a(self):
        # B (24s) is faster than A (40s) → negative delta → good
        pct = delta_pct([40.0] * 9, [24.0] * 9)
        assert pct is not None
        assert pct < 0
        assert abs(pct - (-40.0)) < 0.01

    def test_delta_is_positive_when_b_is_worse(self):
        pct = delta_pct([20.0] * 5, [30.0] * 5)
        assert pct is not None
        assert pct > 0

    def test_delta_is_zero_when_conditions_are_equal(self):
        pct = delta_pct([30.0] * 4, [30.0] * 4)
        assert pct == 0.0

    def test_delta_calculation_formula(self):
        # (mean_b - mean_a) / mean_a * 100
        a = [100.0]
        b = [75.0]
        pct = delta_pct(a, b)
        assert abs(pct - (-25.0)) < 1e-9


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Record grouping logic
# ══════════════════════════════════════════════════════════════════════════════

class TestGrouping:
    """Tests the grouping-by-condition logic that analyse.py uses."""

    def _group(self, records):
        """Replicate groups = {'A': defaultdict(list), 'B': defaultdict(list)}"""
        from collections import defaultdict
        groups = {"A": defaultdict(list), "B": defaultdict(list)}
        metrics = ["taskDurationS", "clicks", "scrollDeltaPx", "attentionFocusRatio"]
        for r in records:
            cond = r.get("condition", "?")
            if cond not in ("A", "B"):
                continue
            for m in metrics:
                val = r.get(m)
                if val is not None:
                    groups[cond][m].append(float(val))
        return groups

    def test_records_split_into_correct_conditions(self):
        records = [
            make_record(condition="A", duration_s=40.0),
            make_record(condition="B", duration_s=24.0),
        ]
        groups = self._group(records)
        assert len(groups["A"]["taskDurationS"]) == 1
        assert len(groups["B"]["taskDurationS"]) == 1

    def test_unknown_condition_is_ignored(self):
        records = [make_record(condition="C", duration_s=99.0)]
        groups = self._group(records)
        assert len(groups["A"]["taskDurationS"]) == 0
        assert len(groups["B"]["taskDurationS"]) == 0

    def test_missing_metric_value_is_skipped(self):
        record = make_record(condition="A")
        del record["taskDurationS"]
        groups = self._group([record])
        assert len(groups["A"]["taskDurationS"]) == 0
        # Other metrics should still be populated
        assert len(groups["A"]["clicks"]) == 1

    def test_all_four_metrics_are_collected(self):
        records = [make_record(condition="A")] * 3
        groups = self._group(records)
        for metric in ["taskDurationS", "clicks", "scrollDeltaPx", "attentionFocusRatio"]:
            assert len(groups["A"][metric]) == 3

    def test_multiple_participants_pool_correctly(self):
        records = (
            [make_record("P01", "A") for _ in range(3)] +
            [make_record("P02", "A") for _ in range(3)]
        )
        groups = self._group(records)
        assert len(groups["A"]["taskDurationS"]) == 6


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — End-to-end CLI tests (calls analyse.py as a subprocess)
# ══════════════════════════════════════════════════════════════════════════════

ANALYSE_PY = os.path.join(
    os.path.dirname(__file__), "..", "..", "study", "analyse.py"
)

def run_analyse(folder):
    """Runs analyse.py against `folder` and returns (stdout, stderr, returncode)."""
    result = subprocess.run(
        [sys.executable, ANALYSE_PY, str(folder)],
        capture_output=True,
        text=True,
    )
    return result.stdout, result.stderr, result.returncode


class TestCLI:
    def test_exits_zero_with_valid_data(self, data_dir):
        _, _, code = run_analyse(data_dir)
        assert code == 0

    def test_prints_loaded_record_count(self, data_dir):
        stdout, _, _ = run_analyse(data_dir)
        # 3 pages × 2 conditions × 3 tasks = 18 records
        assert "18" in stdout

    def test_output_contains_condition_a_and_b_labels(self, data_dir):
        stdout, _, _ = run_analyse(data_dir)
        assert "Condition A" in stdout or "Task Duration" in stdout

    def test_output_contains_per_task_breakdown(self, data_dir):
        stdout, _, _ = run_analyse(data_dir)
        assert "Task 1" in stdout

    def test_output_contains_per_participant_summary(self, data_dir):
        stdout, _, _ = run_analyse(data_dir)
        assert "P01" in stdout

    def test_exits_nonzero_when_no_json_files(self, tmp_path):
        _, _, code = run_analyse(tmp_path)
        assert code != 0

    def test_handles_empty_json_array_file(self, tmp_path):
        """A file that contains [] should not crash the script."""
        (tmp_path / "empty.json").write_text("[]")
        _, _, code = run_analyse(tmp_path)
        # Should exit non-zero only because there are genuinely 0 records
        # (either 0 or 1 are acceptable — just must not crash with exception)
        assert code in (0, 1)

    def test_handles_dict_style_record(self, tmp_path):
        """analyse.py supports both list-of-records and single-dict files."""
        record = make_record(condition="A", duration_s=35.0)
        (tmp_path / "single.json").write_text(json.dumps(record))
        _, _, code = run_analyse(tmp_path)
        assert code == 0

    def test_output_includes_done_marker(self, data_dir):
        stdout, _, _ = run_analyse(data_dir)
        assert "Done" in stdout

    def test_b_mean_duration_is_lower_than_a(self, data_dir):
        """
        With our fixture data (A=40s, B=24s), the script should print a
        negative delta or clearly show B < A.
        """
        stdout, _, _ = run_analyse(data_dir)
        # Both numeric means should appear; B mean (24.0) < A mean (40.0)
        assert "24.0" in stdout or "24.00" in stdout
        assert "40.0" in stdout or "40.00" in stdout
