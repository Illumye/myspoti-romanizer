"""Fetches the plain lyrics of songs by popular Japanese artists from LRCLIB's public API, to measure
the model and to learn the words of songs: lyrics are copyrighted, the file stays in
tools/japanese/data, out of the repository, and only word counts reach the model. One line of
lyrics per line, the lines with kana only, each once.

Three lists of artists, apart: one for the evaluation, one for training on the vocabulary of songs,
so that the measure never reads lyrics the model learned from, and a hard one, measured on its own,
where songs stray furthest from the subtitles the model comes from: rap and its slang, Vocaloid
wordplay, classical Japanese.

Usage: fetch_lyrics.py OUT.txt [--set evaluation|training|hard] [--per-artist N] [--exclude LINES.txt]...
"""

import argparse
import json
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

EVALUATION = [
    "YOASOBI", "Aimer", "LiSA", "Official髭男dism", "King Gnu", "Ado", "米津玄師", "RADWIMPS",
    "back number", "Mrs. GREEN APPLE", "あいみょん", "Vaundy", "Eve", "ヨルシカ", "ずっと真夜中でいいのに。",
    "スピッツ", "Mr.Children", "サカナクション", "BUMP OF CHICKEN", "宇多田ヒカル", "椎名林檎", "aiko",
    "いきものがかり", "Superfly", "クリープハイプ", "藤井風", "milet", "Uru", "SEKAI NO OWARI", "GReeeeN",
    "中島みゆき", "松任谷由実", "DREAMS COME TRUE", "ポルノグラフィティ", "緑黄色社会", "Saucy Dog",
    "マカロニえんぴつ", "優里", "yama", "Kenshi Yonezu",
]
TRAINING = [
    "星野源", "嵐", "西野カナ", "Aqua Timez", "flumpool", "ClariS", "fripSide", "Kalafina", "藍井エイル",
    "ReoNa", "坂本真綾", "水樹奈々", "UVERworld", "SPYAIR", "ゆず", "コブクロ", "平井堅", "絢香", "YUI", "miwa",
    "家入レオ", "大塚愛", "倖田來未", "浜崎あゆみ", "安室奈美恵", "B'z", "GLAY", "サザンオールスターズ",
    "THE BACK HORN", "羊文学", "Hump Back", "the peggies", "sumika", "スキマスイッチ",
]
# LRCLIB files some artists under their Latin name, some under their Japanese one: both are asked.
HARD = [
    "Zeebra", "Creepy Nuts", "RHYMESTER", "ピノキオピー", "PinocchioP", "和楽器バンド", "Wagakki Band",
]
SETS = {"evaluation": EVALUATION, "training": TRAINING, "hard": HARD}
USER_AGENT = "myspoti-romanizer-evaluation (https://github.com/kota-zo/myspoti)"


def has_kana(text: str) -> bool:
    return any("぀" <= ch <= "ヿ" for ch in text)


def search(artist: str, attempts: int = 4) -> list[dict]:
    """LRCLIB's songs for [artist]; a busy server (503) is asked again after a growing wait."""
    url = "https://lrclib.net/api/search?" + urllib.parse.urlencode({"q": artist})
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 503 or attempt == attempts - 1:
                raise
            time.sleep(5 * 2**attempt)
    return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("out")
    parser.add_argument("--set", choices=tuple(SETS), default="evaluation")
    parser.add_argument("--per-artist", type=int, default=6)
    parser.add_argument("--exclude", action="append", default=[], help="a file of lines to leave out, such as the evaluation's")
    args = parser.parse_args()

    seen: set[str] = set()
    for path in args.exclude:
        with open(path, encoding="utf-8") as excluded:
            seen |= {line.strip() for line in excluded}
    lines, songs = [], 0
    for artist in SETS[args.set]:
        try:
            results = search(artist)
        except OSError as error:
            print(f"{artist}: {error}")
            continue
        taken = 0
        for song in results:
            lyrics = song.get("plainLyrics") or ""
            if taken >= args.per_artist or not has_kana(lyrics):
                continue
            taken += 1
            for line in lyrics.splitlines():
                line = unicodedata.normalize("NFKC", line).strip()
                if line and has_kana(line) and line not in seen:
                    seen.add(line)
                    lines.append(line)
        songs += taken
        print(f"{artist}: {taken} songs")
        time.sleep(1.5)

    with open(args.out, "w", encoding="utf-8") as out:
        out.write("\n".join(lines) + "\n")
    print(f"{songs} songs, {len(lines)} distinct lines")


if __name__ == "__main__":
    main()
