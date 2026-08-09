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

It's live — say hi to it at <a href="https://t.me/LunacleBot" target="_blank" rel="noopener noreferrer">@LunacleBot</a>. A stranger gets a warm canned reply and the message quietly reaches me; nobody gets silence.

Some of what it sends:

> It's Total Lunar eclipse today! 🌝 Fun fact: today's full moon is called the Worm moon. 🪱

> Today is New Moon day! 🌚 Time is ideal for new beginnings and intentions.

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

## Design decisions

**I dropped the astronomy library on purpose.** The first version computed lunar phases with `ephem`, which does the maths properly. Two things went wrong. It works in UTC, and at IST +5:30 a phase falling late in the UTC day belongs to the *next* day here — a bot that announces the full moon on the wrong evening is worse than no bot. More fundamentally, phase timestamps weren't the data I wanted: "full moon at 21:14 UTC" isn't a message, but "today's full moon is called the Worm moon 🪱" is. Eclipses, the moon names, Friday the thirteenth, the small asides — none of that comes out of an ephemeris. I dropped the library and now fill the calendar in by hand. It's manual work I redo each year, and it buys the one thing generation couldn't: every message is something I'd actually want to receive.

**Getting off a server took a month and three dead ends.** The first version ran on Railway's trial tier and worked beautifully, right up until the trial ended and staying meant paying monthly for a box that sits idle almost every minute of the day. I went hunting for free compute instead: compared VPS options, wrestled with Oracle's always-free VM long enough to regret starting, and spent a genuine few minutes considering a Raspberry Pi on my desk to send two messages a day. Then the simpler answer landed — none of this needs a machine. The reminders are a cron job, and GitHub already runs those for free. The replies are a function that wakes for a few milliseconds when someone texts and then stops existing, which is precisely what Cloudflare Workers is. Once both halves had somewhere free to run, the hosting problem stopped being a problem.

**Reminders used to be committed as JSON.** An earlier version wrote `reminders.json` and committed it back to the repository on every run. That worked, but it filled the history with machine commits and let the data go stale between syncs. Fetching the sheet at send time removed the sync step, the commit step, and a whole class of "did the sync actually run?" failures.

## Security design

The project holds a bot token and personal reminder data, so I treated it like something worth attacking:

- **No secrets in the repository.** Every sensitive value — bot tokens, chat IDs, the webhook secret — lives in GitHub Actions secrets or Cloudflare Worker environment variables and reaches the code only at runtime. The scripts read them with no fallback defaults, so a misconfigured environment fails loudly instead of running with an empty token.
- **Webhook authentication first.** The Worker compares Telegram's secret-token header before any other work and returns `401` on mismatch, so discovering the Worker URL isn't enough to forge bot updates.
- **Chat-ID allowlisting in both directions.** Outbound reminders go only to configured chats; inbound handling distinguishes the owner from strangers, and strangers can only ever trigger canned responses.
- **No credentials to leak.** The pipeline reads the sheet through a public CSV export, so the project holds no Google OAuth token or service-account key at all.
- **Defensive input handling.** The Worker escapes canned-response triggers before compiling them — a trigger string can never act as a pattern — and exits early on malformed updates, while the fetcher enforces timeouts and retries rather than silently processing an error page.
- **Serverless footprint.** There's no long-running server to patch — the outbound pipeline is pure egress, and the inbound surface is a single stateless Worker endpoint.

Just as deliberately, the README documents the accepted risks: the "anyone with the link" sheet is obscurity rather than access control, sheet editors sit inside the trust boundary (reminders send as HTML, unsanitized), forwarded messages aren't rate-limited, CI dependencies aren't version-pinned, and the two run times live in both `reminder.py` and the workflow file with nothing checking that they agree. Naming the trade-offs makes them decisions instead of accidents.

## When it goes quiet

Documenting something that runs on a schedule means documenting how it fails. The README closes with a diagnostic path ordered by likelihood rather than by component — the failure modes I actually hit, in the order they actually happen:

1. **Read the Actions run log first.** Every reminder prints a line: sent, skipped and which run it belongs to, or `No reminder for <date>`. That single log separates "the send failed" from "the row was never due" — two different problems that look identical from the outside.
2. **Check the workflow hasn't been disabled.** GitHub switches off scheduled workflows on public repositories after 60 days without a commit, with one email as warning. The workflow's own runs don't count as activity, so a bot that runs on cron and nothing else disables itself on schedule — and from the outside that looks exactly like a code bug.
3. **Confirm the sheet is still link-shared.** Revoking sharing breaks the CSV fetch — three retry lines, then a `RuntimeError` in the log.
4. **Check the date format.** `date` is matched as a plain string against `YYYY-MM-DD`, so a cell reading `01/03/2026` matches nothing and the row is skipped without complaint.
5. **Check the chat IDs.** A wrong or stale ID fails for that recipient alone, so one person can stop receiving while another carries on.

Ordering by likelihood rather than by subsystem is the choice I'd defend hardest: whoever arrives here has a bot that went quiet, not a component they already suspect.

## My role

Solo project — I designed, built, and documented the whole system:

- Designed the two-half architecture and wrote all three components: the Python fetch and delivery scripts, the Cloudflare Worker, and the GitHub Actions scheduling workflow.
- Made the security decisions documented here, from secret handling to webhook verification.
- Wrote the README as a security-focused document: architecture with a data-flow diagram, a secrets table showing where each value lives, the protections built into the code, the consciously accepted risks, and a setup guide someone else could follow end to end.

## Tech stack
Python (`requests`, `python-telegram-bot`, `pytz`) for the reminder pipeline, JavaScript on Cloudflare Workers for the webhook listener, GitHub Actions for cron scheduling, and Google Sheets as the schedule source.

## Links
<a href="https://t.me/LunacleBot" target="_blank" rel="noopener noreferrer">Message @LunacleBot on Telegram</a> — the bot is live; say hi and it'll answer.

<a href="https://github.com/natsatra/lunaclebot" target="_blank" rel="noopener noreferrer">View on GitHub</a> — the full README, including the secrets table, limitations, and setup steps.
