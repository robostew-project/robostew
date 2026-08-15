#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
set -eu

TARGET=${1:-.}

if [ ! -d "$TARGET" ]; then
  printf 'Snapshot directory does not exist: %s\n' "$TARGET" >&2
  exit 2
fi

fail() {
  printf 'AUDIT FAIL: %s\n' "$*" >&2
  exit 1
}

if find "$TARGET" -path "$TARGET/.git" -prune -o \( -name .private-recovery -o -name node_modules -o -name .venv \) -print | grep -q .; then
  fail "recovery data or generated dependencies found"
fi

if [ "${ROBOSTEW_ALLOW_PUBLIC_GIT:-0}" = "1" ]; then
  if find "$TARGET" -mindepth 2 -name .git -print | grep -q .; then
    fail "nested Git metadata found"
  fi
elif find "$TARGET" -name .git -print | grep -q .; then
  fail "Git metadata found in the pre-publication snapshot"
fi

if find "$TARGET" -path "$TARGET/.git" -prune -o -type l -print | grep -q .; then
  fail "symbolic link found"
fi

if find "$TARGET" -path "$TARGET/.git" -prune -o -type f \( -name '*.env' -o -name '.env*' -o -name '*.db' -o -name '*.sqlite*' -o -name '*.pem' -o -name '*.key' -o -name '*.p7m' -o -name '*.rdb' -o -name '*.docx' -o -name '*.pdf' \) -print | grep -q .; then
  fail "prohibited file type found"
fi

paths=$(cd "$TARGET" && find . -path './.git' -prune -o -print)
retired_one=$(printf '\160\157\143')
retired_two=$(printf '\143\151\156\144\141\156\157')
retired_three=$(printf '\141\160\163\151\144\141')
retired_pattern="($retired_one|$retired_two|$retired_three)"
if printf '%s\n' "$paths" | grep -Eiq "$retired_pattern"; then
  fail "retired name found in a path"
fi

text_files=$(find "$TARGET" -path "$TARGET/.git" -prune -o -type f ! -name '*.jpg' ! -name '*.jpeg' ! -name '*.png' -print)
if [ -n "$text_files" ] && grep -Eil "$retired_pattern" $text_files | grep -q .; then
  fail "retired name found in text"
fi

private_one=$(printf '\057\125\163\145\162\163\057')
private_two=$(printf '\057\150\157\155\145\057\141\172\165\162\145')
private_three=$(printf '\057\150\157\155\145\057\141\156\141\164\157\154\151')
private_four=$(printf '\141\146\157\155\145\156\153\157')
private_five=$(printf '\160\150\171\163\151\143\141\154\055\141\151\055\143\154\157\165\144\055\144\141\163\150\142\157\141\162\144')
private_pattern="($private_one|$private_two|$private_three|100\.[0-9]+\.[0-9]+\.[0-9]+|$private_five)"
if [ -n "$text_files" ] && grep -Eil "$private_pattern" $text_files | grep -q .; then
  fail "private path, address, identity, or repository marker found"
fi

if [ -n "$text_files" ] && grep -Eil "$private_four" $text_files | grep -v "^$TARGET/README.md$" | grep -q .; then
  fail "personal GitHub identifier found outside the approved README attribution"
fi
approved_creator_line="Created and maintained by **Anatoli Fomenko** — [GitHub](https://github.com/$private_four) · [LinkedIn](https://www.linkedin.com/in/anatolifomenko)"
if grep -Ei "$private_four" "$TARGET/README.md" | grep -Fvx "$approved_creator_line" | grep -q .; then
  fail "personal GitHub identifier found outside the approved README attribution line"
fi

if [ -n "$text_files" ] && grep -Eil '(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|api[_-]?key[[:space:]]*[:=]|password[[:space:]]*[:=]|authorization:[[:space:]]*bearer)' $text_files | grep -q .; then
  fail "credential pattern found"
fi

for required in README.md LICENSE NOTICE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md compose.yaml Dockerfile.local robostew docs/QUICKSTART.md docs/INSTALLATION-CONTRACT.md docs/ARCHITECTURE.md docs/LIMITATIONS.md reference/README.md reference/ai-advisor/azure-openai-readonly.mjs reference/nemoclaw-openshell/policy.yaml reference/telemetry/receiver.mjs scripts/validate_local_release.sh scripts/check_markdown_links.mjs; do
  [ -e "$TARGET/$required" ] || fail "required file missing: $required"
done

if [ ! -x "$TARGET/robostew" ] || [ ! -x "$TARGET/scripts/validate_local_release.sh" ]; then
  fail "launch or validation script is not executable"
fi

licensed_files=$(find "$TARGET/local" "$TARGET/reference" "$TARGET/scripts" -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.sh' -o -name '*.css' -o -name '*.html' -o -name '*.yaml' -o -name '*.yml' \) -print)
for licensed_file in "$TARGET/Dockerfile.local" "$TARGET/compose.yaml" "$TARGET/robostew" "$TARGET/.dockerignore" "$TARGET/.gitignore" "$TARGET/.github/workflows/validate.yml" $licensed_files; do
  grep -Fq 'SPDX-License-Identifier: Apache-2.0' "$licensed_file" || fail "missing Apache-2.0 SPDX identifier: $licensed_file"
done

if grep -Eh '^[[:space:]]*uses:' "$TARGET"/.github/workflows/*.yml | grep -Ev '@[0-9a-f]{40}([[:space:]]|$)' | grep -q .; then
  fail "GitHub Action is not pinned to an immutable full commit SHA"
fi

if command -v sips >/dev/null 2>&1; then
  format=$(sips -g format "$TARGET/docs/assets/robostew-local-dashboard.jpg" 2>/dev/null | awk '/format:/{print $2}')
  [ "$format" = "jpeg" ] || fail "dashboard asset extension does not match its format"
fi

printf 'AUDIT PASS: history-free allowlist, naming, privacy, credential patterns, required files, and binary format\n'
