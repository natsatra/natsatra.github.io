---
title: 'Telegram reminder bot: Lunacle 🌙'
order: 3
description: 'Sends moon-phase and personal reminders through Telegram'
isFeatured: true
type: 'project'
tags: ['Python', 'Automation', 'Serverless']
---
## Overview
My Telegram reminder bot — Lunacle 🌙 — sends reminders for moon phases, such as full moon and new moon days, along with personal event reminders. I built it for a friend who wanted to stay connected with their spiritual side but whose schedule didn't allow for regular calendar tracking.

Under the hood it's a small serverless system: reminder schedules live in a Google Sheet, a scheduled GitHub Actions job delivers them to Telegram twice a day, and a Cloudflare Worker answers anyone who messages the bot.

## Architecture

The bot splits into two independent halves — an outbound pipeline that sends reminders and an inbound listener that receives messages. Neither depends on the other at runtime.

```
Outbound (scheduled, push):
  Google Sheet ──CSV export──▶ sync_sheet.py ──▶ reminder.py ──▶ Telegram Bot API ──▶ chats
                               (GitHub Actions, cron: 07:30 & 18:00 IST)

Inbound (event-driven, listen):
  Telegram ──webhook POST──▶ worker.js (Cloudflare Worker) ──▶ canned reply + forward to owner
```

- **`sync_sheet.py`** pulls the reminder tabs from the sheet through the credential-less CSV export — with retries, timeouts, and row validation — and merges them into a single date-keyed schedule. Nothing persists locally: every run fetches fresh.
- **`reminder.py`** computes "now" in IST so delivery is timezone-correct wherever the runner executes, then sends every reminder due today to each configured chat.
- **`worker.js`** authenticates every webhook request before doing any other work, answers strangers with canned replies (matched by escaped, word-boundary regexes), and forwards their messages to the owner.

## Security design

The project holds a bot token and personal reminder data, so I treated it like something worth attacking:

- **No secrets in the repository.** Every sensitive value — bot tokens, chat IDs, the webhook secret — lives in GitHub Actions secrets or Cloudflare Worker environment variables and reaches the code only at runtime. The scripts read them with no fallback defaults, so a misconfigured environment fails loudly instead of running with an empty token.
- **Webhook authentication first.** The Worker compares Telegram's secret-token header before any other work and returns `401` on mismatch, so discovering the Worker URL isn't enough to forge bot updates.
- **Chat-ID allowlisting in both directions.** Outbound reminders go only to configured chats; inbound handling distinguishes the owner from strangers, and strangers can only ever trigger canned responses.
- **No credentials to leak.** The pipeline reads the sheet through a public CSV export, so the project holds no Google OAuth token or service-account key at all.
- **Defensive input handling.** The Worker escapes canned-response triggers before compiling them — a trigger string can never act as a pattern — and exits early on malformed updates, while the fetcher enforces timeouts and retries rather than silently processing an error page.
- **Serverless footprint.** There's no long-running server to patch — the outbound pipeline is pure egress, and the inbound surface is a single stateless Worker endpoint.

Just as deliberately, the README documents the accepted risks: the "anyone with the link" sheet is obscurity rather than access control, sheet editors sit inside the trust boundary (reminders send as HTML, unsanitized), forwarded messages aren't rate-limited, CI dependencies aren't version-pinned, and exact-minute time matching means a late cron run can skip a timed reminder. Naming the trade-offs makes them decisions instead of accidents.

## My role

Solo project — I designed, built, and documented the whole system:

- Designed the two-half architecture and wrote all three components: the Python fetch and delivery scripts, the Cloudflare Worker, and the GitHub Actions scheduling workflow.
- Made the security decisions documented here, from secret handling to webhook verification.
- Wrote the README as a security-focused document: architecture with a data-flow diagram, a secrets table showing where each value lives, the protections built into the code, the consciously accepted risks, and a setup guide someone else could follow end to end.

## Tech stack
Python (`requests`, `python-telegram-bot`, `pytz`) for the reminder pipeline, JavaScript on Cloudflare Workers for the webhook listener, GitHub Actions for cron scheduling, and Google Sheets as the schedule source.

## Links
<a href="https://github.com/natsatra/lunaclebot" target="_blank" rel="noopener noreferrer">View on GitHub</a> — the full README, including the secrets table, limitations, and setup steps.
