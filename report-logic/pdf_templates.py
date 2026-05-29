# pdf_templates.py — Professional Agricultural PDF Report (A4)
# v6: Removed green boxes, removed field data summary table, removed NDVI by field location chart,
# uniform image sizes for all 7 images

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether, Flowable, Image as RLImage,
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import Dict, List, Optional
import re, io, base64, urllib.request, os

# ── Fonts: register Times New Roman variants ──────────────────────────────────
TNR   = "Times-Roman"
TNR_B = "Times-Bold"
TNR_I = "Times-Italic"
TNR_BI= "Times-BoldItalic"

# ── Palette ───────────────────────────────────────────────────────────────────
class C:
    GD   = colors.HexColor("#1B4D1E")
    G    = colors.HexColor("#2D6A2F")
    GM   = colors.HexColor("#3B7D3E")
    GL   = colors.HexColor("#D6EDDA")
    GP   = colors.HexColor("#EEF7EE")
    GB   = colors.HexColor("#AACFAC")
    AM   = colors.HexColor("#B07A12")
    RE   = colors.HexColor("#BF3B2B")
    BL   = colors.HexColor("#1F6FA3")
    INK  = colors.HexColor("#1A1A1A")
    BODY = colors.HexColor("#2C2C2C")
    MUT  = colors.HexColor("#555555")
    HIN  = colors.HexColor("#888888")
    BOR  = colors.HexColor("#BBBBBB")
    STR  = colors.HexColor("#F7F7F7")
    W    = colors.white
    BK   = colors.black

# ── Layout ────────────────────────────────────────────────────────────────────
PW, PH = A4                 # 210 × 297 mm
PAGE_BORDER = 8 * mm        # page border rectangle inset from edge
ML = 20 * mm                # content left margin
MR = 20 * mm
BANNER_H  = 36 * mm         # first-page banner height
TOP_PAD   = 10 * mm
BOT_PAD   = 14 * mm
CW = PW - ML - MR           # ≈ 170 mm usable width
LS = 1.5

# ── Helpers ───────────────────────────────────────────────────────────────────
def _clean(t):
    if not t: return ""
    t = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', t)
    t = re.sub(r'^\s*\d+\.\s+', '', t, flags=re.MULTILINE)
    t = re.sub(r'^\s*[-•*]\s+', '', t, flags=re.MULTILINE)
    t = re.sub(r':\s*$', '', t.strip())
    return t.strip()

def _ci(t):
    if not t: return ""
    t = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', t)
    t = re.sub(r'^\s*\d+\.\s+', '', t)
    t = re.sub(r'^\s*[-•*]\s+', '', t)
    return t.strip()

def _clamp(v, lo=0.0, hi=100.0):
    try: return max(lo, min(hi, float(v)))
    except: return 0.0

def _fv(v, d=1):
    try: return f"{float(v):.{d}f}" if v is not None else "—"
    except: return "—"

def _ndvi_color(v):
    if v is None: return C.MUT
    return C.G if v >= 0.5 else C.AM if v >= 0.3 else C.RE

def _score_color(v):
    if v is None: return C.MUT
    return C.G if v >= 70 else C.AM if v >= 50 else C.RE

def _fetch_image(url_or_b64: str) -> Optional[io.BytesIO]:
    if not url_or_b64: return None
    try:
        if url_or_b64.startswith("data:"):
            _, data = url_or_b64.split(",", 1)
            return io.BytesIO(base64.b64decode(data))
        elif url_or_b64.startswith("http"):
            req = urllib.request.Request(url_or_b64, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                return io.BytesIO(r.read())
    except Exception as e:
        print(f"  ⚠ image fetch: {e}")
    return None

def _ndvi_interp(v: float) -> str:
    if v >= 0.7: return "Very dense healthy canopy"
    if v >= 0.5: return "Healthy vegetation"
    if v >= 0.4: return "Moderate vegetation"
    if v >= 0.3: return "Sparse / moderate stress"
    if v >= 0.1: return "Very sparse / stressed"
    return "Bare soil or severe stress"

# ── Styles (Times New Roman, 1.5 line spacing) ────────────────────────────────
def _S():
    fs  = 10
    lead = round(fs * LS * 1.15)

    def mk(nm, fn=TNR, sz=None, ld=None, col=None, **kw):
        sz = sz or fs
        ld = ld or round(sz * LS * 1.15)
        col = col or C.BODY
        return ParagraphStyle(nm, fontName=fn, fontSize=sz, leading=ld,
                              textColor=col, **kw)
    return {
        "bj":    mk("bj",  alignment=TA_JUSTIFY, spaceAfter=3),
        "b":     mk("b",   spaceAfter=3),
        "h1":    mk("h1",  fn=TNR_B, sz=14, col=C.GD, spaceBefore=4, spaceAfter=6),
        "h2":    mk("h2",  fn=TNR_B, sz=12, col=C.GD, spaceBefore=6, spaceAfter=4),
        "h3":    mk("h3",  fn=TNR_B, sz=10.5, col=C.G, spaceBefore=4, spaceAfter=3),
        "bul":   mk("bul", leftIndent=12, spaceAfter=3),
        "cap":   mk("cap", fn=TNR_I, sz=8, col=C.MUT, alignment=TA_CENTER, spaceAfter=4),
        "lbl":   mk("lbl", fn=TNR,   sz=7.5, col=C.MUT),
        "val":   mk("val", fn=TNR_B, sz=12,  col=C.INK),
        "exp_h": mk("exph",fn=TNR_B, sz=9,   col=C.GD, spaceAfter=2),
        "exp":   mk("exp", fn=TNR,   sz=8.5, col=C.BODY, spaceAfter=2),
        "tblhd": mk("th",  fn=TNR_B, sz=8.5, col=C.W, alignment=TA_CENTER),
        "tblcl": mk("td",  fn=TNR,   sz=8.5, col=C.BODY),
    }

# ── Table Style ───────────────────────────────────────────────────────────────
def _TS(hc=None):
    hc = hc or C.G
    return TableStyle([
        ("BACKGROUND",    (0,0), (-1, 0), hc),
        ("TEXTCOLOR",     (0,0), (-1, 0), C.W),
        ("FONTNAME",      (0,0), (-1, 0), TNR_B),
        ("FONTSIZE",      (0,0), (-1, 0), 8.5),
        ("ALIGN",         (0,0), (-1, 0), "CENTER"),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [C.W, C.STR]),
        ("FONTNAME",      (0,1), (-1,-1), TNR),
        ("FONTSIZE",      (0,1), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,1), (-1,-1), C.BODY),
        ("ALIGN",         (0,1), (-1,-1), "CENTER"),
        ("ALIGN",         (0,1), ( 0,-1), "LEFT"),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("BOX",           (0,0), (-1,-1), 1.0, C.BK),
        ("LINEBELOW",     (0,0), (-1, 0), 1.5, C.GD),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, C.BOR),
    ])

