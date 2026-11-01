# VPS runbook — the Guide Assistant on your own server

This runbook puts the Guide Assistant on a private VPS, reachable from your
phone and your desktop over Tailscale. It assumes no sysadmin experience.

## What you need first

1. **A VPS** — a small Linux box you control (Debian/Ubuntu; commands assume
   `apt`), with SSH access and `sudo`.
2. **Node.js 18+** and **git** on the VPS (step 1).
3. **A Tailscale account** — the free tier is fine — plus Tailscale on your
   phone and desktop: they are how you will reach the server.
4. **Your provider API key** (OpenAI, Groq, OpenRouter, DeepSeek, …). Without
   one the guide answers from its built-in offline answers, but no AI.

## 1. Install Node and git

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Install Tailscale and join the tailnet

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

The second command prints a login URL — open it and sign in with the account
your phone and desktop use. Then ask for the VPS's tailnet address:

```bash
tailscale ip -4
```

It looks like `100.x.y.z`; that is the address your other devices will use.

## 3. Get the code onto the VPS

```bash
git clone --branch main <your repo URL> build-guide-repo
cd build-guide-repo
```

Use the URL shown by `git remote -v` on your desktop clone. **Always clone with
`--branch main`:** a clone from a local folder inherits that folder's branch and
state, which may not be `main`. Fresh from the hosted remote avoids that.

## 4. Configure: two lines in server/.env

```bash
cp server/.env.example server/.env && nano server/.env
```

Uncomment the block for the provider you use — its provider, URL and model are
already written there — then set exactly the two lines you must supply:

```
API_KEY=sk-...your provider key...
GA_WRITE_TOKEN=...a long random string...
```

`openssl rand -hex 32` makes a good token; everything else has a working default.

## 5. Start the server on the tailnet interface

```bash
BIND=100.x.y.z node server/assistant-server.js --allow-write
```

Replace `100.x.y.z` with the address from step 2. The banner tells you where
you stand — if `writes` says `read-only`, the `--allow-write` flag is missing.
Ctrl+C stops the server; `nohup` or a systemd service keeps it alive after you
log out. `http://100.x.y.z:8790/api/health` reports the provider and model.

## The three write gates

A "write" is anything that can change state — a settings save, a conversation
thread, a proposed edit. Three gates stand in front of one; each alone stops it:

1. **The bind address.** The default bind is `127.0.0.1`: only the machine
   itself can connect, so no network request ever arrives. On the VPS we widen
   it to the tailnet interface (step 5), so the other two gates do the work.
2. **The `--allow-write` flag.** Without it the server refuses every write with
   a 403, even from a legitimate client on the tailnet. Started read-only by
   accident, nothing can change.
3. **The write token (`GA_WRITE_TOKEN`).** Every write request must carry the
   token as an `x-write-token` header; without it — or with the wrong one —
   the write is refused. Someone who stumbles on the URL has no token.

## Phone and desktop, over Tailscale

Open `http://100.x.y.z:8790/` from any device on your tailnet — phone, desktop,
anything signed in and running Tailscale. The public internet cannot see it: the
server listens only on the tailnet interface, which only your devices can reach.

## Updating

```bash
cd ~/build-guide-repo && git pull
```

Then restart the server as in step 5. One rule travels with the code:
**generated files are never edited by hand** (`dist/`, the Desktop copy) — a
hand-edit is overwritten by the next rebuild. On the VPS: `git pull`, restart.

## Troubleshooting

| Symptom | What it means |
|---|---|
| The server exits at once / address in use | Port 8790 is taken — an earlier instance is probably still running. Stop it, or set `PORT=...` in `server/.env`. |
| The page badge says "Offline copy" | You opened the file itself, not the server URL. Only `http://100.x.y.z:8790/` gets the live assistant. |
| A write returns 403 | The server was started without `--allow-write`, or `GA_WRITE_TOKEN` is unset in `server/.env`. (401 means the token sent does not match.) |

Where this runbook and the code disagree, the code is right — and
`server/.env.example` documents every setting the server reads.
