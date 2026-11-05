# Undertow

Undertow shows the path from your computer to any site and tells you where your connection breaks.

## Run it

```
bun install
bun run dev
```

Open http://127.0.0.1:3400

## What it does

- Check a site: shows each network on the way as a box, and marks where data starts getting lost.
- This computer: shows which programs are connected, where, and your live speed.
- History: tests your router, provider and popular servers every 5 minutes while Undertow runs, and shows which hours are worst. You can copy a report for your provider.

Measurements stay on your computer in `.undertow/samples.jsonl`. Network owner names come from public RIPE data.

Undertow measures from the machine it runs on, so run it on the computer you want to test. It works on Windows, Linux and macOS, and only answers on localhost unless you set `UNDERTOW_ALLOW_REMOTE=1`.

Set `UNDERTOW_INTERVAL_MINUTES` to change how often History tests run.
