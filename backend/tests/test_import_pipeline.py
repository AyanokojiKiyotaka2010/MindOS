import asyncio

from app import import_pipeline


class _FakeGeminiResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": (
                            '{"concepts":[{"title":"Systems thinking","description":"'
                            'Feedback loops and system behavior","source_titles":["Systems"]}],'
                            '"relations":[]}'
                        )
                    }]
                }
            }]
        }


class _FakeGeminiClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None

    async def post(self, url, *, headers, json):
        assert url.endswith("/models/gemini-2.5-flash:generateContent")
        assert headers["x-goog-api-key"] == "test-key"
        assert "Private source content" in json["contents"][0]["parts"][0]["text"]
        return _FakeGeminiResponse()


def test_gemini_suggestions_are_parsed_and_mapped_to_source_documents(monkeypatch):
    monkeypatch.setattr(import_pipeline.httpx, "AsyncClient", lambda timeout: _FakeGeminiClient())

    preview = asyncio.run(import_pipeline.create_import_preview(
        [("Systems.md", b"# Systems\nPrivate source content.")],
        extraction_mode="gemini",
        existing_titles=set(),
        gemini_api_key="test-key",
    ))

    suggestion = next(concept for concept in preview["concepts"] if concept["title"] == "Systems thinking")
    assert suggestion["source_document_ids"] == ["doc-0"]
    assert preview["extraction_mode"] == "gemini"
