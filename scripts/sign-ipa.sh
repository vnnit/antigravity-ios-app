#!/bin/bash
set -e

# Usage: ./scripts/sign-ipa.sh <path_to_ipa> [path_to_p12] [p12_password] [path_to_mobileprovision]

IPA_PATH=${1:-"Antigravity-v1.0.0.ipa"}
P12_PATH=${2:-"certs/00008110-001934CC3E79801E.p12"}
P12_PASS=${3:-"1"}
PROVISION_PATH=${4:-"certs/00008110-001934CC3E79801E.mobileprovision"}

echo "=== Antigravity iOS IPA Signer ==="

# Check if default files exist if not provided
if [ ! -f "$P12_PATH" ]; then
  P12_PATH=$(find certs -name "*.p12" | head -n 1)
fi

if [ ! -f "$PROVISION_PATH" ]; then
  PROVISION_PATH=$(find certs -name "*.mobileprovision" | head -n 1)
fi

if [ ! -f "$IPA_PATH" ]; then
  echo "Error: IPA file not found at '$IPA_PATH'"
  exit 1
fi

if [ ! -f "$P12_PATH" ]; then
  echo "Error: P12 Certificate file not found at '$P12_PATH'"
  exit 1
fi

if [ ! -f "$PROVISION_PATH" ]; then
  echo "Error: Provisioning profile not found at '$PROVISION_PATH'"
  exit 1
fi

echo "Signing using:"
echo "  IPA:       $IPA_PATH"
echo "  Cert:      $P12_PATH"
echo "  Profile:   $PROVISION_PATH"

OUTPUT_SIGNED_IPA="${IPA_PATH%.ipa}-signed.ipa"

if command -v zsign &> /dev/null; then
  echo "Using zsign..."
  zsign -k "$P12_PATH" -p "$P12_PASS" -m "$PROVISION_PATH" -o "$OUTPUT_SIGNED_IPA" "$IPA_PATH"
else
  echo "zsign not found. Installing zsign via brew..."
  if command -v brew &> /dev/null; then
    brew install zsign
    zsign -k "$P12_PATH" -p "$P12_PASS" -m "$PROVISION_PATH" -o "$OUTPUT_SIGNED_IPA" "$IPA_PATH"
  else
    echo "Error: Please install zsign (brew install zsign)"
    exit 1
  fi
fi

echo "✅ Signed IPA generated: $OUTPUT_SIGNED_IPA"
