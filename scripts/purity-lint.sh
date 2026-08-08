#!/bin/bash
# Phase purity lint — flags direct Map.set/Map.delete on world.* maps
# outside of ImpactBuilder and ImpactResolver.
#
# Usage: bash scripts/purity-lint.sh
# Exit code: 0 if no violations, 1 if violations found

set -euo pipefail

VIOLATIONS=0

# Search for world.heyas.set, world.rikishi.set, etc. in engine code
# Exclude ImpactBuilder.ts and ImpactResolver.ts (authorized mutation sites)
# Exclude test files

for pattern in "world.heyas.set" "world.rikishi.set" "world.staff.set" "world.oyakata.set" "world.sponsorPool.sponsors.set" "world.activeRikishiIds.add" "world.activeRikishiIds.delete"; do
  matches=$(grep -rn "$pattern" src/engine/ \
    --include="*.ts" \
    --exclude="ImpactBuilder.ts" \
    --exclude="ImpactResolver.ts" \
    --exclude-dir="tests" \
    --exclude-dir="__tests__" \
    2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "VIOLATION: Direct mutation '$pattern' found:"
    echo "$matches"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ $VIOLATIONS purity violation(s) found"
  exit 1
else
  echo "✅ No phase purity violations found"
  exit 0
fi
