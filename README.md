# AI Infrastructure Sizing Calculator

> Estimate the hardware needed to run **any** LLM — VRAM, system RAM, KV‑cache, tokens/sec, max context, concurrent users, power draw and running cost — from a single set of inputs.

A production‑quality, single‑page web app that turns a model spec (params, quantization, context, workload) and a target accelerator into a full memory + throughput sizing report, using **published, transparent formulas** rather than hard‑coded lookups. It can pull real model architectures live from Hugging Face and refresh its GPU catalog without a redeploy.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Framer Motion · Recharts**.

---

## Table of contents

- [Features](#features)
- [How it works (methodology)](#how-it-works-methodology)
- [Live, self‑updating data](#live-self-updating-data)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Updating the data](#updating-the-data)
- [Deployment](#deployment)
- [Accuracy & assumptions](#accuracy--assumptions)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **Model input, three ways** — pick a curated preset, look any model up by its Hugging Face repo id (`org/model`), or dial parameters in manually (1B–1000B) with architecture auto‑estimated.
- **19 quantization formats** — FP32/FP16/BF16, FP8/INT8, the full GGUF k‑quant & i‑quant ladder (Q8_0 → IQ2_XXS), plus GPTQ, AWQ, EXL2 and MLX — with the projected on‑disk model size shown live.
- **KV‑cache modeling** — toggle on/off, choose FP16 / FP8 / INT8 / Q4 cache precision, and see the exact per‑sequence formula and its memory cost. Grouped‑query attention (GQA) and sliding‑window attention are accounted for.
- **Workload & engine settings** — concurrent users, batch size, prompt/output token lengths, continuous batching, Flash Attention, speculative decoding, prefix caching.
- **Hardware targets** — 22 accelerators out of the box (NVIDIA consumer + datacenter, AMD, Intel Arc, Huawei Ascend, and Apple Silicon unified memory), multi‑GPU tensor‑parallel scaling, or CPU‑only.
- **Full result dashboard** — animated stat cards, a memory‑breakdown pie chart, min/recommended/ideal RAM tiers, VRAM fit verdict, decode & prefill tok/s, max on‑device context, supported concurrent users, load time, power and $/1M‑tokens.
- **Benchmark comparison** — the exact model sized against every accelerator at once, ranked by decode speed, with a fit indicator and price.
- **Human‑readable recommendations** — an engine that flags what to change (quantize further, add VRAM, switch KV precision, enable batching, pick a higher‑bandwidth GPU, use MLX/ROCm, …).
- **Live data** — sync trending models from Hugging Face and refresh the GPU catalog at runtime (see below).
- Dark, glassmorphism UI with animated results.

---

## How it works (methodology)

All estimates come from first‑principles formulas in [`lib/calculations.ts`](lib/calculations.ts). Nothing is a stored benchmark number — change any input and the math recomputes.

### Weight footprint

```
weightBytes = paramsB · 1e9 · (bitsPerWeight / 8)
```

`bitsPerWeight` is the **effective** bits per weight (k‑quants/i‑quants include block‑scale metadata, so e.g. `Q4_K_M ≈ 4.83 bpw`, not 4.0). See [`lib/data/quantization.ts`](lib/data/quantization.ts).

### KV cache (per sequence)

```
kv = 2 · layers · (kvHeads · headDim) · contextTokens · bytesPerElem
     headDim      = hiddenSize / attnHeads
     bytesPerElem = 2 (FP16) | 1 (FP8/INT8) | 0.5 (Q4)
```

The factor `2` is Key + Value. Using `kvHeads` (not `attnHeads`) captures the GQA reduction. Sliding‑window attention caps the effective context at the window (~4096).

### Total memory

```
total = weights
      + kvCache × concurrentSeqs      (continuous batching shares the pool)
      + activations                   (Flash Attention removes the O(seq²) term)
      + frameworkOverhead (0.75 GB + 5% of weights)
      + osOverhead (0.8 GB on GPU / 2.5 GB CPU path)
      + 10% safety margin
```

RAM tiers are `min = ceil(total)`, `recommended = ×1.25`, `ideal = ×1.5`.

### Throughput (roofline)

- **Decode is memory‑bandwidth‑bound.** Each token re‑reads the active weights (+ KV) from memory:

  ```
  tok/s ≈ (effectiveBandwidth · 0.8) / bytesReadPerToken
  ```

  Multi‑GPU adds bandwidth at ~90% tensor‑parallel efficiency; speculative decoding applies a ~1.6× factor. For MoE models only the **active** parameters per token are counted.

- **Prefill is compute‑bound:** `computeTFLOPS · 0.4 / (2 · activeParams)`.

The app also derives **max context that fits on the device**, **concurrent users** (the min of the memory‑bound and throughput‑bound limits), **load time** (model size ÷ ~5 GB/s NVMe), and **power/cost** (`TDP × count + host draw`, at `$0.16/kWh`).

Every screen that shows a number also shows the formula that produced it.

---

## Live, self‑updating data

Two mechanisms keep the calculator current without shipping new code:

### 1. Model presets — sync from Hugging Face
The **“Sync HF”** button (next to the preset dropdown) calls `/api/models/sync`, which fetches the most‑downloaded text‑generation models and resolves each one's real architecture (layers, hidden size, attention/KV heads, context, MoE experts) from its `config.json`. Only models with complete architecture are added, so the list stays trustworthy. Individual models can always be pulled on demand via the Hugging Face lookup box (`/api/hf`).

### 2. GPU catalog — runtime‑editable JSON
The accelerator list is served at runtime from [`data/gpus.json`](data/gpus.json) via `/api/gpus`. **Edit that file on the server (or point `GPU_DATA_URL` at a hosted copy) and the change appears on the next load — no rebuild, no redeploy.** Overrides merge *over* the built‑in list in [`lib/data/gpus.ts`](lib/data/gpus.ts) by `id`; new ids are appended; malformed entries are rejected so a bad file can never corrupt the math. The built‑in list is always the fallback.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS 3.4 (custom glassmorphism theme) |
| Animation | Framer Motion 12 |
| Charts | Recharts 2 |
| Icons | lucide‑react |
| Backend | Next.js Route Handlers (Node runtime) |
| External data | Hugging Face public model API |

---

## Getting started

### Prerequisites
- **Node.js 20+** (developed on Node 22)
- npm

### Install & run

```bash
git clone <your-repo-url>
cd ai-calculator
npm install

# development (http://localhost:3000)
npm run dev

# production build + serve
npm run build
npm start
```

> Run on a different port with `npm run dev -- -p 3001`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Project structure

```
ai-calculator/
├── app/
│   ├── api/
│   │   ├── gpus/route.ts        # runtime GPU catalog (merges data/gpus.json)
│   │   ├── hf/route.ts          # single-model Hugging Face lookup
│   │   └── models/sync/route.ts # trending-model sync → presets
│   ├── globals.css              # dark glassmorphism theme
│   ├── layout.tsx
│   └── page.tsx                 # header + Calculator + footer
├── components/
│   ├── Calculator.tsx           # stateful container (input → calculate → results)
│   ├── InputPanel.tsx           # all inputs, HF lookup, sync/refresh controls
│   ├── ResultsDashboard.tsx     # verdict, stat cards, memory pie, recommendations
│   ├── BenchmarkTable.tsx       # per-GPU comparison table + bar chart
│   ├── AnimatedNumber.tsx       # rAF number tween
│   ├── useCatalog.ts            # client hook: loads GPUs, syncs models
│   └── ui/primitives.tsx        # Card, Field, Select, Slider, Toggle, …
├── lib/
│   ├── calculations.ts          # the sizing engine (all formulas)
│   ├── hf.ts                    # shared Hugging Face parsing helpers
│   ├── data/
│   │   ├── gpus.ts              # built-in GPU specs + merge helpers
│   │   ├── models.ts            # curated presets + architecture estimator
│   │   └── quantization.ts      # quant formats + bits-per-weight
│   ├── types.ts                 # domain types
│   ├── defaults.ts              # default input + context presets
│   └── utils.ts                 # formatters, cn()
├── data/
│   └── gpus.json                # runtime-editable GPU catalog
└── next.config.js
```

---

## API reference

All routes run on the Node runtime and return JSON.

### `GET /api/hf?id=<org/model>`
Look up one model on Hugging Face. Returns normalized architecture:

```jsonc
{
  "id": "Qwen/Qwen3-0.6B", "name": "Qwen3-0.6B",
  "paramsB": 0.75, "layers": 28, "hiddenSize": 1024,
  "attnHeads": 16, "kvHeads": 8, "maxContext": 40960,
  "isMoE": false, "experts": 0, "activeExperts": 0,
  "family": "qwen3", "source": "huggingface"
}
```
`404` if the model is missing/gated/private.

### `GET /api/models/sync?limit=<n>`
Returns up to `n` (default 12, max 24) trending text‑generation models as calculator‑ready presets: `{ presets: ModelPreset[], count, source }`. `502` if Hugging Face is unreachable.

### `GET /api/gpus`
Returns the effective GPU catalog: `{ gpus: GpuSpec[], source, overrideCount, builtinCount }`. `source` is `env-url`, `data/gpus.json`, or `builtin`.

---

## Configuration

| Env var | Default | Description |
| --- | --- | --- |
| `GPU_DATA_URL` | — | Optional URL to a hosted GPU‑catalog JSON. Takes precedence over `data/gpus.json`. Fetched fresh on each `/api/gpus` request. |

No API key is required — the Hugging Face endpoints used are public (gated/private models will simply not resolve).

---

## Updating the data

### Add / edit a GPU (no redeploy)
Edit [`data/gpus.json`](data/gpus.json) — add an object to the `gpus` array:

```json
{
  "id": "rtx5080", "name": "RTX 5080 16GB", "vendor": "NVIDIA",
  "vramGb": 16, "bandwidthGbs": 960, "fp16Tflops": 225,
  "tdpWatts": 360, "msrpUsd": 999, "tensorCores": true, "unified": false
}
```

Reload the page (or press the **↻ N GPUs** button). `bandwidthGbs` and `fp16Tflops` drive every throughput estimate — keep them accurate. `vendor` must be one of `NVIDIA | AMD | Intel | Apple | Huawei`.

To bake a GPU into the shipped default instead, add it to [`lib/data/gpus.ts`](lib/data/gpus.ts).

### Add a model preset
Presets live in [`lib/data/models.ts`](lib/data/models.ts), or just use **Sync HF** / the lookup box to pull models at runtime.

---

## Deployment

The app needs a Node server (the `/api/*` routes render on demand), so a static export won't work.

### Vercel (easiest)
Import the repo — Next.js is auto‑detected, the API routes become serverless functions, zero config. Set `GPU_DATA_URL` in project env if you host the catalog externally.

### Self‑host with PM2

```bash
npm ci && npm run build
pm2 start npm --name ai-calculator -- start   # serves on :3000
pm2 save
```

### Deploy from GitHub (self‑hosted)

Pull the repo onto your own server and serve it with PM2 (or Docker). This is the recommended path if you're already running Node apps on a VPS/box.

**First deploy**

```bash
# on the server
git clone <your-repo-url> ai-calculator
cd ai-calculator
npm ci
npm run build
pm2 start npm --name ai-calculator -- start   # serves on :3000
pm2 save                                       # persist across reboots
```

> Already using port 3000? Run on another port: `PORT=3001 pm2 start npm --name ai-calculator -- start`.

**Updating to the latest commit**

```bash
cd ai-calculator
git pull
npm ci
npm run build
pm2 reload ai-calculator     # zero-downtime restart
```

**Optional — auto‑deploy on push (GitHub Actions + SSH)**

Add repository secrets `SSH_HOST`, `SSH_USER`, and `SSH_KEY` (a private key whose public half is in the server's `~/.ssh/authorized_keys`), then commit `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/ai-calculator
            git pull
            npm ci
            npm run build
            pm2 reload ai-calculator
```

Every push to `main` then rebuilds and reloads the app on your server. Put nginx/Caddy in front for TLS and to route a domain to `:3000`.

### Docker
Add `output: "standalone"` to `next.config.js`, then a multi‑stage `Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t ai-calculator .
docker run -p 3000:3000 ai-calculator
```

> The outbound Hugging Face calls need network egress. Behind a proxy/offline, the built‑in presets and GPU catalog still work; only live sync/lookup are affected.

---

## Accuracy & assumptions

These are **planning estimates**, not guarantees. Real‑world results vary **±15–25%** with the inference engine, kernels, drivers and OS. Key assumptions:

- ~80% of peak memory bandwidth is realized during decode.
- ~40% FP16 utilization during prefill.
- ~90% tensor‑parallel efficiency per additional GPU.
- Framework overhead ≈ 0.75 GB + 5% of weights; 10% global safety margin.
- Load time assumes ~5 GB/s sustained NVMe; power cost at `$0.16/kWh`.
- MoE throughput uses active parameters per token; when a synced MoE model doesn't publish an active‑param count, it's estimated from the routed‑expert fraction.

Not affiliated with any hardware or model vendor.

---

## Roadmap

- Auto‑sync presets on first load (currently button‑triggered to avoid a call per page view).
- Optional CPU spec inputs (cores/AVX) for finer CPU‑path estimates.
- Shareable result permalinks.
- Dockerfile committed to the repo.

---

## License

MIT — see `LICENSE`. (Add a `LICENSE` file before publishing if you want this to be explicit.)
