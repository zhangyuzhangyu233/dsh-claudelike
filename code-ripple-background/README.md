# dsh-coderipple

Seven switchable code-art background presets for the **DeepSeek Harness** Web UI:

- （默认）ambient code field
- 无背景 / none
- DeepSeek whale mark
- whale maid & chibi maid portraits
- rotating 3D globe (continents only, far side translucent)
- scrolling continents

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
