// Slow mean-reversion long-only bot for cbBTC (CBBTC/USDC, 1-minute bars).
//
// Why this shape: the dev window for this round is a choppy, near-flat 24h
// (BTC +0.5% start to finish, trading in a ±1.2% band). Fast momentum and
// EMA-cross systems churned themselves to death on it in offline sweeps
// (a full-size round trip costs ~26 bps, so 90 trades of noise is a
// guaranteed loss), and wide breakout triggers never fired at all. What
// survived the sweeps — positive in both halves of the window and still
// positive with every fee doubled — was buying genuine dislocations under
// a slow mean and selling the snap back to it:
//
//   Entry: flat, and the latest close sits at or below EMA(180) - 60 bps.
//   Exit:  the close recovers to EMA(180) + 30 bps, or the position falls
//     2% under its cost basis, or 720 bars pass — whichever comes first.
//
// Position sizing is all-in/all-out, at most one position, so the trade
// count stays in single digits and fees stay a small share of the moves
// being harvested. Exits are level-based: an order the market refuses
// (slippage cap) is simply sent again on the next batch while the level
// holds. The position and its cost basis are read back from the account
// on every batch, so a rejected fill can never desync the state.
//
// Deterministic: float64 arithmetic on closes only; no clock, no
// randomness, no network, no files.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 180; // slow mean: 3 hours of 1-minute closes
const DIP_BPS = 60; // entry: close <= EMA * (1 - 60bps)
const RECOVER_BPS = 30; // exit: close >= EMA * (1 + 30bps)
const STOP_FRAC = 0.02; // exit: -2% vs cost basis
const MAX_HOLD_BARS = 720; // exit: 12 hours in the position
const MAX_SLIPPAGE_BPS = 200; // 2% past the close the order was decided on

const closes: number[] = [];
let ema: number | null = null;
const emaWarm: number[] = [];
let entrySeq = -1;

function stepEma(close: number): void {
  if (ema !== null) {
    ema += (2 / (EMA_SPAN + 1)) * (close - ema);
    return;
  }
  emaWarm.push(close);
  if (emaWarm.length === EMA_SPAN) ema = emaWarm.reduce((a, x) => a + x, 0) / EMA_SPAN;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const sym = state.symbols.get(SYMBOL);
    if (sym === undefined) return [];
    // Fold this batch's CBBTC bar (if it carries one) into the indicators.
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      const close = Number(bar.c) / 10 ** sym.price_scale;
      closes.push(close);
      stepEma(close);
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      if (entrySeq < 0) entrySeq = state.seq;
      const last = closes[closes.length - 1];
      const ret = Number(state.value(SYMBOL, held.qty)) / Number(held.cost) - 1;
      const devBps = ema !== null && last !== undefined ? (last / ema - 1) * 10000 : 0;
      if (devBps >= RECOVER_BPS || ret <= -STOP_FRAC || state.seq - entrySeq >= MAX_HOLD_BARS) {
        entrySeq = -1;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    // Flat: wait for a real dislocation under the slow mean.
    entrySeq = -1;
    if (ema === null || closes.length === 0) return [];
    const last = closes[closes.length - 1];
    const devBps = (last / ema - 1) * 10000;
    if (devBps > -DIP_BPS) return [];
    if (state.cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    const buy: BuyInput = {
      side: 'buy',
      symbol: SYMBOL,
      notional_quote_units: state.cash,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
    };
    return [buy];
  },
});
