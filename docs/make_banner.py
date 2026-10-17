"""Generate the promo banner (docs/banner.png) with PIL, no external assets."""

import math
import random
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
random.seed(7)

FONT_CODE = r"C:\Windows\Fonts\consola.ttf"
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"

img = Image.new("RGB", (W, H), (5, 7, 12))

# ---------------------------------------------------------------- code field
layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
code_font = ImageFont.truetype(FONT_CODE, 13)
chars = "abcdefghijklmnopqrstuvwxyz0123456789{}()[]<>=+-*/%&|^!~?:;.,'\"_#@$"

for y in range(0, H, 16):
    for x in range(0, W, 9):
        u = x / W
        v = y / H
        gust = math.sin((x * 0.011 - y * 0.019) + 2.0 * math.sin(x * 0.005 + 0.7))
        swell = math.cos((x * 0.0022 + y * 0.0035) + 1.1)
        b = max(0.0, min(1.0, 0.5 + 0.5 * gust * 0.7 + 0.25 * swell))
        if random.random() > 0.45 + 0.5 * b:
            continue
        alpha = int(10 + 165 * (b ** 2.1))
        d.text((x, y), random.choice(chars), font=code_font, fill=(150, 182, 224, alpha))

# ------------------------------------------------------------- left scrim
scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(scrim)
for x in range(W):
    a = int(238 * max(0.0, 1.0 - x / 720.0))
    sd.line([(x, 0), (x, H)], fill=(3, 4, 7, a))

# --------------------------------------------------------------- accent arcs
arcs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ad = ImageDraw.Draw(arcs)
cx, cy = 1024, 318
for radius, width, alpha in ((96, 1, 46), (168, 1, 30), (244, 1, 18), (330, 1, 10)):
    ad.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
               outline=(96, 172, 255, alpha), width=width)
ad.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(120, 190, 255, 120))

base = Image.alpha_composite(img.convert("RGBA"), layer)
base = Image.alpha_composite(base, scrim)
base = Image.alpha_composite(base, arcs)
draw = ImageDraw.Draw(base)

# -------------------------------------------------------------------- text
title_font = ImageFont.truetype(FONT_BOLD, 72)
sub_font = ImageFont.truetype(FONT_CJK_BOLD, 30)
tag_font = ImageFont.truetype(FONT_CJK, 17)
chip_font = ImageFont.truetype(FONT_CJK, 15)

x0 = 76

# title with a little letter spacing
title = "CODE RIPPLE"
tracking = 3
tx = x0
for ch in title:
    draw.text((tx, 176), ch, font=title_font, fill=(236, 243, 255))
    tx += draw.textlength(ch, font=title_font) + tracking

draw.text((x0 + 2, 286), "代 码 涟 漪", font=sub_font, fill=(158, 196, 245))

sub2 = ImageFont.truetype(FONT_CJK, 22)
draw.text((x0 + 2, 334), "让 DSH 拥有一片会呼吸的代码背景", font=sub2, fill=(150, 170, 198))

meta = "DeepSeek Harness 插件  ·  独立壁纸  ·  WebGL2  ·  MIT"
draw.text((x0 + 2, 392), meta, font=tag_font, fill=(110, 130, 158))

# chip
chip = "无需订阅  ·  无需联网  ·  单文件"
cw = draw.textlength(chip, font=chip_font)
draw.rounded_rectangle([x0, 438, x0 + cw + 40, 480], radius=21,
                       fill=(42, 86, 150, 200), outline=(90, 160, 240, 120), width=1)
draw.text((x0 + 20, 448), chip, font=chip_font, fill=(205, 226, 255))

# footer path
foot = ImageFont.truetype(FONT_CODE, 13)
draw.text((x0 + 2, 556), "github.com/zhangyuzhangyu233/dsh-claudelike", font=foot, fill=(86, 104, 130))

base.convert("RGB").save(r"C:\Users\zy134\Desktop\dsh-claudelike\docs\banner.png", optimize=True)
print("banner written")
