"""Print fresh secrets for Life Tracker's environment variables.

Usage:
    pip install cryptography
    python scripts/generate_secrets.py

Paste the output into Vercel -> Settings -> Environment Variables (and .env.local for local dev).
Generate these once and keep them: new VAPID keys disconnect every device's notifications.
"""

import base64
import secrets

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> None:
    # Web push (VAPID) uses a P-256 key pair: the public key as an uncompressed point and the
    # private key as the raw 32-byte scalar, both base64url without padding.
    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    private = key.private_numbers().private_value.to_bytes(32, "big")

    print(f"CRON_SECRET={secrets.token_hex(32)}")
    print(f"NEXT_PUBLIC_VAPID_PUBLIC_KEY={b64url(public)}")
    print(f"VAPID_PRIVATE_KEY={b64url(private)}")


if __name__ == "__main__":
    main()