# ── Custom Flowables (No background colors) ──────────────────────────────────

class NumberedSection(Flowable):
    """Numbered section header - no background, just text with number"""
    H = 8 * mm
    def __init__(self, number, title, sub="", w=CW):
        super().__init__()
        self.number = number
        self.title = title
        self.sub = sub
        self.width = w
        self.height = self.H
    def draw(self):
        c, w, h = self.canv, self.width, self.height
        c.setFillColor(C.GD)
        c.setFont(TNR_B, 12)
        display_title = f"{self.number}  {self.title}"
        c.drawString(0, h/2 - 3, display_title)
        if self.sub:
            c.setFillColor(C.MUT)
            c.setFont(TNR_I, 8)
            c.drawString(0, 2, self.sub)

class KPICard(Flowable):
    """KPI card: black border, colour top bar, Times font."""
    def __init__(self, label, value, unit="", color=None, w=32*mm, h=28*mm):
        super().__init__()
        self.label = label
        self.value = str(value)
        self.unit = unit
        self.color = color or C.G
        self.width = w
        self.height = h
    def draw(self):
        c, w, h = self.canv, self.width, self.height
        c.setFillColor(C.W)
        c.setStrokeColor(C.BK)
        c.setLineWidth(0.8)
        c.roundRect(0, 0, w, h, 3, fill=1, stroke=1)
        c.setFillColor(self.color)
        c.setStrokeColor(self.color)
        c.roundRect(0, h-5, w, 5, 2, fill=1, stroke=0)
        c.setFillColor(C.MUT)
        c.setFont(TNR_I, 6.5)
        c.drawCentredString(w/2, h-11.5, self.label.upper())
        c.setStrokeColor(C.BOR)
        c.setLineWidth(0.4)
        c.line(5, h-14, w-5, h-14)
        c.setFillColor(self.color)
        c.setFont(TNR_B, 17)
        c.drawCentredString(w/2, h/2 - 5, self.value)
        if self.unit:
            c.setFillColor(C.HIN)
            c.setFont(TNR_I, 6.5)
            c.drawCentredString(w/2, 6, self.unit)

class HBar(Flowable):
    """Labelled horizontal progress bar — black outline, coloured fill."""
    H = 9 * mm
    def __init__(self, label, value, maxv=100, color=None, w=CW):
        super().__init__()
        self.label = label
        self.value = _clamp(value, 0, maxv)
        self.maxv = float(maxv) or 1
        self.color = color or C.G
        self.width = w
        self.height = self.H
    def draw(self):
        c, w, h = self.canv, self.width, self.height
        LW = 50*mm
        VW = 14*mm
        BW = w - LW - VW - 4*mm
        pct = self.value / self.maxv
        c.setFillColor(C.BODY)
        c.setFont(TNR, 9)
        c.drawString(0, h/2 - 3, self.label)
        bx = LW + 2*mm
        by = h/2 - 3.5
        c.setFillColor(C.STR)
        c.setStrokeColor(C.BK)
        c.setLineWidth(0.6)
        c.roundRect(bx, by, BW, 7, 3, fill=1, stroke=1)
        if pct > 0:
            c.setFillColor(self.color)
            c.setStrokeColor(self.color)
            c.roundRect(bx, by, max(7, BW*pct), 7, 3, fill=1, stroke=0)
        c.setFillColor(self.color)
        c.setFont(TNR_B, 9)
        c.drawRightString(w, h/2 - 3.5, f"{self.value:.1f}")

class ColorBox(Flowable):
    """Image placeholder box."""
    def __init__(self, w, h, label=""):
        super().__init__()
        self.width = w
        self.height = h
        self.label = label
    def draw(self):
        c = self.canv
        c.setFillColor(C.STR)
        c.setStrokeColor(C.BK)
        c.setLineWidth(0.6)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=1)
        if self.label:
            c.setFillColor(C.MUT)
            c.setFont(TNR_I, 7.5)
            c.drawCentredString(self.width/2, self.height/2-3, self.label)

# ── Charts ────────────────────────────────────────────────────────────────────
def _bar_chart(records, w=CW, h=60*mm):
    items = [r for r in records if r.get("mean_ndvi") is not None][:14]
    if not items:
        return ColorBox(w, h, "No NDVI data")
    labels = [(r.get("place_name") or f"F{r.get('analysis_id','?')}")[:12] for r in items]
    vals   = [float(r["mean_ndvi"]) for r in items]
    d = Drawing(w, h)
    bc = VerticalBarChart()
    bc.x = 28
    bc.y = 22
    bc.width = w-36
    bc.height = h-32
    bc.data = [vals]
    bc.strokeColor = None
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = 1.0
    bc.valueAxis.valueStep = 0.2
    bc.valueAxis.labelTextFormat = "%.1f"
    bc.valueAxis.labels.fontName = TNR
    bc.valueAxis.labels.fontSize = 7
    bc.valueAxis.labels.fillColor = C.MUT
    bc.valueAxis.gridStrokeColor = C.BOR
    bc.valueAxis.gridStrokeWidth = 0.4
    bc.categoryAxis.categoryNames = labels
    bc.categoryAxis.labels.fontName = TNR
    bc.categoryAxis.labels.fontSize = 7
    bc.categoryAxis.labels.fillColor = C.MUT
    bc.categoryAxis.labels.angle = 25 if len(labels) > 5 else 0
    bc.categoryAxis.labels.dy = -4 if len(labels) > 5 else 0
    bc.bars[0].fillColor = C.GM
    bc.bars[0].strokeColor = None
    for i, v in enumerate(vals):
        bc.bars[0,i].fillColor = _ndvi_color(v)
    d.add(bc)
    return d

