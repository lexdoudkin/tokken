#!/bin/bash
# TOKKEN deploys — always on the IKAROS Cloudflare account via the local token, never the company OAuth login.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env.tokken; set +a
export CLOUDFLARE_ACCOUNT_ID=ecb4b473e61e57b0edf4052fb0d0963a XDG_CONFIG_HOME="$HOME/.config/tokken"
wrangler whoami 2>&1 | grep -q "ikaros.ventures" || { echo "REFUSING: not the IKAROS account"; exit 1; }
wrangler "$@"
