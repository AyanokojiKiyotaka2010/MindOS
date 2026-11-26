import io
import json
import re
from collections import defaultdict
from urllib.parse import urlparse

import chess.pgn
import httpx
from fastapi import HTTPException, status

from app.acquisition import validate_import_url


MAX_CHESS_GAMES = 200
MAX_PGN_BYTES = 2_000_000
MAX_ARCHIVE_RESPONSE_BYTES = 10_000_000
CHESS_USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]{2,64}$")
CHESSCOM_GAME_URL_PATTERN = re.compile(r"^/game/(?:live|daily)/[A-Za-z0-9_-]+/?$")
LICHESS_GAME_ID_PATTERN = re.compile(r"^[A-Za-z0-9]{8}$")


def validate_chess_username(username: str) -> str:
    value = username.strip()
    if not CHESS_USERNAME_PATTERN.fullmatch(value):
        raise HTTPException(status_code=422, detail="Enter a valid Chess.com or Lichess username")
    return value


async def fetch_chesscom_games(username: str) -> str:
    username = validate_chess_username(username)
    headers = {"User-Agent": "MINDOS/1.0 (personal chess analytics)"}
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False, headers=headers) as client:
            response = await client.get(f"https://api.chess.com/pub/player/{username}/games/archives")
            response.raise_for_status()
            archives = response.json().get("archives", [])
            if not isinstance(archives, list):
                raise ValueError("Invalid archive list")
            pgns: list[tuple[int, str]] = []
            for archive_url in reversed(archives[-12:]):
                parsed = urlparse(archive_url) if isinstance(archive_url, str) else None
                if not parsed or parsed.scheme != "https" or parsed.hostname != "api.chess.com":
                    raise ValueError("Unexpected archive URL")
                async with client.stream("GET", archive_url) as archive_response:
                    archive_response.raise_for_status()
                    if int(archive_response.headers.get("content-length", "0")) > MAX_ARCHIVE_RESPONSE_BYTES:
                        raise HTTPException(status_code=413, detail="Chess.com archive response is too large")
                    chunks: list[bytes] = []
                    size = 0
                    async for chunk in archive_response.aiter_bytes():
                        size += len(chunk)
                        if size > MAX_ARCHIVE_RESPONSE_BYTES:
                            raise HTTPException(status_code=413, detail="Chess.com archive response is too large")
                        chunks.append(chunk)
                    month = json.loads(b"".join(chunks))
                games = month.get("games", [])
                if not isinstance(games, list):
                    continue
                pgns.extend(
                    (int(game.get("end_time", 0)), game["pgn"])
                    for game in games
                    if isinstance(game, dict) and isinstance(game.get("pgn"), str)
                )
                if len(pgns) >= MAX_CHESS_GAMES:
                    break
    except HTTPException:
        raise
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Chess.com account or public game archive was not found") from error
        raise HTTPException(status_code=502, detail="Unable to retrieve Chess.com game archives") from error
    except (httpx.HTTPError, json.JSONDecodeError, ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="Unable to retrieve Chess.com game archives") from error
    pgns.sort(key=lambda game: game[0], reverse=True)
    selected: list[str] = []
    total_bytes = 0
    for _, pgn in pgns:
        pgn_bytes = len(pgn.encode("utf-8"))
        if total_bytes + pgn_bytes > MAX_PGN_BYTES:
            continue
        selected.append(pgn)
        total_bytes += pgn_bytes
        if len(selected) >= MAX_CHESS_GAMES:
            break
    return "\n\n".join(selected)


async def fetch_lichess_games(username: str, access_token: str | None = None) -> str:
    username = validate_chess_username(username)
    headers = {"Accept": "application/x-ndjson"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers=headers) as client:
            async with client.stream(
                "GET",
                f"https://lichess.org/api/games/user/{username}",
                params={"max": MAX_CHESS_GAMES, "moves": "true", "opening": "true", "clocks": "false", "evals": "false"},
            ) as response:
                response.raise_for_status()
                content_length = int(response.headers.get("content-length", "0"))
                if content_length > MAX_ARCHIVE_RESPONSE_BYTES:
                    raise HTTPException(status_code=413, detail="Lichess game export is too large")
                chunks: list[bytes] = []
                total_bytes = 0
                async for chunk in response.aiter_bytes():
                    total_bytes += len(chunk)
                    if total_bytes > MAX_ARCHIVE_RESPONSE_BYTES:
                        raise HTTPException(status_code=413, detail="Lichess game export is too large")
                    chunks.append(chunk)
                response_text = b"".join(chunks).decode("utf-8", errors="replace")
    except HTTPException:
        raise
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Lichess account was not found") from error
        if error.response.status_code in {401, 403}:
            raise HTTPException(status_code=403, detail="Lichess rejected the access token; check its game-reading permission") from error
        raise HTTPException(status_code=502, detail="Unable to retrieve Lichess games") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Unable to retrieve Lichess games") from error

    pgns: list[str] = []
    for line in response_text.splitlines():
        if len(pgns) >= MAX_CHESS_GAMES:
            break
        try:
            game = json.loads(line)
        except json.JSONDecodeError:
            continue
        pgn = game.get("pgn")
        if isinstance(pgn, str) and pgn:
            pgns.append(pgn)
    return "\n\n".join(pgns)


