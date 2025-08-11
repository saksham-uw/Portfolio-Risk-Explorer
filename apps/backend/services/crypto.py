import os
from pathlib import Path
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Load .env from current working dir or parent
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

_KEY = os.getenv("ENCRYPTION_KEY")
if not _KEY:
    raise RuntimeError("ENCRYPTION_KEY not set")

FERNET = Fernet(_KEY.encode())

def encrypt_bytes(data: bytes) -> bytes:
    return FERNET.encrypt(data)

def decrypt_bytes(token: bytes) -> bytes:
    return FERNET.decrypt(token)

def ensure_dir(p: str | Path) -> None:
    Path(p).mkdir(parents=True, exist_ok=True)
