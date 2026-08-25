# MemoAle — Agenda Clienti

Applicazione per gestire clienti e progetti con link web e repository Bitbucket.

## Struttura

```
MemoAle/
├── server/
│   └── index.js          # Server Express + API REST + SQLite
├── public/
│   ├── index.html         # Single Page Application
│   ├── manifest.json      # PWA manifest (installabile su Android)
│   ├── sw.js              # Service Worker (cache offline)
│   └── icons/
│       ├── logo.svg       # Logo vettoriale
│       ├── icon-192.png   # Icona PWA 192x192
│       └── icon-512.png   # Icona PWA 512x512
├── data/
│   └── memoale.db         # Database SQLite (autocreato)
├── scripts/
│   └── generate-icons.js  # Generatore icone PWA
├── start.sh               # Script avvio VPS
├── package.json
└── README.md
```

## Installazione

```bash
cd MemoAle
npm install
npm start
```

## Deploy su VPS

1. Copia l'intera cartella `MemoAle` sul VPS
2. `cd MemoAle && npm install --production`
3. `chmod +x start.sh`
4. `./start.sh` (o usa PM2 per persistenza: `pm2 start start.sh --name memoale`)

Di default l'app parte sulla porta **3456**.  
Modifica con `export PORT=8080` prima di avviare.

## Installazione su Android

Apri l'app nel browser Chrome e compare il banner "Aggiungi alla schermata Home" —  
MemoAle è una Progressive Web App (PWA) con manifest.json e service worker.

## API REST

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/clients` | Lista tutti i clienti con progetti |
| POST | `/api/clients` | Crea cliente `{name}` |
| PUT | `/api/clients/:id` | Modifica cliente `{name}` |
| DELETE | `/api/clients/:id` | Elimina cliente (cascade progetti) |
| POST | `/api/clients/:id/projects` | Crea progetto `{name, web_url, repo_url}` |
| PUT | `/api/projects/:id` | Modifica progetto |
| DELETE | `/api/projects/:id` | Elimina progetto |

## Copyright

&copy; 2026 **Alessandro Loretti** — Tutti i diritti riservati.