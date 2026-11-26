"""Store encrypted per-user external integration credentials.

Revision ID: 0002_user_integrations
"""
import sqlalchemy as sa
from alembic import op


revision = "0002_user_integrations"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("user_integrations"):
        return
    op.create_table(
        "user_integrations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=True),
        sa.Column("encrypted_secret", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_integrations_user_provider"),
    )


def downgrade() -> None:
    op.drop_table("user_integrations")
