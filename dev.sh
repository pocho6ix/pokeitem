#!/bin/sh
# Wrapper pour Next.js dev — assure que node est dans le PATH pour les workers Turbopack
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"
cd /Users/Pocho/pokeitem
exec /opt/homebrew/opt/node@22/bin/node --max-http-header-size=8388608 /Users/Pocho/pokeitem/node_modules/.bin/next dev
