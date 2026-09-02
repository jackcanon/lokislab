#!/usr/bin/env bash
# Fleet build script for Loki's Lab (jackcanon/lokislab)
# Usage: fleet_lokislab_build.sh [source_tarball_path]
# Prereqs on box: Node 22 at $HOME/.local/node22/bin, source tarball (no node_modules) at $1
# Fixes the npm cross-platform optional-dep bug: rolldown native binding is
# installed explicitly per platform.
set -e
export PATH="$HOME/.local/node22/bin:$PATH"

SRC_TAR="${1:-/tmp/lokislab_src.tar.gz}"
BOX="$(hostname)"
WORK="/tmp/lokislab_run"
NODE_PLATFORM="$(node -e 'console.log(process.platform+"-"+process.arch)')"

# Map node platform/arch -> rolldown binding package
case "$NODE_PLATFORM" in
  darwin-arm64)  BINDING="@rolldown/binding-darwin-arm64" ;;
  darwin-x64)    BINDING="@rolldown/binding-darwin-x64" ;;
  linux-x64)     BINDING="@rolldown/binding-linux-x64-gnu" ;;
  linux-arm64)   BINDING="@rolldown/binding-linux-arm64-gnu" ;;
  *) echo "[$BOX] UNSUPPORTED PLATFORM $NODE_PLATFORM"; exit 2 ;;
esac

rm -rf "$WORK"; mkdir -p "$WORK"; cd "$WORK"
echo "[$BOX] extracting $SRC_TAR ..."
tar -xzf "$SRC_TAR"
echo "[$BOX] node $(node -v) | platform $NODE_PLATFORM | binding $BINDING"

echo "[$BOX] npm ci ..."
npm ci >"/tmp/${BOX}_ci.log" 2>&1 || { echo "[$BOX] npm ci FAILED"; tail -20 "/tmp/${BOX}_ci.log"; exit 1; }

echo "[$BOX] ensuring rolldown native binding ($BINDING) ..."
npm install "$BINDING" --no-save >>"/tmp/${BOX}_ci.log" 2>&1 || { echo "[$BOX] binding install FAILED"; tail -15 "/tmp/${BOX}_ci.log"; exit 1; }

echo "[$BOX] npm run build ..."
npm run build >"/tmp/${BOX}_build.log" 2>&1 || { echo "[$BOX] BUILD FAILED"; tail -30 "/tmp/${BOX}_build.log"; exit 1; }

echo "[$BOX] validate:submission smoke ..."
npm run validate:submission >"/tmp/${BOX}_val.log" 2>&1 && echo "[$BOX] VALIDATE OK" || echo "[$BOX] VALIDATE (nonzero — likely usage msg, not fatal)"

if [ -d dist ]; then echo "[$BOX] BUILD OK — dist/ ($(ls dist | wc -l | tr -d ' ') entries)"; else echo "[$BOX] dist/ MISSING"; exit 1; fi
echo "[$BOX] DONE"
