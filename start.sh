#!/bin/bash
# MemoAle — Startup script per VPS
# Usa questo script per avviare l'app sul server

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Crea cartella data se non esiste
mkdir -p data

# Avvia il server
echo "Starting MemoAle..."
node server/index.js