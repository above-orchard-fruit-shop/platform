"""Password hashing with scrypt (Python standard library, no extra dependency).

Stored format: ``scrypt$<n>$<r>$<p>$<salt hex>$<hash hex>``, so the cost
parameters can be raised later without breaking existing hashes.
"""

import hashlib
import hmac
import secrets

_N, _R, _P = 2**14, 8, 1
_KEY_LEN = 32


def _derive(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, dklen=_KEY_LEN, maxmem=64 * 1024 * 1024)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _derive(password, salt, _N, _R, _P)
    return f"scrypt${_N}${_R}${_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = _derive(password, bytes.fromhex(salt_hex), int(n), int(r), int(p))
    except ValueError:
        return False
    return hmac.compare_digest(digest, bytes.fromhex(digest_hex))


# Verified against when the email is unknown, so a failed login takes the same
# time whether or not the account exists.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))
