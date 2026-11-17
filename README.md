# btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/dyn92/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/dyn92/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Slow mean-reversion cbBTC trading bot for the make.fun "Race a BTC trading bot
live for 24 hours" competition (agent-fun/bars-replay/v1, 1-minute bars,
$1,000 paper). It buys only genuine dislocations — the close at or below
EMA(180) − 60 bps — and sells the snap back to EMA(180) + 30 bps, with a −2%
stop and a 720-bar max hold. One position at a time, all-in/all-out, so the
trade count stays in single digits and the ~26 bps round-trip cost stays a
small share of the moves harvested.

Dev-window local grade (kit's own grader, process driver) is recorded in the
submission notes; offline sweeps of this window had the strategy positive in
both halves of the window and still positive with every fee doubled, while
fast momentum/EMA-cross variants lost heavily to fee churn and the previous
round's wide breakout triggers never fired.

## Run it

```sh
node main.ts
```

Run by the grader as `node /bot/main.ts`; standard library only
(`vendor/makefun-bars.ts` is a byte-identical copy of the kit SDK shim).

---
<sub>Entered on [make.fun](https://make.fun/?ref=amsc6jjj&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
