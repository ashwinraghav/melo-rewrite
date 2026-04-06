#!/usr/bin/env python3
"""Grant or revoke creator access for a Mello user.

Sets the ``creator`` Firebase custom claim (embedded in ID tokens) and
updates the Firestore ``is_creator`` field to keep them in sync.

Usage:
    python scripts/set-creator.py --uid <firebase-uid> --grant
    python scripts/set-creator.py --email user@example.com --revoke

The user must re-authenticate (or wait up to 1 hour for token refresh)
for the custom-claim change to take effect in their ID token.
"""

import argparse
import sys

import firebase_admin
from firebase_admin import auth, credentials, firestore

# Initialize Firebase Admin with application default credentials
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.ApplicationDefault())

db = firestore.client()


def resolve_uid(uid: str | None, email: str | None) -> str:
    if uid:
        return uid
    if email:
        user = auth.get_user_by_email(email)
        print(f"Resolved email {email} → uid {user.uid}")
        return user.uid
    print("Error: provide --uid or --email", file=sys.stderr)
    sys.exit(1)


def set_creator(uid: str, *, grant: bool) -> None:
    # 1. Set Firebase custom claim
    user = auth.get_user(uid)
    existing_claims = user.custom_claims or {}
    existing_claims["creator"] = grant
    auth.set_custom_user_claims(uid, existing_claims)
    print(f"Custom claim 'creator' set to {grant} for uid {uid}")

    # 2. Update Firestore profile
    doc_ref = db.collection("users").document(uid)
    doc = doc_ref.get()
    if doc.exists:
        doc_ref.update({"is_creator": grant})
        print(f"Firestore users/{uid}.is_creator updated to {grant}")
    else:
        print(f"Warning: No Firestore profile found for uid {uid} (user may not have signed in yet)")

    action = "granted" if grant else "revoked"
    print(f"\nCreator access {action} for {uid}.")
    print("The user must re-authenticate for the token change to take effect.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Grant or revoke Mello creator access")
    parser.add_argument("--uid", help="Firebase Auth UID")
    parser.add_argument("--email", help="User email (resolved to UID via Firebase Auth)")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--grant", action="store_true", help="Grant creator access")
    action.add_argument("--revoke", action="store_true", help="Revoke creator access")
    args = parser.parse_args()

    uid = resolve_uid(args.uid, args.email)
    set_creator(uid, grant=args.grant)


if __name__ == "__main__":
    main()
