# dsh-coderipple

Ten switchable code-art background presets for the **DeepSeek Harness** Web UI:

- 主机纽带 console-style wavy code ribbons (default)
- Claude ambient code field (the original default)
- 无背景 / none
- DeepSeek whale mark
- whale maid & chibi maid portraits
- rotating 3D globe (continents only, far side translucent)
- static earth-continent map, centred, without Antarctica

Presets: 主机纽带 console ribbons (default; task-aware flow), Claude ambient wind, none, DeepSeek whale,
whale maid, chibi maid, 3D globe, earth-continent map, and a rotating computing-pioneers portrait
preset (Turing, von Neumann, Shannon; English and Chinese).

All presets share click-ripple dispersion, regional shimmer and live glyph animation.

The console-style preset's ribbons drift at a periodic, randomly varying speed and follow the
Harness' live output rate: streamed tokens/second drive the speed (up to 14x), so a turn that is
still thinking or running tools does not speed them up; when the task finishes they coast down,
flatten, then resume drifting a few seconds later. The glyph flicker and click ripples keep their
own cadence. When the agent needs the user (approval / question) the ribbons breathe a warm
amber instead of blue, a failed turn flashes a short red pulse, and the fastest flows get a slightly
calmer wave amplitude so speed never turns into visual noise.

## Install

```bash
npm install dsh-coderipple
dsh plugin --profile desktop add dsh-coderipple
```

Or add to the profile patch:

```yaml
- insert:
    - id: code-ripple-background
      name: dsh-coderipple
```

Then restart/refresh DeepSeek Harness and pick a preset in Settings → General.

## Links

- Source & docs: https://github.com/zhangyuzhangyu233/dsh-coderipple
- License: MIT
