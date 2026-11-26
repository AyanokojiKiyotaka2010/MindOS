import enum
import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Enum, ForeignKey, JSON, String, Text, Table, Column, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


knowledge_item_tags = Table(
    "knowledge_item_tags",
    Base.metadata,
    Column("knowledge_item_id", String(36), ForeignKey("knowledge_items.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


def uuid_value() -> str:
    return str(uuid.uuid4())


class AccountStatus(str, enum.Enum):
    active = "active"
    pending_verification = "pending_verification"
    suspended = "suspended"
    deleted = "deleted"


class ProfileVisibility(str, enum.Enum):
    private = "private"
    connections = "connections"
    public = "public"


class KnowledgeItemType(str, enum.Enum):
    note = "note"
    concept = "concept"
    question = "question"
    insight = "insight"
    quote = "quote"
    resource = "resource"
    summary = "summary"


class UnderstandingStatus(str, enum.Enum):
    captured = "captured"
    reviewing = "reviewing"
    understood = "understood"
    needs_clarification = "needs_clarification"


class KnowledgeRelationType(str, enum.Enum):
    related_to = "related_to"
    supports = "supports"
    contradicts = "contradicts"
    expands = "expands"
    depends_on = "depends_on"
    example_of = "example_of"


class LearningGoalStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    paused = "paused"
    completed = "completed"
    abandoned = "abandoned"


class DecisionOutcomeStatus(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    mixed = "mixed"
    unclear = "unclear"
    pending = "pending"


class SocialVisibility(str, enum.Enum):
    private = "private"
    connections = "connections"
    public = "public"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=True)
    account_status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, values_callable=lambda values: [item.value for item in values]),
        default=AccountStatus.pending_verification,
        nullable=False,
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    profile: Mapped["UserProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    settings: Mapped["UserSettings | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    integrations: Mapped[list["UserIntegration"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    username: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    profile_visibility: Mapped[ProfileVisibility] = mapped_column(
        Enum(ProfileVisibility, values_callable=lambda values: [item.value for item in values]),
        default=ProfileVisibility.private,
        nullable=False,
    )
    allow_discovery: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_features_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    locale: Mapped[str] = mapped_column(String(20), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="settings")


class UserIntegration(Base):
    __tablename__ = "user_integrations"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_integrations_user_provider"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    encrypted_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="integrations")


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    item_type: Mapped[KnowledgeItemType] = mapped_column(
        Enum(KnowledgeItemType, values_callable=lambda values: [item.value for item in values]),
        default=KnowledgeItemType.note,
        nullable=False,
    )
    understanding_status: Mapped[UnderstandingStatus] = mapped_column(
        Enum(UnderstandingStatus, values_callable=lambda values: [item.value for item in values]),
        default=UnderstandingStatus.captured,
        nullable=False,
    )
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sources: Mapped[list["KnowledgeSource"]] = relationship(back_populates="item", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(secondary=knowledge_item_tags, back_populates="items")


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    knowledge_item_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_items.id", ondelete="CASCADE"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    source_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(127), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)

    item: Mapped[KnowledgeItem] = relationship(back_populates="sources")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)

    items: Mapped[list[KnowledgeItem]] = relationship(secondary=knowledge_item_tags, back_populates="tags")


class KnowledgeRelation(Base):
    __tablename__ = "knowledge_relations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_item_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_items.id", ondelete="CASCADE"), nullable=False)
    target_item_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_items.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[KnowledgeRelationType] = mapped_column(
        Enum(KnowledgeRelationType, values_callable=lambda values: [item.value for item in values]),
        default=KnowledgeRelationType.related_to,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[LearningGoalStatus] = mapped_column(
        Enum(LearningGoalStatus, values_callable=lambda values: [item.value for item in values]),
        default=LearningGoalStatus.planned,
        nullable=False,
    )
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Reflection(Base):
    __tablename__ = "reflections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    reflection_date: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    options_considered: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    chosen_option: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DecisionOutcome(Base):
    __tablename__ = "decision_outcomes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    decision_id: Mapped[str] = mapped_column(String(36), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False)
    outcome_notes: Mapped[str] = mapped_column(Text, nullable=False)
    outcome_status: Mapped[DecisionOutcomeStatus] = mapped_column(
        Enum(DecisionOutcomeStatus, values_callable=lambda values: [item.value for item in values]),
        default=DecisionOutcomeStatus.pending,
        nullable=False,
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)


social_post_items = Table(
    "social_post_items",
    Base.metadata,
    Column("post_id", String(36), ForeignKey("social_posts.id", ondelete="CASCADE"), primary_key=True),
    Column("knowledge_item_id", String(36), ForeignKey("knowledge_items.id", ondelete="CASCADE"), primary_key=True),
)


class SocialPost(Base):
    __tablename__ = "social_posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_value)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    visibility: Mapped[SocialVisibility] = mapped_column(
        Enum(SocialVisibility, values_callable=lambda values: [item.value for item in values]),
        default=SocialVisibility.private,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SocialFollow(Base):
    __tablename__ = "social_follows"

    follower_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow, nullable=False)
