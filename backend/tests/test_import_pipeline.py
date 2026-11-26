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

class _FakeProviderResponse:
    def __init__(self, provider: str):
        self.provider = provider

    def raise_for_status(self):
        return None

    def json(self):
        text = '{"concepts":[{"title":"Testable idea","description":"An extracted concept","source_titles":["Systems"]}],"relations":[]}'
        if self.provider == "openai":
            return {"choices": [{"message": {"content": text}}]}
        return {"content": [{"text": text}]}


class _FakeProviderClient:
    def __init__(self, provider: str):
        self.provider = provider

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None

    async def post(self, url, *, headers, json):
        if self.provider == "openai":
            assert url == "https://api.openai.com/v1/chat/completions"
            assert headers["Authorization"] == "Bearer personal-key"
        else:
            assert url == "https://api.anthropic.com/v1/messages"
            assert headers["x-api-key"] == "personal-key"
        return _FakeProviderResponse(self.provider)


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


def test_openai_and_anthropic_suggestions_use_provider_adapters(monkeypatch):
    for provider in ("openai", "anthropic"):
        monkeypatch.setattr(
            import_pipeline.httpx,
            "AsyncClient",
            lambda timeout, selected=provider: _FakeProviderClient(selected),
        )
        preview = asyncio.run(import_pipeline.create_import_preview(
            [("Systems.md", b"# Systems\nPrivate source content.")],
            extraction_mode=provider,
            existing_titles=set(),
            provider_api_key="personal-key",
            provider_models={provider: "test-model"},
        ))
        suggestion = next(concept for concept in preview["concepts"] if concept["title"] == "Testable idea")
        assert suggestion["source_document_ids"] == ["doc-0"]
        assert preview["extraction_mode"] == provider
