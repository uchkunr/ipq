# Undertow

Undertow checks the route from your computer to any site and shows where your connection loses packets.

## Run it

```
bun install
bun run dev
```

Open http://127.0.0.1:3400

## What it does

Enter a site and Undertow shows:

- A clear result, with latency and packet loss.
- The route as one box per network, marking where loss begins. Select a box to see its routers.
- DNS, connection, encryption and server response times.

Network owner names come from public RIPE data. Undertow measures from the machine it runs on and only answers on localhost unless you set `UNDERTOW_ALLOW_REMOTE=1`. It uses the system `ping` and `traceroute` or `tracert` tools.