async def fetch_pgn_url(url: str, username: str, lichess_access_token: str | None = None) -> str:
    username = validate_chess_username(username)
    safe_url = validate_import_url(url)
    parsed = urlparse(safe_url)
    host = (parsed.hostname or "").lower()

    if host in {"chess.com", "www.chess.com"}:
        profile_match = re.fullmatch(r"/member/([A-Za-z0-9_-]{2,64})/?", parsed.path)
        if profile_match:
            return await fetch_chesscom_games(profile_match.group(1))
        if CHESSCOM_GAME_URL_PATTERN.fullmatch(parsed.path):
            raise HTTPException(
                status_code=422,
                detail="Chess.com game pages do not provide a stable public PGN endpoint. Connect a Chess.com username or paste the PGN.",
            )
        raise HTTPException(status_code=422, detail="Use a Chess.com member profile URL or paste PGN text")

    if host == "api.chess.com":
        match = re.fullmatch(r"/pub/player/([A-Za-z0-9_-]{2,64})/games/(\d{4})/(\d{2})/pgn/?", parsed.path)
        if not match:
            raise HTTPException(status_code=422, detail="Use a public Chess.com monthly PGN archive URL")
        return await _fetch_bounded_pgn(safe_url)

    if host == "lichess.org":
        account_match = re.fullmatch(r"/@/([A-Za-z0-9_-]{2,64})/?", parsed.path)
        if account_match:
            return await fetch_lichess_games(account_match.group(1), lichess_access_token)
        game_match = re.fullmatch(r"/([A-Za-z0-9]{8})/?", parsed.path)
        if game_match and LICHESS_GAME_ID_PATTERN.fullmatch(game_match.group(1)):
            return await _fetch_bounded_pgn(f"https://lichess.org/game/export/{game_match.group(1)}")
        if parsed.path.startswith("/game/export/") and parsed.path.endswith(".pgn"):
            return await _fetch_bounded_pgn(safe_url)
        raise HTTPException(status_code=422, detail="Use a Lichess profile or public game URL, or paste PGN text")

    raise HTTPException(status_code=400, detail="Only Chess.com and Lichess URLs are supported for chess imports")


async def _fetch_bounded_pgn(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
            async with client.stream("GET", url, headers={"Accept": "application/x-chess-pgn, text/plain"} ) as response:
                response.raise_for_status()
                if int(response.headers.get("content-length", "0")) > MAX_PGN_BYTES:
                    raise HTTPException(status_code=413, detail="PGN URL exceeds the 2 MB limit")
                chunks: list[bytes] = []
                size = 0
                async for chunk in response.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_PGN_BYTES:
                        raise HTTPException(status_code=413, detail="PGN URL exceeds the 2 MB limit")
                    chunks.append(chunk)
                return b"".join(chunks).decode("utf-8-sig", errors="replace")
    except HTTPException:
        raise
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail="Unable to retrieve the public PGN") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Unable to retrieve the public PGN") from error


def analyze_pgn(pgn_text: str, username: str) -> dict:
    username = validate_chess_username(username).casefold()
    if len(pgn_text.encode("utf-8")) > MAX_PGN_BYTES:
        raise HTTPException(status_code=413, detail="PGN content exceeds the 2 MB limit")

    by_side: dict[str, dict] = {
        "white": {"games": 0, "wins": 0, "draws": 0, "losses": 0, "openings": defaultdict(lambda: {"eco": None, "games": 0, "wins": 0, "draws": 0, "losses": 0})},
        "black": {"games": 0, "wins": 0, "draws": 0, "losses": 0, "openings": defaultdict(lambda: {"eco": None, "games": 0, "wins": 0, "draws": 0, "losses": 0})},
    }
    parsed_games = 0
    stream = io.StringIO(pgn_text)
    while parsed_games < MAX_CHESS_GAMES:
        try:
            game = chess.pgn.read_game(stream)
        except (ValueError, UnicodeError):
            break
        if game is None:
            break
        parsed_games += 1
        headers = game.headers
        if headers.get("White", "").casefold() == username:
            side = "white"
        elif headers.get("Black", "").casefold() == username:
            side = "black"
        else:
            continue

        result = headers.get("Result")
        outcome = "draws" if result == "1/2-1/2" else (
            "wins" if (result == "1-0" and side == "white") or (result == "0-1" and side == "black")
            else "losses" if result in {"1-0", "0-1"} else None
        )
        if outcome is None:
            continue
        stats = by_side[side]
        stats["games"] += 1
        stats[outcome] += 1
        eco = headers.get("ECO", "").strip() or None
        opening = headers.get("Opening", "").strip() or eco or "Unclassified"
        opening_stats = stats["openings"][opening]
        opening_stats["eco"] = eco
        opening_stats["games"] += 1
        opening_stats[outcome] += 1

    if not any(side_stats["games"] for side_stats in by_side.values()):
        raise HTTPException(status_code=422, detail="No PGN games for this username were found")

    result_by_side = {}
    for side, stats in by_side.items():
        result_by_side[side] = _format_side_stats(stats)
    total_games = sum(stats["games"] for stats in by_side.values())
    return {
        "username": username,
        "games_analyzed": total_games,
        "by_side": result_by_side,
        "source_games_parsed": parsed_games,
    }


def _format_side_stats(stats: dict) -> dict:
    games = stats["games"]
    openings = []
    for name, opening_stats in stats["openings"].items():
        opening_games = opening_stats["games"]
        openings.append({
            "name": name,
            "eco": opening_stats["eco"],
            "games": opening_games,
            "wins": opening_stats["wins"],
            "draws": opening_stats["draws"],
            "losses": opening_stats["losses"],
            "score_percent": round((opening_stats["wins"] + opening_stats["draws"] / 2) / opening_games * 100, 1),
        })
    openings.sort(key=lambda opening: (-opening["games"], opening["name"].casefold()))
    return {
        "games": games,
        "wins": stats["wins"],
        "draws": stats["draws"],
        "losses": stats["losses"],
        "score_percent": round((stats["wins"] + stats["draws"] / 2) / games * 100, 1) if games else 0,
        "openings": openings[:20],
    }
