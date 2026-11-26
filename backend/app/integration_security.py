from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class IntegrationEncryptionError(Exception):
    pass


def _cipher() -> Fernet:
    key = get_settings().integration_encryption_key
    if not key:
        raise IntegrationEncryptionError("Integration credential encryption is not configured")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as error:
        raise IntegrationEncryptionError("Integration credential encryption is not configured correctly") from error


def encrypt_integration_secret(secret: str) -> str:
    return _cipher().encrypt(secret.encode("utf-8")).decode("ascii")


def decrypt_integration_secret(encrypted_secret: str) -> str:
    try:
        return _cipher().decrypt(encrypted_secret.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeEncodeError) as error:
        raise IntegrationEncryptionError("Stored integration credentials could not be decrypted") from error


def integration_encryption_ready() -> bool:
    try:
        _cipher()
    except IntegrationEncryptionError:
        return False
    return True
