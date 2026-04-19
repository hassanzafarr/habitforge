from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest

from app.models import Completion, CompletionStatus, FrequencyType, Habit
from app.services.streak import compute_streak


def _h(
    freq: FrequencyType = FrequencyType.daily,
    target_per_week: int = 7,
    active_days: list[int] | None = None,
    created: date | None = None,
) -> Habit:
    h = Habit(
        name="Test",
        frequency_type=freq,
        target_per_week=target_per_week,
        active_days=active_days or [],
    )
    h.created_at = datetime.combine(
        created or date(2020, 1, 1), datetime.min.time(), tzinfo=timezone.utc
    )
    return h


def _c(d: date, status: CompletionStatus = CompletionStatus.done) -> Completion:
    c = Completion(date=d, status=status)
    return c


def test_empty_completions():
    h = _h()
    info = compute_streak([], h, date(2026, 4, 19))
    assert info.current_streak == 0
    assert info.longest_streak == 0
    assert info.total_completions == 0


def test_daily_today_not_yet_done_does_not_break():
    today = date(2026, 4, 19)
    h = _h()
    comps = [_c(today - timedelta(days=i)) for i in range(1, 6)]  # yesterday..-5
    info = compute_streak(comps, h, today)
    assert info.current_streak == 5


def test_daily_today_checked():
    today = date(2026, 4, 19)
    h = _h()
    comps = [_c(today - timedelta(days=i)) for i in range(0, 5)]
    info = compute_streak(comps, h, today)
    assert info.current_streak == 5


def test_daily_yesterday_missed_breaks():
    today = date(2026, 4, 19)
    h = _h()
    # done 3 days ago and before, missed yesterday
    comps = [_c(today - timedelta(days=i)) for i in range(3, 8)]
    info = compute_streak(comps, h, today)
    assert info.current_streak == 0


def test_skipped_day_does_not_break_streak():
    today = date(2026, 4, 19)
    h = _h()
    comps = [
        _c(today - timedelta(days=1)),
        _c(today - timedelta(days=2), CompletionStatus.skipped),
        _c(today - timedelta(days=3)),
        _c(today - timedelta(days=4)),
    ]
    info = compute_streak(comps, h, today)
    # current streak counts done days: 3 done days, skip keeps chain alive
    assert info.current_streak == 3


def test_duplicates_defensive():
    today = date(2026, 4, 19)
    h = _h()
    comps = [
        _c(today - timedelta(days=1)),
        _c(today - timedelta(days=1)),  # dup
        _c(today - timedelta(days=2)),
    ]
    info = compute_streak(comps, h, today)
    assert info.current_streak == 2
    assert info.total_completions == 2


def test_habit_created_today():
    today = date(2026, 4, 19)
    h = _h(created=today)
    info = compute_streak([], h, today)
    assert info.current_streak == 0


def test_custom_days_skipping_non_active_day():
    today = date(2026, 4, 20)  # Monday
    # Mon=0 Wed=2 Fri=4 only
    h = _h(freq=FrequencyType.custom_days, active_days=[0, 2, 4])
    # Last Friday (Apr 17) and Wed (Apr 15) and Mon (Apr 13) done
    comps = [_c(date(2026, 4, 17)), _c(date(2026, 4, 15)), _c(date(2026, 4, 13))]
    info = compute_streak(comps, h, today)
    # today is Mon, not yet done -> grace. Back: Fri done, Thu not due, Wed done,
    # Tue not due, Mon done. Streak=3.
    assert info.current_streak == 3


def test_weekly_mid_week():
    # target 3/week. Currently mid-week with 2 done this week, full weeks prior.
    today = date(2026, 4, 22)  # Wed
    h = _h(freq=FrequencyType.weekly, target_per_week=3)
    # previous weeks: ensure 3 done each
    def week_mon(d: date) -> date:
        return d - timedelta(days=d.weekday())
    this_mon = week_mon(today)
    comps = []
    for w in range(1, 4):  # 3 previous weeks
        mon = this_mon - timedelta(days=7 * w)
        comps += [_c(mon), _c(mon + timedelta(days=1)), _c(mon + timedelta(days=2))]
    # this week: only 2 done so far
    comps += [_c(this_mon), _c(this_mon + timedelta(days=1))]
    info = compute_streak(comps, h, today)
    assert info.current_streak == 3  # grace on current week


def test_weekly_current_week_hit_counts():
    today = date(2026, 4, 24)  # Fri
    h = _h(freq=FrequencyType.weekly, target_per_week=2)
    def week_mon(d: date) -> date:
        return d - timedelta(days=d.weekday())
    this_mon = week_mon(today)
    comps = [
        _c(this_mon),
        _c(this_mon + timedelta(days=2)),
        _c(this_mon - timedelta(days=6)),
        _c(this_mon - timedelta(days=5)),
    ]
    info = compute_streak(comps, h, today)
    assert info.current_streak == 2


def test_completion_rate_30d_daily():
    today = date(2026, 4, 19)
    h = _h()
    # 15 done, 15 missed in last 30 days
    comps = [_c(today - timedelta(days=i)) for i in range(0, 15)]
    info = compute_streak(comps, h, today)
    assert info.completion_rate_30d == 0.5


def test_skipped_excluded_from_rate_denominator():
    today = date(2026, 4, 19)
    h = _h()
    comps = [
        _c(today, CompletionStatus.done),
        _c(today - timedelta(days=1), CompletionStatus.skipped),
    ]
    # only 1 due day over last 30 is done, others missed. skipped excluded from denom.
    info = compute_streak(comps, h, today)
    # 1 done / 29 due (30 total, 1 skipped excluded) ≈ 0.0345
    assert 0 < info.completion_rate_30d < 0.05


def test_longest_tracks_past_runs():
    today = date(2026, 4, 19)
    h = _h()
    # past run of 10, gap, then recent run of 3
    past = [_c(today - timedelta(days=i)) for i in range(15, 25)]  # 10-day run
    recent = [_c(today - timedelta(days=i)) for i in range(0, 3)]
    info = compute_streak(past + recent, h, today)
    assert info.longest_streak >= 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
