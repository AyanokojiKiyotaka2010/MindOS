import pytest
from fastapi import HTTPException

from app import chess_analytics


PGN = """[Event "White win"]
[White "Alice"]
[Black "Opponent1"]
[Result "1-0"]
[ECO "C20"]
[Opening "King Pawn Game"]

1. e4 e5 1-0

[Event "Black draw"]
[White "Opponent2"]
[Black "alice"]
[Result "1/2-1/2"]
[ECO "B20"]
[Opening "Sicilian Defense"]

1. e4 c5 1/2-1/2
"""


def test_pgn_analytics_separate_openings_and_results_by_side():
    report = chess_analytics.analyze_pgn(PGN, "Alice")

    assert report["games_analyzed"] == 2
    assert report["by_side"]["white"]["wins"] == 1
    assert report["by_side"]["white"]["openings"][0]["eco"] == "C20"
    assert report["by_side"]["black"]["draws"] == 1
    assert report["by_side"]["black"]["openings"][0]["name"] == "Sicilian Defense"


def test_pgn_analytics_rejects_games_without_the_requested_player():
    with pytest.raises(HTTPException) as error:
        chess_analytics.analyze_pgn(PGN, "NotAlice")

    assert error.value.status_code == 422


def test_chess_url_import_only_accepts_supported_providers(monkeypatch):
    monkeypatch.setattr(chess_analytics, "validate_import_url", lambda value: value)

    with pytest.raises(HTTPException) as error:
        import asyncio

        asyncio.run(chess_analytics.fetch_pgn_url("https://example.com/games.pgn", "Alice"))

    assert error.value.status_code == 400


def test_lichess_profile_url_uses_optional_access_token(monkeypatch):
    seen = {}
    monkeypatch.setattr(chess_analytics, "validate_import_url", lambda value: value)

    async def fetch_games(username, access_token=None):
        seen["username"] = username
        seen["access_token"] = access_token
        return PGN

    monkeypatch.setattr(chess_analytics, "fetch_lichess_games", fetch_games)
    import asyncio

    pgn = asyncio.run(chess_analytics.fetch_pgn_url("https://lichess.org/@/Alice", "Alice", "private-token"))

    assert pgn == PGN
    assert seen == {"username": "Alice", "access_token": "private-token"}
