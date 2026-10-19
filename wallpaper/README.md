# Code Ripple — 动态壁纸

和 DSH 插件里那层「代码风场」同一套实现（Claude 桌面版 landing texture 的复刻）：风把成片字符吹亮，鼠标划过留下一串余温，点击荡开一圈由字符组成的水波。单个 HTML 文件，无依赖、无联网，WebGL2 渲染。

- 文件：[index.html](index.html)
- 尺寸：自适应分辨率与 DPI（格子 6.5 CSS px，最多 2100 万设备像素）
- 性能：空闲约 30fps、涟漪期间 60fps；切到后台自动暂停

## 地球动态壁纸（earth.html）

把插件里的「立体地球」预设单独提取成的壁纸：只有大陆、没有海洋，50m 精度海岸线，球体缓慢自转，背面大陆以低透明度透出；指针划过有暖光余温，点击会把字符组成的球面冲散再重新聚合。单文件、内嵌陆地遮罩，无依赖、无联网。

- 文件：[earth.html](earth.html)
- 安装方式与 `index.html` 相同（Lively / Wallpaper Engine / 浏览器全屏）
- 支持 `theme` / `cell` / `seed` / `auto` / `capture` 参数；地球没有 `look` 参数（大陆轮廓固定）

## 用 Lively Wallpaper（推荐，免费开源）

1. 安装 [Lively Wallpaper](https://github.com/rocksdanister/lively)（Microsoft Store 也有）。
2. 打开 Lively → 左上「+ 添加壁纸」→ 选择「浏览 / Browse」。
3. 选中 `index.html`，给它起个名字（比如 Code Ripple），保存即可。
4. 想让它跟着鼠标互动：在该壁纸的设置里打开输入转发（Lively 里通常叫 *Mouse input / 允许输入*）；不打开也没关系，它会每隔 7–15 秒自己荡一圈涟漪。

## 用 Wallpaper Engine

新建「网页 / Web」类型的壁纸，把 `index.html` 作为入口文件导入即可（需要开启 Web 壁纸支持）。

## Razer Axon（只吃图片/视频的壁纸工具）

Axon 的壁纸是**静态图或视频**，没有网页运行时，所以不能直接把 `index.html` 放进去。做法是先录成一段**无缝循环视频**：

```powershell
pwsh -File .\record.ps1                                  # 录制 80s，裁成 77s 无缝循环，1920x1080
pwsh -File .\record.ps1 -Theme light -Seed 42 -Output .\loop-light.mp4
```

脚本会：用 Edge 的 app 模式打开页面（`?capture=1`，自动隐藏提示）→ 用 ffmpeg 的 gdigrab 抓窗口客户区 → 把尾部交叉淡入头部（`xfade`），得到首尾相接的循环。需要 ffmpeg（脚本自动找 PATH、Free Download Manager 自带的那份等）和 Edge/Chrome。

然后在 Axon 里：**我的壁纸 → 创建 / Create → 从本地文件** → 选生成的 `code-ripple-loop.mp4` → 应用。

注意：视频没有鼠标交互（涟漪是录制时 `auto=1` 自动生成的，每 7–15 秒一次）。想要真正跟手的涟漪，只能用 Lively/网页版；Axon 这条是"会动的画"。

## 只想先看看

双击 `index.html` 用浏览器打开，按 `F11` 全屏。鼠标移动、点击都能触发。

## 可调参数

在地址后面加查询串，例如
`index.html?theme=light&cell=7&seed=1234&auto=0`

| 参数 | 取值 | 默认 | 说明 |
|---|---|---|---|
| `theme` | `dark` / `light` | 自动 | 配色；不传时跟随宿主页面的明暗（DSH / Codex 切主题会实时跟随） |
| `cell` | 4–24 | `6.5` | 格子宽度（CSS px）。越小字越密，越大越疏 |
| `look` | `mixed` / `lettered` / `figured` | `mixed` | 字符轮换序列，决定画面里字符的"性格" |
| `seed` | 任意整数 | 随机 | 固定风向、速度、阵风尺寸，用来复现某一帧的气质 |
| `auto` | `1` / `0` | `1` | 是否在无人操作时自动生成涟漪 |
| `capture` | `1` / `0` | `0` | 录制模式：隐藏提示文字，配合 `record.ps1` 使用 |

Lively 里给壁纸地址加参数：在壁纸属性里选择「网页地址」并填入 `file:///…/index.html?theme=light`。

## 说明

- 需要 WebGL2 与硬件加速；如果系统只提供软件渲染（SwiftShader 之类），页面会显示 `WebGL2 unavailable`，这时请在浏览器/Lively 设置里打开 GPU 加速。
- 背景色写在 `body` 上（深色 `#0c0d11` / 浅色 `#f6f6f3`），如果想让桌面图标区域更安静，可以自行改 `style` 里的 `background`。
- 屏幕左上角会出现一行 `click · move` 提示，9 秒后淡出；不需要的话删掉 `<div id="hint">` 即可。