def _donut(segs, w=50*mm, h=50*mm):
    d = Drawing(w, h)
    pie = Pie()
    pie.x = 4
    pie.y = 4
    pie.width = w-8
    pie.height = h-8
    pie.data = [max(0.01, s.get("value",0)) for s in segs]
    pie.labels = [""]*len(segs)
    pie.slices.strokeWidth = 1.5
    pie.slices.strokeColor = C.W
    pie.innerRadiusFraction = 0.52
    pal = [C.G, C.AM, C.RE, C.BL]
    for i, s in enumerate(segs):
        pie.slices[i].fillColor = s.get("color", pal[i % len(pal)])
    d.add(pie)
    return d

# ── Page Canvas Callbacks ──────────────────────────────────────────────────────
class _PD:
    def __init__(self, data):
        self.org   = data.get("organization", "Agricultural Intelligence System")
        self.title = data.get("title", "Agricultural Field Analysis Report")
        self.date  = data.get("report_date", datetime.now().strftime("%B %d, %Y"))

    def first(self, canvas, doc):
        self._page_border(canvas)
        self._banner(canvas)
        self._footer(canvas, doc)

    def later(self, canvas, doc):
        self._page_border(canvas)
        self._footer(canvas, doc)

    def _page_border(self, c):
        c.saveState()
        c.setStrokeColor(C.BK)
        c.setLineWidth(1.2)
        pad = PAGE_BORDER
        c.rect(pad, pad, PW - 2*pad, PH - 2*pad, fill=0, stroke=1)
        c.restoreState()

    def _banner(self, c):
        c.saveState()
        c.setFillColor(C.GD)
        c.rect(PAGE_BORDER, PH - BANNER_H - PAGE_BORDER,
               PW - 2*PAGE_BORDER, BANNER_H, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#FFFFFFAA"))
        c.setFont(TNR_I, 8)
        c.drawString(ML, PH - PAGE_BORDER - 9*mm, self.org)
        c.setFillColor(C.W)
        c.setFont(TNR_B, 18)
        c.drawString(ML, PH - PAGE_BORDER - 20*mm, self.title)
        c.setFillColor(colors.HexColor("#FFFFFFCC"))
        c.setFont(TNR_I, 9.5)
        c.drawString(ML, PH - PAGE_BORDER - 28*mm, "Comprehensive Field Intelligence Report")
        bx = PW - MR - 38*mm
        c.setFillColor(colors.HexColor("#FFFFFF22"))
        c.setStrokeColor(colors.HexColor("#FFFFFF55"))
        c.setLineWidth(0.6)
        c.roundRect(bx, PH - PAGE_BORDER - 34*mm, 38*mm, 12*mm, 3, fill=1, stroke=1)
        c.setFillColor(C.BK)
        c.setFont(TNR_B, 7.5)
        c.drawCentredString(bx + 19*mm, PH - PAGE_BORDER - 25*mm, "GENERATED")
        c.setFillColor(C.BK)
        c.setFont(TNR, 8)
        c.drawCentredString(bx + 19*mm, PH - PAGE_BORDER - 31*mm, self.date)
        c.restoreState()

    def _footer(self, c, doc):
        c.saveState()
        fy = PAGE_BORDER + 3*mm
        c.setStrokeColor(C.G)
        c.setLineWidth(0.6)
        c.line(ML, fy + 5*mm, PW - MR, fy + 5*mm)
        c.setFillColor(C.MUT)
        c.setFont(TNR_I, 7)
        c.drawString(ML, fy + 2*mm,
                     f"CONFIDENTIAL  ·  {self.org}  |  {self.date}")
        c.drawRightString(PW - MR, fy + 2*mm, f"Page {doc.page}")
        c.restoreState()

# ── Report Generator ──────────────────────────────────────────────────────────
class ProfessionalPDFReport:
    def __init__(self, data: Dict):
        self.d  = data
        self.S  = _S()
        self.pg = _PD(data)
        self.section_counter = 1
        self.subsection_counter = 0

    def _next_section(self, title, sub=""):
        """Get next numbered section header"""
        num = self.section_counter
        self.section_counter += 1
        self.subsection_counter = 0
        return NumberedSection(str(num), title, sub)

    def _next_subsection(self, parent_num, title):
        """Get next subsection header"""
        self.subsection_counter += 1
        num = f"{parent_num}.{self.subsection_counter}"
        return NumberedSection(num, title, "")

    def generate(self, path: str):
        top_later = PAGE_BORDER + TOP_PAD
        bot = BOT_PAD + PAGE_BORDER

        doc = SimpleDocTemplate(
            path, pagesize=A4,
            leftMargin=ML, rightMargin=MR,
            topMargin=top_later,
            bottomMargin=bot,
            title=self.d.get("title",""),
            author=self.d.get("organization",""),
        )
        story = self._build_story()
        doc.build(story, onFirstPage=self.pg.first, onLaterPages=self.pg.later)

    def _build_story(self):
        top_offset = BANNER_H + TOP_PAD
        top_later  = PAGE_BORDER + TOP_PAD
        extra_p1   = top_offset - top_later
        story = [Spacer(1, extra_p1)]
        story += self._meta_row()
        story += self._exec_summary()
        story += self._kpi_strip()
        story += self._vegetation()
        story += self._soil()
        story += self._crop()
        story += self._yield_section()
        story += self._detailed_metric_solutions()
        if self.d.get("recommendations"):
            story += self._recommendations()
        story += self._images_section()
        return story

    # ── Meta row (centered) ───────────────────────────────────────────────────
    def _meta_row(self):
        S = self.S
        d = self.d
        locs = sorted({r.get("place_name","") for r in d.get("detailed_records",[])
                       if r.get("place_name")})
        loc_str = ", ".join(locs[:4]) + (f" +{len(locs)-4}" if len(locs)>4 else "")

        def cell(lbl, val):
            return [Paragraph(lbl, S["lbl"]),
                    Paragraph(f"<b>{val}</b>", S["val"])]

        cells = [
            cell("FIELDS ANALYSED", str(d.get("field_count","—"))),
            cell("LOCATIONS", loc_str or "—"),
            cell("REPORT TYPE", d.get("report_type","comprehensive").title()),
            cell("GENERATED", d.get("report_date","—")),
        ]
        cw = CW / 4
        t = Table([cells], colWidths=[cw]*4)
        t.setStyle(TableStyle([
            ("VALIGN",       (0,0),(-1,-1),"MIDDLE"),
            ("ALIGN",        (0,0),(-1,-1),"CENTER"),
            ("TOPPADDING",   (0,0),(-1,-1),8),
            ("BOTTOMPADDING",(0,0),(-1,-1),8),
            ("LEFTPADDING",  (0,0),(-1,-1),4),
            ("RIGHTPADDING", (0,0),(-1,-1),4),
            ("BOX",          (0,0),(-1,-1),1.0,C.BK),
            ("BACKGROUND",   (0,0),(-1,-1),C.GP),
        ]))
        return [t, Spacer(1, 6*mm)]

    # ── Executive summary (no box) ───────────────────────────────────────────
    def _exec_summary(self):
        S = self.S
        d = self.d
        st = [self._next_section("Executive Summary"), Spacer(1, 3*mm)]
        esumm = _clean(d.get("executive_summary",""))
        if esumm:
            st.append(Paragraph(esumm, S["bj"]))
            st.append(Spacer(1, 3*mm))
        
        # Key metrics summary
        st.append(Paragraph("Key Metrics Overview", S["h3"]))
        metrics = d.get("metrics", {})
        metric_items = [
            f"•  NDVI Index: {metrics.get('avg_ndvi', 0):.3f}",
            f"•  Soil Health: {metrics.get('avg_soil_health', 0):.1f}%",
            f"•  Crop Health: {metrics.get('avg_crop_health', 0):.1f}%",
            f"•  Yield Potential: {metrics.get('avg_yield', 0):.1f}%",
            f"•  Moisture Index: {metrics.get('avg_moisture', 0):.1f}%",
        ]
        for item in metric_items:
            st.append(Paragraph(item, S["bul"]))
        st.append(Spacer(1, 5*mm))
        return st

    # ── KPI strip ──────────────────────────────────────────────────────────────
    def _kpi_strip(self):
        m = self.d.get("metrics",{})
        S = self.S
        if not m:
            return []

        def col(v, lo, hi):
            if v is None: return C.MUT
            return C.G if v>=hi else C.AM if v>=lo else C.RE

        ndvi = m.get("avg_ndvi")
        soil = m.get("avg_soil_health")
        crop = m.get("avg_crop_health")
        yld = m.get("avg_yield")
        mois = m.get("avg_moisture")

        cards = [
            KPICard("NDVI Index",      _fv(ndvi,3), "vegetation", col(ndvi,0.3,0.5)),
            KPICard("Soil Health",     _fv(soil,1),  "score %",   col(soil,50,70)),
            KPICard("Crop Health",     _fv(crop,1),  "score %",   col(crop,50,70)),
            KPICard("Yield Potential", _fv(yld,1),   "potential%",col(yld,50,70)),
            KPICard("Moisture",        _fv(mois,1),  "index %",   C.BL),
        ]
        n = len(cards)
        cw = 30*mm
        gap = (CW - n*cw) / (n-1)
        row = []
        cws = []
        for i, card in enumerate(cards):
            row.append(card)
            cws.append(cw)
            if i < n-1:
                row.append(Spacer(gap,1))
                cws.append(gap)
        t = Table([row], colWidths=cws, rowHeights=[30*mm])
        t.setStyle(TableStyle([
            ("ALIGN",(0,0),(-1,-1),"CENTER"),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("LEFTPADDING",(0,0),(-1,-1),0),
            ("RIGHTPADDING",(0,0),(-1,-1),0),
            ("TOPPADDING",(0,0),(-1,-1),0),
            ("BOTTOMPADDING",(0,0),(-1,-1),0),
        ]))
        return [self._next_section("Key Performance Indicators"), Spacer(1,4*mm), t, Spacer(1,6*mm)]

    def _vegetation(self):
        S = self.S
        d = self.d
        ndvi    = d.get("metrics",{}).get("avg_ndvi") or 0
        records = d.get("detailed_records",[])
        trend   = d.get("ndvi_data",{}).get("trend",[])
        lbl = ("Excellent" if ndvi>=0.6 else "Good" if ndvi>=0.4
               else "Moderate" if ndvi>=0.25 else "Poor")

        st = [Paragraph("Vegetation Health Analysis", S["h2"]),
            # Spacer(1, 3*mm),  # Line space between title and subtitle
            # Paragraph("NDVI · SAVI · EVI · GNDVI Indices", S["h1"]),
            Spacer(1,3*mm),
              Paragraph(
                  f"Average <b>NDVI</b> across all fields: <b>{ndvi:.3f}</b> — "
                  f"<b>{lbl}</b> vegetation health. "
                  f"Values above 0.5 indicate dense healthy canopy; "
                  f"below 0.3 indicates sparse or stressed vegetation requiring intervention.",
                  S["bj"]),
              Spacer(1,4*mm)]

        

        # Vegetation index summary table
        if records:
            hdrs = ["Location","Date","NDVI","SAVI","EVI","GNDVI","Interpretation"]
            cws  = [40*mm,20*mm,18*mm,18*mm,18*mm,18*mm,CW-132*mm]
            rows = [hdrs]
            for r in records[:20]:
                v = r.get("mean_ndvi")
                rows.append([
                    r.get("place_name","—"),
                    (r.get("datetime") or "")[:10] or "—",
                    _fv(v,3), _fv(r.get("mean_savi"),3),
                    _fv(r.get("mean_evi"),3), _fv(r.get("mean_gndvi"),3),
                    _ndvi_interp(float(v)) if v else "—",
                ])
            sty = _TS()
            for ri,r in enumerate(records[:20], start=1):
                v = r.get("mean_ndvi")
                if v is not None:
                    sty.add("TEXTCOLOR",(2,ri),(2,ri),_ndvi_color(v))
                    sty.add("FONTNAME",(2,ri),(2,ri),TNR_B)
            t = Table(rows, colWidths=cws, repeatRows=1)
            t.setStyle(sty)
            st += [Paragraph("Vegetation Index Summary by Field", S["h3"]),
                   Spacer(1,2*mm), t, Spacer(1,3*mm)]

        if len(trend) > 1:
            n = len(trend)
            cw2 = (CW-28*mm)/n
            tr = Table([[""]+[f"#{i+1}" for i in range(n)],
                        ["NDVI"]+[f"{v:.3f}" for v in trend]],
                       colWidths=[28*mm]+[cw2]*n)
            tr.setStyle(_TS())
            st += [Paragraph("NDVI Observation Trend", S["h3"]),
                   Spacer(1,2*mm), tr, Spacer(1,3*mm)]

        st.append(Spacer(1,5*mm))
        return st

    # ── Soil section (no box) ─────────────────────────────────────────────────
    def _soil(self):
        S = self.S
        d = self.d
        sd = d.get("soil_data",{})
        hs = _clamp(sd.get("health_score",0))
        mo = _clamp(sd.get("moisture",0))
        om = _clamp(sd.get("organic_matter",0), 0, 50)
        ph = sd.get("ph",0) or 0

        st = [self._next_section("Soil Health Assessment"),
        # st = [self._next_section("Soil Health Assessment", "Moisture · Organic Matter · pH Level"),
              Spacer(1,3*mm),
              Paragraph(
                  f"Soil health: <b>{hs:.1f}%</b>  ·  "
                  f"Moisture index: <b>{mo:.1f}%</b>  ·  "
                  f"Organic matter: <b>{om:.1f}%</b>  ·  "
                  f"pH: <b>{ph:.1f}</b>.",
                  S["bj"]),
              Spacer(1,4*mm)]

        for lbl,val,mx,col in [
            ("Soil Health Score",  hs,  100, _score_color(hs)),
            ("Moisture Index",     mo,  100, C.BL),
            ("Organic Matter",     om,   50, C.AM),
        ]:
            st += [HBar(lbl,val,mx,col,CW), Spacer(1,2*mm)]
        st.append(Spacer(1,4*mm))

        rows = [
            ["Parameter","Value","Status","Interpretation & Recommendation"],
            ["Health Score",   f"{hs:.1f}%",
             "Healthy" if hs>=70 else "Moderate" if hs>=50 else "Poor",
             "Maintain current practices" if hs>=70 else "Apply organic amendments urgently"],
            ["Moisture Index", f"{mo:.1f}%",
             "Optimal" if 40<=mo<=80 else "Low" if mo<40 else "High",
             "Optimal 40–80% range" if 40<=mo<=80 else "Increase irrigation frequency" if mo<40 else "Reduce watering, improve drainage"],
            ["Organic Matter", f"{om:.1f}%",
             "Good" if om>=3 else "Low",
             "Continue composting programme" if om>=3 else "Add compost or green manure immediately"],
            ["pH Level",       f"{ph:.1f}",
             "Optimal" if 6.0<=ph<=7.5 else "Alkaline" if ph>7.5 else "Acidic",
             "Ideal 6.0–7.5 range" if 6.0<=ph<=7.5 else "Apply sulphur to reduce pH" if ph>7.5 else "Apply agricultural lime to raise pH"],
        ]
        cws = [36*mm,20*mm,22*mm,CW-78*mm]
        t = Table(rows, colWidths=cws)
        t.setStyle(_TS())
        st += [t, Spacer(1,6*mm)]
        return st

    # ── Crop section (no box) ─────────────────────────────────────────────────
    def _crop(self):
        S = self.S
        d = self.d
        cd = d.get("crop_data",{})
        ch = _clamp(cd.get("health_score",0))
        vi = _clamp(cd.get("vigor_index",0))
        sl = _clamp(cd.get("stress_level",0))
        stress_lbl = ("Low stress — favourable" if sl<30
                      else "Moderate stress — monitor closely" if sl<60
                      else "HIGH stress — immediate action required")
        records = d.get("detailed_records",[])

        st = [self._next_section("Crop Health & Stress Analysis"),
        # st = [self._next_section("Crop Health & Stress Analysis", "Vigor · Stress Level · Yield Potential"),
              Spacer(1,3*mm),
              Paragraph(
                  f"Crop health: <b>{ch:.1f}%</b>  ·  "
                  f"Vigor index: <b>{vi:.1f}%</b>  ·  "
                  f"Stress: <b>{sl:.1f}%</b> ({stress_lbl}).",
                  S["bj"]),
              Spacer(1,4*mm)]

        bars_w = CW - 56*mm
        segs = [{"label":"Healthy","value":max(0,100-sl),"color":C.G},
                {"label":"Stressed","value":sl,"color":C.RE}]
        donut = _donut(segs, 50*mm, 50*mm)
        legend_items = []
        for s in segs:
            hx = s["color"].hexval()[2:]
            legend_items.append(Paragraph(
                f'<font color="#{hx}">■</font>  {s["label"]}: {s["value"]:.1f}%',
                ParagraphStyle("_lg",fontName=TNR,fontSize=8.5,leading=13,textColor=C.BODY)))

        bars_items = []
        for lbl,v,col in [("Crop Health",ch,_score_color(ch)),
                           ("Vigor Index",vi,_score_color(vi)),
                           ("Stress Level",sl,C.RE)]:
            bars_items.append(HBar(lbl,v,100,col,bars_w))
            bars_items.append(Spacer(1,2*mm))

        inner = Table([[bars_items, [donut]+legend_items]],
                      colWidths=[bars_w, 54*mm])
        inner.setStyle(TableStyle([
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("ALIGN",(0,0),(0,0),"LEFT"),("ALIGN",(1,0),(1,0),"CENTER"),
            ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
            ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
        ]))
        st += [inner, Spacer(1,4*mm)]

        if records:
            hdrs = ["Location","Date","Crop Health %","Vigor %","Stress %","Yield %","Chlorophyll"]
            cws  = [42*mm,20*mm,24*mm,20*mm,20*mm,20*mm,CW-146*mm]
            rows = [hdrs]
            for r in records[:20]:
                rows.append([
                    r.get("place_name","—"),
                    (r.get("datetime") or "")[:10],
                    _fv(r.get("crop_health_score")),
                    _fv(r.get("vigor_index")),
                    _fv(r.get("stress_level")),
                    _fv(r.get("yield_potential")),
                    _fv(r.get("chlorophyll_content")),
                ])
            sty = _TS()
            for ri,r in enumerate(records[:20],start=1):
                v = r.get("stress_level")
                if v is not None:
                    sty.add("TEXTCOLOR",(4,ri),(4,ri),
                            C.RE if v>=60 else C.AM if v>=30 else C.G)
            t = Table(rows, colWidths=cws, repeatRows=1)
            t.setStyle(sty)
            st += [Paragraph("Per-Field Crop Metrics", S["h3"]),
                   Spacer(1,2*mm), t]
        st.append(Spacer(1,6*mm))
        return st

    # ── Yield section ─────────────────────────────────────────────────────────
    def _yield_section(self):
        S = self.S
        d = self.d
        yd = d.get("yield_data",{})
        pot = _clamp(yd.get("potential",0))
        fcst = yd.get("forecast","Average")
        fac = [_ci(f) for f in yd.get("factors",[]) if f]
        records = d.get("detailed_records",[])

        st = [self._next_section("Yield Forecast & Projections"),
        # st = [self._next_section("Yield Forecast & Projections", "Potential · Forecast · Contributing Factors"),      
              Spacer(1,3*mm),
              Paragraph(
                  f"Estimated yield potential: <b>{pot:.1f}%</b> of maximum capacity. "
                  f"Forecast: <b>{fcst}</b>.",
                  S["bj"]),
              Spacer(1,4*mm)]

        if fac:
            st.append(Paragraph("Contributing Factors", S["h3"]))
            for f in fac:
                st.append(Paragraph(f"•  {f}", S["bul"]))
            st.append(Spacer(1,3*mm))

        if records:
            hdrs = ["Location","Date","Yield %","NDVI","Soil Health %","Moisture %"]
            cws  = [48*mm,20*mm,22*mm,22*mm,26*mm,CW-138*mm]
            rows = [hdrs]
            for r in records[:20]:
                rows.append([
                    r.get("place_name","—"),
                    (r.get("datetime") or "")[:10],
                    _fv(r.get("yield_potential")),
                    _fv(r.get("mean_ndvi"),3),
                    _fv(r.get("soil_health_score")),
                    _fv(r.get("moisture_index")),
                ])
            sty = _TS()
            for ri,r in enumerate(records[:20],start=1):
                v = r.get("yield_potential")
                if v is not None:
                    sty.add("TEXTCOLOR",(2,ri),(2,ri),
                            C.G if v>=70 else C.AM if v>=50 else C.RE)
                    sty.add("FONTNAME",(2,ri),(2,ri),TNR_B)
            t = Table(rows, colWidths=cws, repeatRows=1)
            t.setStyle(sty)
            st += [Paragraph("Per-Field Yield Data", S["h3"]),
                   Spacer(1,2*mm), t]
        st.append(Spacer(1,6*mm))
        return st

    # ── Detailed Metric Solutions (LLM-powered) ───────────────────────────────
    def _detailed_metric_solutions(self):
        S = self.S
        detailed_solutions = self.d.get("detailed_metric_solutions", [])
        
        if not detailed_solutions:
            return []
        
        st = [self._next_section("Detailed Metric-Based Solutions"),
                                #  st = [self._next_section("Detailed Metric-Based Solutions", 
                                #  "Root cause analysis and actionable recommendations"),
              Spacer(1, 3*mm),
              Paragraph("Based on the measured field metrics, the following detailed analysis provides root causes and recommended solutions for each parameter.", S["bj"]),
              Spacer(1, 5*mm)]
        
        for i, solution in enumerate(detailed_solutions[:8], 1):
            metric_name = solution.get("metric_name", "Metric")
            current_value = solution.get("current_value", "N/A")
            status = solution.get("status", "Moderate")
            cause = solution.get("cause", "Insufficient data for analysis")
            solution_text = solution.get("solution", "Monitor and maintain current practices")
            urgency = solution.get("urgency", "MEDIUM")
            
            # Color coding for status/urgency
            if urgency == "HIGH":
                border_color = C.RE
            elif urgency == "MEDIUM":
                border_color = C.AM
            else:
                border_color = C.G
            
            # Build the solution card - no background color
            content_rows = [
                [Paragraph(f"<b>{i}. {metric_name}</b> — Current Value: <b>{current_value}</b> — Status: <b>{status}</b>", 
                           ParagraphStyle("_ms_title", fontName=TNR_B, fontSize=10, textColor=C.GD, leading=14))],
                [Paragraph(f"<b>Root Cause:</b> {cause}", 
                           ParagraphStyle("_ms_cause", fontName=TNR, fontSize=9, textColor=C.BODY, leading=13))],
                [Paragraph(f"<b>Recommended Solution:</b> {solution_text}", 
                           ParagraphStyle("_ms_sol", fontName=TNR, fontSize=9, textColor=C.G, leading=13))],
            ]
            
            inner = Table(content_rows, colWidths=[CW-8*mm])
            inner.setStyle(TableStyle([
                ("TOPPADDING", (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING", (0,0), (-1,-1), 10),
                ("RIGHTPADDING", (0,0), (-1,-1), 10),
                ("BOX", (0,0), (-1,-1), 1.0, border_color),
            ]))
            
            # Add left border color strip
            outer = Table([[None, inner]], colWidths=[5*mm, CW-5*mm])
            outer.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (0,-1), border_color),
                ("TOPPADDING", (0,0), (-1,-1), 0),
                ("BOTTOMPADDING", (0,0), (-1,-1), 0),
                ("LEFTPADDING", (0,0), (-1,-1), 0),
                ("RIGHTPADDING", (0,0), (-1,-1), 0),
                ("VALIGN", (0,0), (-1,-1), "TOP"),
                ("BOX", (0,0), (-1,-1), 1.0, border_color),
            ]))
            
            st.append(KeepTogether([outer, Spacer(1, 4*mm)]))
        
        st.append(Spacer(1, 5*mm))
        return st

    # ── Recommendations (no box) ────────────────────────────────────────────────
    def _recommendations(self):
        S = self.S
        recs = self.d.get("recommendations",[])
        P_COL = {"HIGH":C.RE, "MEDIUM":C.AM, "LOW":C.G}
        P_BG  = {"HIGH":C.W, "MEDIUM":C.W, "LOW":C.W}  # No background color

        st = [self._next_section("Actionable Recommendations"),
        # st = [self._next_section("Actionable Recommendations", "AI-prioritised field interventions"),
              Spacer(1,3*mm)]

        for i, rec in enumerate(recs[:6]):
            pri = (rec.get("priority") or "MEDIUM").upper()
            col = P_COL.get(pri, C.G)
            bg  = P_BG.get(pri, C.W)
            rows = [
                [Paragraph(f"<b>#{i+1}  [{pri}]  {_ci(rec.get('title',''))}</b>",
                           ParagraphStyle("_rh",fontName=TNR_B,fontSize=10,
                                          textColor=col,leading=15))],
                [Paragraph(_ci(rec.get("description","")),
                           ParagraphStyle("_rd",fontName=TNR,fontSize=9,
                                          textColor=C.BODY,leading=14))],
            ]
            for a in (rec.get("actions") or [])[:4]:
                rows.append([Paragraph(f"→  {_ci(a)}",
                             ParagraphStyle("_ra",fontName=TNR,fontSize=9,
                                            textColor=C.BODY,leading=14,leftIndent=8))])
            inner = Table(rows, colWidths=[CW-8*mm])
            inner.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),bg),
                ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
                ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
                ("BOX",(0,0),(-1,-1),0.6,C.BOR),
            ]))
            outer = Table([[None, inner]], colWidths=[6*mm, CW-6*mm])
            outer.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(0,-1),col),
                ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
                ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                ("VALIGN",(0,0),(-1,-1),"TOP"),
                ("BOX",(0,0),(-1,-1),0.8,col),
            ]))
            st.append(KeepTogether([outer, Spacer(1,4*mm)]))
        st.append(Spacer(1,5*mm))
        return st

    # ── Removed _field_table() completely ──────────────────────────────────────

    # ── Satellite imagery with explanations (all 7 images, uniform size) ────────
    def _images_section(self):
        S = self.S
        records = self.d.get("detailed_records",[])
        img_records = [r for r in records if r.get("images")]
        if not img_records:
            return []

        # All 7 image types with detailed agronomic explanations
        IMG_LABELS = {
            "ndvi_png": ("NDVI", "NDVI Value: {value}", 
                        "Normalized Difference Vegetation Index (NDVI) measures vegetation health and density. "
                        "Values range from -1 to +1. <b>NDVI = {value}</b>. "
                        "Deep green indicates dense healthy canopy (NDVI > 0.5). "
                        "Yellow/orange indicates moderate stress (0.3-0.5). "
                        "Red indicates sparse or severely stressed vegetation (< 0.3). "
                        "Use to identify low-productivity zones for targeted intervention."),
            "rgb_png": ("True Colour (RGB)", "",
                        "Natural RGB composite image as seen from the satellite sensor. "
                        "Shows actual crop colouration, visible water stress, pest damage, or senescence. "
                        "Useful for visual verification of other spectral indices and ground truthing."),
            "savi_png": ("SAVI", "SAVI Value: {value}",
                        "Soil-Adjusted Vegetation Index (SAVI) corrects NDVI for bare soil reflectance. "
                        "SAVI = {value}. More reliable than NDVI in early-season crops or fields with "
                        "significant exposed soil. Essential for fields with < 50% vegetation cover."),
            "evi_png": ("EVI", "EVI Value: {value}",
                       "Enhanced Vegetation Index (EVI) reduces atmospheric distortions and canopy background noise. "
                       "EVI = {value}. More sensitive than NDVI in dense, high-biomass areas where NDVI saturates. "
                       "Ideal for mature crop monitoring and forested areas."),
            "gndvi_png": ("GNDVI", "GNDVI Value: {value}",
                         "Green Normalized Difference Vegetation Index (GNDVI) uses the green band — more sensitive to "
                         "chlorophyll concentration. GNDVI = {value}. Detects early nutritional stress before visible in "
                         "NDVI or to the naked eye. Ideal for nitrogen status monitoring and precision fertilization."),
            "soil_health_png": ("Soil Health Composite", "Soil Health Score: {value}%",
                               "Composite soil health score mapped spatially across the field. "
                               "Soil Health = {value}%. Combines moisture content, organic matter and soil texture indices. "
                               "Dark green = optimal conditions (70-100%). Yellow/orange = moderate degradation (50-70%). "
                               "Red = poor soil health requiring amendment (< 50%)."),
            "crop_health_png": ("Crop Health Composite", "Crop Health Score: {value}%",
                               "Crop health composite score combining vegetation vigour, stress index and chlorophyll content. "
                               "Crop Health = {value}%. Highlights sub-field variability for precision variable-rate management "
                               "of irrigation, fertiliser and pesticide inputs.")
        }

        st = [PageBreak(),
              self._next_section("Satellite Imagery & Spectral Analysis"),
            #           st = [PageBreak(),
            #   self._next_section("Satellite Imagery & Spectral Analysis",
            #           "Multispectral imagery with agronomic interpretation"),
              Spacer(1,3*mm),
              Paragraph(
                  "The following pages present satellite-derived multispectral imagery for each analysed field. "
                  "Each band includes measured values and detailed agronomic interpretation explaining what the "
                  "colour gradients indicate and recommended management actions.",
                  S["bj"]),
              Spacer(1,5*mm)]

        # Uniform image size for all 7 images
        IMG_W = (CW - 5*mm) / 2
        IMG_H = 55*mm  # Uniform height for all images

        for rec in img_records[:5]:  # Limit to first 5 fields for PDF size
            name   = rec.get("place_name","Unknown Field")
            date   = (rec.get("datetime") or "")[:10]
            images = rec.get("images", {})
            ndvi_v = rec.get("mean_ndvi")
            soil_v = rec.get("soil_health_score")
            crop_v = rec.get("crop_health_score")
            savi_v = rec.get("mean_savi")
            evi_v = rec.get("mean_evi")
            gndvi_v = rec.get("mean_gndvi")

            # Field block header (no background box)
            fhdr = Table([[
                Paragraph(f"<b>{name}</b>",
                          ParagraphStyle("_fn",fontName=TNR_B,fontSize=12,
                                         textColor=C.GD,leading=16)),
                Paragraph(
                    f"Date: {date}  ·  NDVI: {_fv(ndvi_v,3)}  ·  "
                    f"Soil Health: {_fv(soil_v)}%  ·  Crop Health: {_fv(crop_v)}%",
                    ParagraphStyle("_fs",fontName=TNR_I,fontSize=8.5,
                                   textColor=C.MUT,leading=13)),
            ]], colWidths=[70*mm, CW-70*mm])
            fhdr.setStyle(TableStyle([
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ("ALIGN",(0,0),(0,-1),"LEFT"),("ALIGN",(1,0),(1,-1),"RIGHT"),
                ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
                ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
                ("BOX",(0,0),(-1,-1),1.0,C.BK),
            ]))
            st += [fhdr, Spacer(1,4*mm)]

            # Get all available images in priority order
            order = ["ndvi_png", "rgb_png", "savi_png", "evi_png", "gndvi_png", "soil_health_png", "crop_health_png"]
            items = [(k, v) for k, v in images.items() if v and k in IMG_LABELS]
            items.sort(key=lambda x: order.index(x[0]) if x[0] in order else 99)
            
            # Display images in pairs with uniform size
            pairs = [items[i:i+2] for i in range(0, len(items), 2)]

            for pair in pairs:
                cells = []
                for key, url in pair:
                    lbl, val_template, explain = IMG_LABELS.get(key, (key, "", ""))
                    
                    # Get the corresponding metric value for this image type
                    metric_value = ""
                    if key == "ndvi_png" and ndvi_v:
                        metric_value = f"{ndvi_v:.3f}"
                    elif key == "savi_png" and savi_v:
                        metric_value = f"{savi_v:.3f}"
                    elif key == "evi_png" and evi_v:
                        metric_value = f"{evi_v:.3f}"
                    elif key == "gndvi_png" and gndvi_v:
                        metric_value = f"{gndvi_v:.3f}"
                    elif key == "soil_health_png" and soil_v:
                        metric_value = f"{soil_v:.1f}%"
                    elif key == "crop_health_png" and crop_v:
                        metric_value = f"{crop_v:.1f}%"
                    
                    # Format the explanation with the actual metric value
                    val_text = val_template.format(value=metric_value) if val_template and metric_value else ""
                    if val_text:
                        explain_full = f"{val_text} {explain}"
                    else:
                        explain_full = explain
                    
                    img_data = _fetch_image(url)
                    if img_data:
                        try:
                            img_el = RLImage(img_data, width=IMG_W, height=IMG_H)
                        except Exception:
                            img_el = ColorBox(IMG_W, IMG_H, f"{lbl} (render error)")
                    else:
                        img_el = ColorBox(IMG_W, IMG_H, f"{lbl} (unavailable)")

                    cap_p = Paragraph(f"<b>{lbl}</b>",
                                      ParagraphStyle("_ic",fontName=TNR_B,fontSize=9,
                                                     textColor=C.GD,leading=13))
                    exp_p = Paragraph(explain_full,
                                      ParagraphStyle("_ie",fontName=TNR,fontSize=7.5,
                                                     textColor=C.BODY,leading=11,spaceAfter=3))
                    cell_t = Table([[img_el],[cap_p],[exp_p]], colWidths=[IMG_W])
                    cell_t.setStyle(TableStyle([
                        ("ALIGN",(0,0),(-1,-1),"LEFT"),
                        ("VALIGN",(0,0),(-1,-1),"TOP"),
                        ("LEFTPADDING",(0,0),(-1,-1),0),
                        ("RIGHTPADDING",(0,0),(-1,-1),0),
                        ("TOPPADDING",(0,0),(-1,-1),0),
                        ("BOTTOMPADDING",(0,0),(0,0),4),
                        ("TOPPADDING",(0,1),(-1,-1),5),
                        ("LEFTPADDING",(0,1),(-1,-1),5),
                        ("RIGHTPADDING",(0,1),(-1,-1),5),
                        ("BOTTOMPADDING",(0,1),(-1,-1),4),
                        ("BOX",(0,0),(-1,-1),0.8,C.BK),
                        ("BACKGROUND",(0,0),(-1,-1),C.W),
                    ]))
                    cells.append(cell_t)
                while len(cells) < 2:
                    cells.append(Spacer(IMG_W, 1))
                row_t = Table([cells], colWidths=[IMG_W, CW-IMG_W])
                row_t.setStyle(TableStyle([
                    ("VALIGN",(0,0),(-1,-1),"TOP"),
                    ("LEFTPADDING",(0,0),(-1,-1),0),
                    ("RIGHTPADDING",(0,0),(0,-1),5),
                    ("RIGHTPADDING",(1,0),(1,-1),0),
                    ("TOPPADDING",(0,0),(-1,-1),0),
                    ("BOTTOMPADDING",(0,0),(-1,-1),0),
                ]))
                st += [row_t, Spacer(1, 4*mm)]

            # Spectral stats table
            idx_rows = [["Index","Mean","Std Dev","Min","Max","Agronomic Interpretation"]]
            for ik, iname in [("mean_ndvi","NDVI"),("mean_savi","SAVI"),
                               ("mean_evi","EVI"),("mean_gndvi","GNDVI")]:
                v = rec.get(ik)
                if v is not None:
                    interp = _ndvi_interp(float(v)) if iname=="NDVI" else _fv(v,3)
                    idx_rows.append([
                        iname, _fv(v,3),
                        _fv(rec.get(ik.replace("mean_","std_")),3),
                        _fv(rec.get(ik.replace("mean_","min_")),3),
                        _fv(rec.get(ik.replace("mean_","max_")),3),
                        interp,
                    ])
            if len(idx_rows) > 1:
                t = Table(idx_rows,
                          colWidths=[16*mm,15*mm,15*mm,13*mm,13*mm,CW-72*mm],
                          repeatRows=1)
                t.setStyle(_TS())
                st += [Paragraph("Spectral Statistics", S["h3"]),
                       Spacer(1,2*mm), t, Spacer(1,4*mm)]

            st.append(HRFlowable(width=CW, thickness=0.8, color=C.BOR, spaceAfter=5*mm))

        return st


# Backward-compat aliases
ProfessionalAgReport = ProfessionalPDFReport
AgColors = C