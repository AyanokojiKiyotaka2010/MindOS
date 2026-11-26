from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    display_name: str | None = Field(default=None, min_length=1, max_length=80)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if not any(char.islower() for char in value) or not any(char.isupper() for char in value):
            raise ValueError("Password must contain uppercase and lowercase letters")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one number")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    username: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_.-]{3,30}$")
    bio: str | None = Field(default=None, max_length=500)


class SettingsUpdateRequest(BaseModel):
    profile_visibility: str | None = Field(default=None, pattern=r"^(private|connections|public)$")
    allow_discovery: bool | None = None
    ai_features_enabled: bool | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    locale: str | None = Field(default=None, min_length=1, max_length=20)


class ProfileResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    username: str | None
    bio: str | None
    account_status: str


class SettingsResponse(BaseModel):
    profile_visibility: str
    allow_discovery: bool
    ai_features_enabled: bool
    timezone: str
    locale: str


class IntegrationUpdateRequest(BaseModel):
    secret: str | None = Field(default=None, min_length=1, max_length=8192)
    username: str | None = Field(default=None, min_length=2, max_length=64)


class ChessAnalyticsRequest(BaseModel):
    provider: str = Field(pattern=r"^(chesscom|lichess)$")


class ChessImportRequest(BaseModel):
    pgn: str | None = Field(default=None, min_length=1, max_length=2_000_000)
    url: str | None = Field(default=None, min_length=1, max_length=2048)
    username: str | None = Field(default=None, min_length=2, max_length=64)


class KnowledgeSourceCreate(BaseModel):
    source_type: str = Field(default="manual", pattern=r"^(manual|file|url|book|article|video|other)$")
    source_title: str | None = Field(default=None, max_length=255)
    source_url: str | None = Field(default=None, max_length=2048)
    original_filename: str | None = Field(default=None, max_length=255)
    mime_type: str | None = Field(default=None, max_length=127)
    file_size_bytes: int | None = Field(default=None, ge=0)
    storage_key: str | None = Field(default=None, max_length=512)


class KnowledgeSourceResponse(KnowledgeSourceCreate):
    id: str


class KnowledgeItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str | None = None
    item_type: str = Field(default="note", pattern=r"^(note|concept|question|insight|quote|resource|summary)$")
    understanding_status: str = Field(default="captured", pattern=r"^(captured|reviewing|understood|needs_clarification)$")
    is_favorite: bool = False
    tags: list[str] = Field(default_factory=list, max_length=20)
    sources: list[KnowledgeSourceCreate] = Field(default_factory=list, max_length=20)


class KnowledgeItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None
    item_type: str | None = Field(default=None, pattern=r"^(note|concept|question|insight|quote|resource|summary)$")
    understanding_status: str | None = Field(default=None, pattern=r"^(captured|reviewing|understood|needs_clarification)$")
    is_favorite: bool | None = None
    is_archived: bool | None = None
    tags: list[str] | None = None


class KnowledgeItemResponse(BaseModel):
    id: str
    title: str
    content: str | None
    item_type: str
    understanding_status: str
    is_favorite: bool
    is_archived: bool
    captured_at: str
    tags: list[str]
    sources: list[KnowledgeSourceResponse]


class KnowledgeRelationCreate(BaseModel):
    source_item_id: str = Field(min_length=36, max_length=36)
    target_item_id: str = Field(min_length=36, max_length=36)
    relation_type: str = Field(default="related_to", pattern=r"^(related_to|supports|contradicts|expands|depends_on|example_of)$")
    note: str | None = Field(default=None, max_length=500)


class KnowledgeRelationResponse(BaseModel):
    id: str
    source_item_id: str
    target_item_id: str
    relation_type: str
    note: str | None


class ImportDocumentCommit(BaseModel):
    draft_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(max_length=100_000)
    source_name: str = Field(min_length=1, max_length=512)
    source_size_bytes: int = Field(ge=0)
    tags: list[str] = Field(default_factory=list, max_length=20)
    item_type: str = Field(default="note", pattern=r"^(note|concept|question|insight|quote|resource|summary)$")


class ImportConceptCommit(BaseModel):
    draft_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)
    tags: list[str] = Field(default_factory=list, max_length=20)


class ImportRelationCommit(BaseModel):
    source_draft_id: str = Field(min_length=1, max_length=64)
    target_draft_id: str = Field(min_length=1, max_length=64)
    relation_type: str = Field(default="related_to", pattern=r"^(related_to|supports|contradicts|expands|depends_on|example_of)$")
    note: str | None = Field(default=None, max_length=500)


class ImportCommitRequest(BaseModel):
    documents: list[ImportDocumentCommit] = Field(default_factory=list, max_length=100)
    concepts: list[ImportConceptCommit] = Field(default_factory=list, max_length=100)
    relations: list[ImportRelationCommit] = Field(default_factory=list, max_length=500)


class LearningGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: str = Field(default="planned", pattern=r"^(planned|in_progress|paused|completed|abandoned)$")
    target_date: str | None = None


class LearningGoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(default=None, pattern=r"^(planned|in_progress|paused|completed|abandoned)$")
    target_date: str | None = None


class LearningGoalResponse(BaseModel):
    id: str
    title: str
    description: str | None
    status: str
    target_date: str | None
    completed_at: str | None


class ReflectionCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    body: str = Field(min_length=1)


class ReflectionResponse(BaseModel):
    id: str
    title: str | None
    body: str
    reflection_date: str


class DecisionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    context: str | None = None
    options_considered: list[str] = Field(default_factory=list, max_length=20)
    chosen_option: str | None = None
    rationale: str | None = None


class DecisionResponse(BaseModel):
    id: str
    title: str
    context: str | None
    options_considered: list[str]
    chosen_option: str | None
    rationale: str | None
    decided_at: str | None


class DecisionOutcomeCreate(BaseModel):
    outcome_notes: str = Field(min_length=1)
    outcome_status: str = Field(default="pending", pattern=r"^(positive|negative|mixed|unclear|pending)$")
