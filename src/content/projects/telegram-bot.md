---
title: 'Telegram reminder bot: Lunacle 🌙'
order: 3
description: 'Sends moon-phase and personal reminders through Telegram'
isFeatured: true
type: 'project'
tags: ['Python', 'Automation', 'Serverless']
---
## Overview
My Telegram reminder bot — Lunacle 🌙 — sends curated reminders for moon phases, such as full moon and new moon days, along with personal event reminders. I built it for a friend who wanted to stay connected with their spiritual side but their schedule didn't allow for regular calendar tracking.

Lunacle runs on a small serverless system: I've added the reminder schedules in a Google Sheet, a scheduled GitHub Actions job delivers them to Telegram twice a day, and a Cloudflare Worker acts as the listener and answers back when one of the designated chat IDs send a message to the bot.

It's live here: <a href="https://t.me/LunacleBot" target="_blank" rel="noopener noreferrer">@LunacleBot</a>.

A sample of the custom reminders I've set:

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

- **`sync_sheet.py`** pulls the reminder tabs from the sheet through the credential-less CSV export — it has built-in retries, timeouts, and row validation — and merges them into a single date-keyed schedule. None of this information persists locally: every run fetches fresh.
- **`reminder.py`** computes "now" in IST so delivery is timezone-correct wherever the runner executes, then sends every reminder due today to each configured chat. It's not always punctual but that's a quirk of GitHub Actions I've learned to live with (for now).
- **`worker.js`** authenticates every webhook request before doing any other work, answers back with canned replies (matched by escaped, word-boundary regexes), and forwards their messages to the owner (me!).

## Design decisions

- When I was building the reminders list, I used the python library `ephem`, which computes lunar phases in a perfect mathematical sense.
I quickly found out: Ephem works in UTC, and at IST +5:30 a phase falling late in the UTC day belongs to the *next* day here — a bot that announces the full moon on the wrong evening is worthless.
And, the phase timestamps weren't the data I wanted: "full moon at 21:14 UTC" isn't a message, but "today's full moon is called the Worm moon 🪱" is. I wanted a personalized library of reminders, so I decided to fill the calendar in by hand. Manually curating something that is automatable may seem counter productive but to me, the process matters as much as the outcome.

- The first version of this bot ran on Railway's trial tier and worked beautifully, right up until the trial ended. I wasn't going to pay for a bot that fires at most 3 reminders per month.
- I went hunting for free compute instead: compared VPS options (none of it was cheap), fought with Oracle's always-free VM and stopped right before I rage-quit, and spent a genuine few minutes staring at the wall considering a Raspberry Pi. After some research, it hit me: I don't need a VM when I can achieve the same with Cloudflare workers and the magic of webhooks!
- The reminders are a cron job, and GitHub already runs those for free. The replies are a function that wakes for a few milliseconds when someone texts and then stops existing, which is precisely what Cloudflare Workers are for. Now both halves of the bot run for free, independently.

**Reminders used to be committed as JSON.** In the previous version of the bot, `reminders.json` was written and committed back to the repository on every run. That worked, but it was an unnecessary sync step between my google sheet and the JSON that also made my reminders file public. Now, fetching the sheet at send time removed the sync step, the commit step, and a whole class of "did the sync actually run?" failures.

## Security design

The project holds my telegram bot token and personal reminder data, so I had to give it the appropriate security consideration:

- **No secrets in the repository.** Every sensitive value — bot tokens, chat IDs, the webhook secret — lives in GitHub Actions secrets or Cloudflare Worker environment variables and reaches the code only at runtime. The scripts read them with no fallback defaults, so a misconfigured environment simply fails instead of running with an empty token.
- **Webhook authentication first.** The Worker compares Telegram's secret-token header before any other work and returns `401` on mismatch, so discovering the Worker URL isn't enough to forge bot updates.
- **Chat-ID allowlisting in both directions.** Outbound reminders go only to configured chats; inbound handling distinguishes the owner from strangers, and strangers can only ever trigger canned responses.
- **Serverless footprint.** There's no long-running server to patch — the outbound pipeline is pure egress, and the inbound surface is a single stateless Worker endpoint.

## When the run goes quiet

Here are some possible failure modes I've personally hit with this bot:

1. **Read the Actions run log first.** Every reminder prints a line: sent, skipped and which run it belongs to, or `No reminder for <date>`. That single log separates "the send failed" from "the row was never due" — two different problems that look identical from the outside.
2. **Check the workflow hasn't been disabled.** GitHub switches off scheduled workflows on public repositories after 60 days without a commit, with one email as warning. The workflow's own runs don't count as activity, so a bot that runs on cron and nothing else disables itself on schedule — and from the outside that looks exactly like a code bug.
3. **Confirm the sheet is still link-shared.** Revoking sharing breaks the CSV fetch — three retry lines, then a `RuntimeError` in the log.
4. **Check the date format.** `date` is matched as a plain string against `YYYY-MM-DD`, so a cell reading `01/03/2026` matches nothing and the row is skipped.
5. **Check the chat IDs.** A wrong or stale ID fails for that recipient alone, so one person can stop receiving while another carries on.

## My role

Solo project — I designed, built, and documented the whole system:

- Designed the two-half architecture and wrote all three components with AI assistance: the Python fetch and delivery scripts, the Cloudflare Worker, and the GitHub Actions scheduling workflow.
- Made the security decisions documented here, from secret handling to webhook verification.
- Wrote the README as a security-focused document: architecture with a data-flow diagram, a secrets table showing where each value lives, the protections built into the code, the consciously accepted risks, and a setup guide someone else could follow end to end.

## Tech stack
Python (`requests`, `python-telegram-bot`, `pytz`) for the reminder pipeline, JavaScript on Cloudflare Workers for the webhook listener, GitHub Actions for cron scheduling, and Google Sheets as the schedule source.

## Links
<a href="https://t.me/LunacleBot" target="_blank" rel="noopener noreferrer">Message @LunacleBot on Telegram</a> — the bot is live.

<a href="https://github.com/natsatra/lunaclebot" target="_blank" rel="noopener noreferrer">View on GitHub</a> — the full README, including the secrets table, limitations, and setup steps.
