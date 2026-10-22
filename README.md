<div align="center">
  <img src="docs/banner.png" alt="Code Ripple" width="100%" />
</div>

# dsh-coderipple

> **让会话背景，成为一整套可切换的代码艺术。**

曾经，它是 Claude 桌面端那一整片会呼吸的代码；现在，它可以是 DeepSeek 的鲸鱼、系着围裙的鲸鱼女仆、一颗缓缓自转的立体地球、横向流动的大陆、会轮播的「计算先驱」代码肖像、主机纽带的 PS4 式波浪，或者干脆什么都没有。

全部由等宽代码字符实时拼成：跟着桌面一起呼吸，也会被你的鼠标点击打散，再在 1–2 秒内重新聚合。纯 WebGL2 实时计算，不是贴图，没有任何网络请求。

[![npm](https://img.shields.io/npm/v/dsh-coderipple)](https://www.npmjs.com/package/dsh-coderipple)
[![MIT](https://img.shields.io/badge/license-MIT-3fbf7f)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/zhangyuzhangyu233/dsh-coderipple)](https://github.com/zhangyuzhangyu233/dsh-coderipple/releases)


## 演示

![立体地球 · 点击涟漪冲散大陆](docs/screenshots/presets-globe.gif)

> 真实录屏（GIF 已压缩）：立体地球自转、大陆轮廓与明暗、背面大陆以低透明度透出，以及点击后涟漪把画面冲散、再重新聚合的过程。


## v3.3.2：会话内只保留肖像

- 图灵两个预设在**空会话（hero）**页显示完整的纯字符画：名言 + 姓名 + 生卒 + 右下角肖像；
- 进入**会话**后自动裁掉文字部分，只保留右下角的 ASCII 肖像（同一张遮罩裁切，不额外增加资源）；
- 全程仍是纯字符画，没有真实文字层；亮度固定、点击涟漪不变。

## 最新更新 · v3.7.0：主机纽带成为默认皮肤 —— PS4 Flow 的深海光带，接上 AI 的输出速度

- **默认皮肤切换**：「主机纽带」现在默认用于新会话与工作会话；原默认的 Claude 风场预设改名为 **Claude**，仍可在 Settings 里随时切回。
- **灵感来自 PS4 系统界面的流动背景**：深蓝底色上缓慢漂移的浅蓝光带，是 PS4 主界面最标志性的视觉语言。索尼甚至为这套被称为 **Flow** 的背景图形提交过注册保护（[DualShockers](https://www.dualshockers.com/sony-trademarks-the-ps4s-background-flow-graphics-no-really/)、[PLAY3](https://www.play3.de/2014/12/28/sony-meldet-patent-fur-den-playstation-hintergrund-flow-an/)）；Sony 介绍 PS4 UI 时强调的关键词是「无缝、信息自然浮现、即刻可读」（[PlayStation.Blog · PS4 UI](https://blog.playstation.com/2013/09/02/ps4-ui-and-social-features-shuhei-yoshida-on-ease-of-use/)）。我们保留这种「环境感」，再接上 AI 才有的东西。
- **AI 特性：流速 = 输出速度**。纽带不再固定循环：它读取会话里实时流式写入的 token（估算约 40 tok/s 到达 14× 封顶），输出越快，光带走得越快——像模型在快速转动思维；只在思考、跑工具、等待的时候，它不会空转加速。
- **任务生命周期有了形状**：任务结束先自然滑行减速约 2.8 秒，再用 1.8 秒收平成三条直线，保持约 2.2 秒，最后用 3 秒慢慢恢复飘动。
- **人类状态也看得见**：等你确认 / 回答时，光带转成暖琥珀色缓慢呼吸；某一轮失败时给一个约 4 秒的红色脉冲。
- **高速不晃眼**：流速越高波幅越收敛（最多 28%），并在流动期间自动切到 60fps。

## v3.6.0：主机纽带 —— PS4 式光带（原生风场）

- 新增预设 **「主机纽带」**：PS4 风格的三叠半透明 CD 光带，全部由代码字符绘制；
- **直接跑在插件自己的 Claude 逆向引擎上**：光带只是一个新的风场分支，点击/移动的 `tapsAt` / `warmthAt` 触摸层原样生效，涟漪不再另行实现；
- 点击时字符被推开、按噪声冲散孔洞、环上提亮，随后复原；
- 灰白字符沿用主题墨色，和之前几个皮肤一致；无新增图片素材，纯着色器生成；
- **默认皮肤（本地改动）**：「主机纽带」现在是新会话 / 工作会话的默认背景；原来的 Claude 风场预设改名为「Claude」，不再占用默认位。
- **流动速度与任务联动（本地改动，未发布）**：平时流速 = 周期性慢涌（18–36 秒）+ 平滑随机漂移，范围 0.12×–3.4×；任务运行时流速由**实时输出速度（tokens/s）**决定——读取会话里流式写入的字符估算（约 2.4 字符/token），约 40 tok/s 达到 14×，所以在只是思考或跑工具、没有 token 输出时不会加速；任务结束后先自然滑行减速约 2.8 秒，再用 1.8 秒收平、保持约 2.2 秒，最后用 3 秒慢慢恢复飘动；字符闪烁与涟漪节奏不受影响。
- **状态语义（本地改动，未发布）**：等待你确认 / 回答时，纽带转为暖琥珀色慢呼吸（约 3 秒一次呼吸）；某一轮失败时给一个约 4 秒的红色脉冲，然后回到正常墨色；流速越高波幅会自动收一点（最高收 28%），快但不晃。

## v3.5.1：轮播跨阶段同步

- 修复：在新会话 / 工作会话之间切换时，「计算先驱」轮播不再从图灵重新开始，索引与计时保持连续；
- 中英文两个版本共享同一个轮播进度；面板尺寸变化也不会重置轮播。

## 最新更新 · v3.5.0：计算先驱（图灵 / 冯·诺伊曼 / 香农，轮播）

- 把图灵、冯·诺伊曼和**克劳德·香农**整合成一个新背景 **「计算先驱」**（英文）与 **「计算先驱（中文）」**；
- 每 11 秒轮播一位：切换采用**纯渐隐 + 轻微缩放**——旧肖像淡出 320ms 并放大到约 1.06，在最暗处换人，新肖像从 1.06 缩回 1 并淡入 380ms；没有位移、穿孔或涟漪；
- 从新会话界面进入对话时**不会重置轮播**：保留当前人物与计时，只切换文字/肖像裁切，继续往下轮播；
- 每位都是一套完整的纯代码字符画：右下角肖像 + 左侧名言 / 姓名 / 生卒，亮度固定；
- 空会话显示完整排版，进入会话自动只保留肖像；原有单独图灵 / 诺伊曼预设会迁移到新预设。

> **谨以此版，致敬三位奠定现代计算与信息时代的先驱。**
>
> **艾伦·麦席森·图灵**（1912–1954）以可计算性与图灵机回答了"什么是可计算"；
> **约翰·冯·诺伊曼**（1903–1957）以存储程序体系结构回答了"机器如何组织"；
> **克劳德·香农**（1916–2001）以信息论回答了"信息如何度量"。
> 三位相隔不过数十年，却共同铺出了今天计算机与人工智能的道路。
>
> 代码字符会轮换，敬意不会。

## v3.3.1：回滚双层文字方案，恢复纯字符画排版

- v3.3.0 尝试了「底层 ASCII + 上层纯文字」的分层方案，实际观感与整体字符画风格不协调；
- 本版**回滚到 v3.2.0 的纯字符画排版**：名言、姓名、生卒都烘焙在图灵遮罩里，由代码字符表现；
- 保留 v3.2.0 的构图（头像贴右下角）与亮度固定 + 点击涟漪。

## v3.2.0：艾伦·图灵 —— 致敬计算机科学之父、人工智能之父

- 新增两个代码肖像预设：**「艾伦·图灵」**（英文）与 **「艾伦·图灵（中文）」**；
- 头像贴面板右下角，左侧依次是名言、姓名、生卒：
  - 英文：*We can only see a short distance ahead, but we can see plenty there that needs to be done.* / ALAN MATHISON TURING / 1912 - 1954
  - 中文：我们只能看到前方很短的一段距离，但能看到大量需要完成的工作。/ 艾伦 麦席森 图灵 / 1912 - 1954
- 两个版本都是纯代码字符画：肖像与文字都由字符亮度拼成，亮度固定，只有字符本身实时变换；点击涟漪仍会把肖像冲散再重组；
- 肖像来自公有领域的 1951 年图灵照片（Wikimedia Commons）。

> 谨以此更新致敬**计算机科学之父、人工智能之父**艾伦·麦席森·图灵（1912–1954）。

## v3.1.0：地球大陆（定格）+ 地球动态壁纸

- **「大陆横移」更名为「地球大陆」**：不再横向滚动，地图定格居中；所有大陆撑满面板，**南极洲裁掉**（切在合恩角以南），剩余约 147° 纬度铺满高度；
- 交错高亮升级：缓慢漂移的噪声斑块 + 斜向行波，不同大陆区域轮流亮起，地图本身完全静止；
- 缩放：地图高度 = 面板高度、宽高保持 2:1，水平以本初子午线居中；
- 点击涟漪、指针余温照旧，会把字符大陆冲散再重组；
- 新增 **`wallpaper/earth.html`**：把「立体地球」预设提取成单文件动态壁纸（自转、背面大陆半透明、字符涟漪），支持 Lively / Wallpaper Engine / 浏览器全屏。

## v2.9.1：立体地球支持背面大陆透出

- 立体地球现在是一个「半透明球体」：正面大陆正常点亮，**背面大陆以 0.25 的透明度透出**，随球体一起转动；
- 下方是 v2.9.0 的 7 种预设总览。

背景不再是固定效果，而是一套可切换的**代码艺术预设**。设置 → 通用里有两个独立下拉：

- **新会话背景**（Hero 页）
- **工作会话背景**（打开对话后）

两边都可以选以下任一预设：

| 预设 | 效果 |
|---|---|
| **Claude** | 原版 Claude 桌面端流动代码风场（原默认皮肤），字符随时间呼吸、指针余温、点击涟漪 |
| **无背景** | 整个背景层隐藏，只剩原生界面 |
| **DeepSeek 鲸鱼** | 官方鲸鱼矢量标，由代码字符拼成，居中、固定 |
| **鲸鱼女仆** | 灰度细节代码肖像：面板高 1.9 倍、围裙小鲸鱼兜子正好压在底边框 |
| **Q版鲸鱼女仆** | Q 版细节肖像，居中、高度占满面板 |
| **立体地球** | 真正的 3D 球体自转，只显示大陆（无海洋），50m 精度海岸线；正面大陆实亮，背面大陆以低透明度透出 |
| **主机纽带（默认）** | PS4 Flow 风格的代码光带：流速跟随 token/s、任务中狂飙、结束收平再苏醒；等待审批转暖色呼吸、出错红脉冲 |
| **地球大陆** | 平面世界地图定格居中，所有大陆撑满面板、不含南极洲；区域交错高亮 |
| **计算先驱** | 图灵 / 冯·诺伊曼 / 香农轮播，每 11 秒切换一次，用点击涟漪过渡；英文名言 + 姓名 + 生卒 |
| **计算先驱（中文）** | 同上中文版：中文名言 + 姓名 + 生卒，纯代码字符画 |

所有预设共享同一套交互：

- **区域交错高亮**：不同区域轮流变亮变暗（鲸鱼/女仆/地球）；
- **字符实时变动**：代码字符持续滚动换字；
- **点击涟漪**：鼠标点击处把画面冲散、穿孔、增亮，1–2 秒内自动还原；
- **只覆盖会话面板**、不加压暗蒙版；
- 不再覆盖输入框/标题栏的 sticky 定位（滚动不再拖走输入框）。

升级方式：更新 `code-ripple-background/` 后刷新 DSH 页面（或重启）即可。

## 两个形态，同一套引擎

| 目录 | 是什么 |
|---|---|
| [`code-ripple-background/`](code-ripple-background) | **DeepSeek Harness Web UI 插件**。装在 DSH 里，只铺满主会话面板且保持明显 |
| [`wallpaper/`](wallpaper) | **独立壁纸**：单文件 HTML，可直接在浏览器 / Lively 使用，也能录成无缝循环视频喂给 Razer Axon 这类只吃视频的壁纸工具 |

## 亮点

- **实时风场**：阵风、细流、大尺度涌浪三层噪声叠加，光带真的在走，不是循环动画。
- **字符会变**：每个格子有自己的字符序列和节奏，涟漪经过时加速翻滚——所以你看到的是「字符组成的波」，不是一圈光。
- **跟手的余温**：指针留下一串有时间衰减的暖点，字符被逐个点亮，停手后慢慢凉下去。
- **会话面板专属**：背景只存在于主会话列，侧栏、顶栏、底栏和右侧面板都干净。
- **明显的动态背景**：不叠加任何压暗蒙版，字符纹理全程清晰可见。
- **两种主题**：自动跟随 DSH 的明暗配色；壁纸版可用 `?theme=` 指定。
- **无订阅、无联网、无遥测**：纯前端 Canvas/WebGL2，复制一个文件夹就能跑。
- **10 种预设**：主机纽带（默认） / Claude / 无背景 / 鲸鱼 / 鲸鱼女仆 / Q版女仆 / 立体地球 / 地球大陆 / 计算先驱 / 计算先驱（中文），新会话与工作会话可分别设置。

## 一、DSH 插件

`code-ripple-background/` 是一个标准的 Cordis bundle（`dsh.bundle.patch` + `./client`），不依赖任何第三方运行时。

### 方式一：从 npm 安装（推荐）

```bash
npm install dsh-coderipple
# 或直接在 DSH 里：
dsh plugin --profile desktop add dsh-coderipple
```

### 方式二：本地目录安装

1. 把 `code-ripple-background/` 放到磁盘任意位置；
2. 在 DSH 的插件管理里「从本地目录安装」，或直接调用 Harness 的 `plugin_manager` 工具：

```text
install_bundle  target = <绝对路径>/code-ripple-background
```

3. 刷新页面。插件条目名为 **代码涟漪背景 / Code Ripple Background**，可以随时禁用。

实现要点：

- 整层挂在 `shell.overlay`，再挂进会话列 `centerCol`，`pointer-events: none`，不挡任何交互；
- 渲染分两趟：① 风场写进 `cols × rows*2` 的 RGBA8 缓冲；② 每个格子 6 个顶点（`gl_VertexID`）从字符图集里取字，按风场逐像素受光；
- 字符集是可打印 ASCII + `·`，16×6 图集；每个格子按种子轮流换字，涟漪经过时额外推进；
- 背景不加任何压暗遮罩，字符层以接近满强度（约 0.96）渲染，保持明显；
- 「第 3 次点击是心形」是沿用的彩蛋。

## 二、独立壁纸

```text
wallpaper/index.html        # 代码风场壁纸：单文件，无依赖、无联网
wallpaper/earth.html        # 立体地球壁纸：代码字符组成的地球自转，单文件、内嵌陆地遮罩
wallpaper/world.html        # 世界时钟壁纸：代码字符组成的大陆按当地白天/夜晚点亮
wallpaper/ps4.html          # PS4 光带 · 代码灰白（蓝色点击涟漪）
wallpaper/ps4-blue.html     # PS4 光带 · 经典蓝（白色点击涟漪）
wallpaper/ps4-paper.html    # PS4 光带 · 纸白（蓝色点击涟漪）
wallpaper/host-tie.html     # 主机纽带壁纸：从插件「主机纽带」预设直接提取，单文件、无依赖
wallpaper/host-tie-blue.html # 主机纽带 · PS4 版：蓝渐变光带 + 周期与随机结合的流速
```

- **浏览器**：双击打开，`F11` 全屏；
- **Lively Wallpaper**：添加壁纸 → 浏览 → 选 `index.html`、`earth.html`、`host-tie.html`、`host-tie-blue.html` 或对应的 `ps4*.html`；
- **Wallpaper Engine**：新建「网页」类型壁纸，入口选上述任一文件；
- **Razer Axon / 只吃视频的工具**：先录成无缝循环视频

```powershell
pwsh -File wallpaper/record.ps1                 # 1920x1080，约 77 秒无缝循环
pwsh -File wallpaper/record.ps1 -Theme light -Seed 42
```

`record.ps1` 会用 Edge 的 kiosk 模式打开页面、用 ffmpeg 的 `gdigrab` 抓屏，再把尾部交叉淡入头部（`xfade`），得到首尾相接的循环。需要 ffmpeg（脚本会自动找 PATH 或常见安装位置）和 Edge/Chrome。

### 可调参数

在地址后加查询串，例如 `index.html?theme=light&cell=7&seed=1234`：

| 参数 | 取值 | 默认 | 说明 |
|---|---|---|---|
| `theme` | `dark` / `light` | `dark` | 配色 |
| `cell` | 4–24 | `6.5` | 格子宽度（CSS px），越小字越密 |
| `look` | `mixed` / `lettered` / `figured` | `mixed` | 字符轮换序列 |
| `seed` | 任意整数 | 随机 | 固定风向/风速/阵风尺寸，复现同一种气质 |
| `auto` | `1` / `0` | `1` | 无人操作时是否自动生成涟漪 |
| `capture` | `1` / `0` | `0` | 录制模式：隐藏提示文字，配合 `record.ps1` |

## 路线图：自定义素材（计划中）

预设只是起点。接下来会把背景系统开放为「**可导入素材**」：

- **静态素材**：立绘、人像、Logo、梗图……自动抠图后转成代码字符画；
- **动态素材**：循环视频 / 序列帧，让素材真正「动」在背景里；
- **内置调节**：字符密度、亮度与对比、区域高亮、涟漪强度；
- **每个会话独立设置**：像主题一样保存、切换与分享。

你可以把任何角色带进来——比如让 **蔡徐坤** 的循环在会话背后跳动，或者让 **时雨羽衣** 的立绘以代码字符的形式站在输入框后面。无论静态还是动态，都只是素材的一种。

> 以上为路线图，具体能力会随版本推进；欢迎 issue / PR 讨论你最想导入的素材。

## 源码与构建（TypeScript）

插件源码已经用 TypeScript 重写，仓库里的 `client.js` / `index.js` 是构建产物（仍然零运行时依赖、单文件加载）：

| 路径 | 内容 |
|---|---|
| `src/client.ts` | Web UI 插件主逻辑（类型化：预设、地球、涟漪、渲染器） |
| `src/host.ts` | Host 半，`apply()` 空实现 |
| `src/types.ts` | DSH 上下文、Layer、预设等类型 |
| `assets/*.b64` | 陆地遮罩、鲸鱼女仆 / Q版细节图、计算先驱肖像遮罩、鲸鱼矢量路径（构建时内联为 data URL） |
| `scripts/build.mjs` | esbuild 打包脚本，生成 `client.js` 与 `index.js` |

```bash
cd code-ripple-background
pnpm install
pnpm build      # 生成 client.js / index.js
pnpm typecheck  # tsc 类型检查
```

## 名称与分发

- 官方发布渠道：GitHub 仓库 [`zhangyuzhangyu233/dsh-coderipple`](https://github.com/zhangyuzhangyu233/dsh-coderipple) 与 npm 包 **`dsh-coderipple`**；
- 代码以 MIT 授权，欢迎 fork / PR，但请使用**不同的包名与仓库名**，不要以本项目名义发布；
- npm 包附带 provenance（来源证明）工作流，发布版本可追溯到本仓库的 commit。

## 环境要求

- 需要 **WebGL2** 与硬件加速；软件渲染（SwiftShader 之类）会被跳过；
- 插件面向 DSH Web UI；壁纸 HTML 在任何现代浏览器可用；
- `record.ps1` 只支持 Windows（PowerShell + Edge/Chrome + ffmpeg）。

## 许可

[MIT](LICENSE)。

## 关于出处

视觉语言参考了 Claude 桌面版落地页的「代码纹理」效果。这里的实现是独立重写的：没有包含、复制或分发任何 Anthropic 的代码或资源，本项目与 Anthropic 无关联、未获其背书。

---

**English** — A wind-lit field of drifting code characters: a WebGL2 plugin for the DeepSeek Harness Web UI, confined to the main conversation panel and kept clearly visible, plus seven switchable code-art background presets (ambient field, DeepSeek whale mark, maid portraits, a rotating 3D globe and scrolling continents) and a standalone single-file live wallpaper with a seamless-video recorder. The roadmap opens the background up to custom static and animated material imports. MIT licensed. The visual language is inspired by the Claude desktop landing texture; this is an independent reimplementation with no Anthropic code or assets included, and no affiliation.
