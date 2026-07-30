"""ノート後処理の純関数テスト

実音品質改善のための2つの純関数を検証する:
- limit_polyphony: 同時発音数を上限N音に制限し、過剰ノート（コードの塊・ノイズ）を減らす
- select_melody_line: ポリフォニックなノート列から単旋律（スカイライン＝各時刻の最高音）を取り出す

いずれも重い外部依存を持たない純関数なので、ライブラリ無しで収集・実行できる。
"""
from app.services.basic_pitch_service import (
    limit_polyphony,
    select_melody_line,
    to_monophonic_bass,
)


def _note(pitch, start, end, velocity=80):
    return {"pitch": pitch, "start": start, "end": end, "velocity": velocity}


class TestLimitPolyphony:
    """limit_polyphony: 同時発音数の上限制限"""

    def test_keeps_all_when_under_limit(self):
        """同時発音が上限以下なら全ノートを残す"""
        notes = [_note(60, 0.0, 1.0), _note(64, 0.0, 1.0)]
        result = limit_polyphony(notes, max_polyphony=3)
        assert len(result) == 2

    def test_caps_simultaneous_notes_to_max(self):
        """同時刻に重なる音が上限を超えたら、velocity の高い順に上限数だけ残す"""
        # 同時刻に5音。max=3 なら velocity 上位3音のみ残る
        notes = [
            _note(60, 0.0, 1.0, velocity=50),
            _note(62, 0.0, 1.0, velocity=90),
            _note(64, 0.0, 1.0, velocity=100),
            _note(66, 0.0, 1.0, velocity=70),
            _note(68, 0.0, 1.0, velocity=30),
        ]
        result = limit_polyphony(notes, max_polyphony=3)
        assert len(result) == 3
        kept = {n["pitch"] for n in result}
        # velocity 上位3音: 100(64), 90(62), 70(66)
        assert kept == {62, 64, 66}

    def test_non_overlapping_notes_all_kept(self):
        """時間的に重ならないノートは上限に関係なく全て残る"""
        notes = [_note(60, 0.0, 0.5), _note(62, 0.6, 1.0), _note(64, 1.1, 1.5)]
        result = limit_polyphony(notes, max_polyphony=1)
        assert len(result) == 3

    def test_empty(self):
        assert limit_polyphony([], max_polyphony=4) == []


class TestSelectMelodyLine:
    """select_melody_line: 単旋律（スカイライン）抽出"""

    def test_picks_highest_pitch_when_overlapping(self):
        """和音から各時刻の最高音だけを残す（単旋律化）"""
        # 同時刻に C4(60)/E4(64)/G4(67) の和音 → 最高音 G4 のみ
        notes = [_note(60, 0.0, 1.0), _note(64, 0.0, 1.0), _note(67, 0.0, 1.0)]
        result = select_melody_line(notes)
        assert len(result) == 1
        assert result[0]["pitch"] == 67

    def test_monophonic_output_has_no_overlap(self):
        """出力は単旋律（同時に2音以上鳴らない）"""
        notes = [
            _note(60, 0.0, 1.0), _note(64, 0.0, 1.0),  # 和音1
            _note(62, 1.0, 2.0), _note(69, 1.0, 2.0),  # 和音2
        ]
        result = select_melody_line(notes)
        # 各時刻で同時発音は最大1
        events = []
        for n in result:
            events.append((n["start"], 1))
            events.append((n["end"], -1))
        events.sort()
        cur = mx = 0
        for _, d in events:
            cur += d
            mx = max(mx, cur)
        assert mx <= 1, f"単旋律のはずが同時発音 {mx}"
        # 各区間の最高音が選ばれている
        assert result[0]["pitch"] == 64  # 和音1の最高音
        assert any(n["pitch"] == 69 for n in result)  # 和音2の最高音

    def test_sequential_melody_preserved(self):
        """重ならない単音メロディはそのまま残る"""
        notes = [_note(60, 0.0, 0.5), _note(62, 0.5, 1.0), _note(64, 1.0, 1.5)]
        result = select_melody_line(notes)
        assert [n["pitch"] for n in result] == [60, 62, 64]

    def test_empty(self):
        assert select_melody_line([]) == []


class TestToMonophonicBass:
    """to_monophonic_bass: ベースを「穴の無い」単旋律に整える

    ベースは単音楽器。重なりを velocity で削除する limit_polyphony だと
    ノートが消えて「ブツ切り」になる。これは削除せず、重なりは最低音(ルート)を
    残して直前音を次音の開始まで縮める（=穴を作らない）。
    """

    def test_overlap_keeps_lowest_and_no_gap(self):
        """同時に鳴る2音は最低音を残し、削除せず（穴を作らない）"""
        # 60(ルート) と 67 が同時 → ルート60を残す
        notes = [_note(60, 0.0, 1.0), _note(67, 0.0, 1.0)]
        result = to_monophonic_bass(notes)
        assert all(n["pitch"] == 60 for n in result)
        # 単音（同時発音1以下）
        events = []
        for n in result:
            events.append((n["start"], 1))
            events.append((n["end"], -1))
        events.sort()
        cur = mx = 0
        for _, d in events:
            cur += d
            mx = max(mx, cur)
        assert mx <= 1

    def test_partial_overlap_trims_not_deletes(self):
        """部分的に重なる音は、前の音を次音開始で縮めて連続させる（消さない）"""
        # 36(0.0-0.6) と 38(0.5-1.0) が 0.5-0.6 で重なる
        notes = [_note(36, 0.0, 0.6), _note(38, 0.5, 1.0)]
        result = to_monophonic_bass(notes)
        # 2音とも残る（削除しない）
        assert len(result) == 2
        # 重なりが解消され、前音は次音開始(0.5)までに縮む
        result.sort(key=lambda n: n["start"])
        assert result[0]["end"] <= result[1]["start"] + 1e-6
        # 連続している（大きな穴が空かない）
        assert result[1]["start"] - result[0]["end"] < 0.01

    def test_sequential_unchanged(self):
        """重ならない連続音はそのまま（ギャップは保持）"""
        notes = [_note(36, 0.0, 0.4), _note(38, 0.6, 1.0)]
        result = to_monophonic_bass(notes)
        assert len(result) == 2
        assert result[0]["pitch"] == 36 and result[1]["pitch"] == 38

    def test_empty(self):
        assert to_monophonic_bass([]) == []
