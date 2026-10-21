# dsh-coderipple

Nine switchable code-art background presets for the **DeepSeek Harness** Web UI:

- （默认）ambient code field
- 无背景 / none
- DeepSeek whale mark
- whale maid & chibi maid portraits
- rotating 3D globe (continents only, far side translucent)
- static earth-continent map, centred, without Antarctica

Presets: ambient wind, none, DeepSeek whale, whale maid, chibi maid, 3D globe, earth-continent map,
a rotating computing-pioneers portrait preset (Turing, von Neumann, Shannon; English and Chinese).

All presets share click-ripple dispersion, regional shimmer and live glyph animation.

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
