# Online Chess (Vercel)

Server-side chess for two players on separate devices.
- `api/game.js` – serverless API (create / join / move / resign). Validates every move.
- `lib/chess.js` – rules engine (server only).
- `public/index.html` – the page; it only draws the board and polls the server every 1.5 s.

## Deploy
1. Push this folder to a GitHub repo, then in Vercel choose "Add New > Project" and import it
   (or run `npx vercel` inside this folder). No build settings needed.
2. In the Vercel project open **Storage**, add **Upstash Redis** (Marketplace) and connect it to the project.
   It adds the REST URL and token env vars automatically.
3. Redeploy. Open the site, press **Create game**, send the link to your opponent, and they press **Join as Black**.

Why Redis: Vercel functions keep no memory between requests and do not support WebSockets,
so game state lives in Redis and clients poll for changes. Games expire after 7 days.
