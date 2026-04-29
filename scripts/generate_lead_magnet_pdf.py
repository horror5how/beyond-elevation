#!/usr/bin/env python3
"""Generate The IP Leverage Audit PDF (10 pages, BEIP brand)."""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from pathlib import Path
from textwrap import wrap

OUT = Path(__file__).resolve().parent.parent / "assets" / "resources" / "ip-leverage-audit.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = LETTER
CREAM = HexColor("#FAF7F2")
BG2 = HexColor("#F3EFE8")
INK = HexColor("#1A1A1A")
MUTED = HexColor("#4A4A4A")
ACCENT = HexColor("#7A6A52")
LINE = HexColor("#D6CEC2")

def fill_bg(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

def footer(c, page_num, total=10):
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(0.75 * inch, 0.5 * inch, "Beyond Elevation  |  beyondelevation.com")
    c.drawRightString(PAGE_W - 0.75 * inch, 0.5 * inch, f"{page_num} / {total}")

def wrap_text(c, text, x, y, max_width, font="Helvetica", size=11, leading=15, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    avg_char = size * 0.5
    chars_per_line = max(20, int(max_width / avg_char))
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        lines.extend(wrap(paragraph, width=chars_per_line))
    cy = y
    for line in lines:
        c.drawString(x, cy, line)
        cy -= leading
    return cy

def page_cover(c):
    fill_bg(c)
    c.setFillColor(ACCENT)
    c.rect(0, PAGE_H - 0.4 * inch, PAGE_W, 0.4 * inch, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.75 * inch, PAGE_H - 0.27 * inch, "BEYOND ELEVATION")
    c.drawRightString(PAGE_W - 0.75 * inch, PAGE_H - 0.27 * inch, "IP STRATEGY  |  LICENSING REVENUE")
    # Title block
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(0.75 * inch, PAGE_H - 1.6 * inch, "A diagnostic guide for founders")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(0.75 * inch, PAGE_H - 2.4 * inch, "The IP Leverage Audit")
    c.setFont("Helvetica", 16)
    c.setFillColor(MUTED)
    wrap_text(c, "A 7-Step Diagnostic for Founders Raising Seed to Series B",
              0.75 * inch, PAGE_H - 3.0 * inch, PAGE_W - 1.5 * inch,
              font="Helvetica", size=16, leading=22, color=MUTED)
    # Decorative stripe
    c.setFillColor(LINE)
    c.rect(0.75 * inch, PAGE_H - 4.2 * inch, 1.5 * inch, 4, fill=1, stroke=0)
    # Byline block
    c.setFillColor(BG2)
    c.roundRect(0.75 * inch, 1.4 * inch, PAGE_W - 1.5 * inch, 1.8 * inch, 12, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(1.0 * inch, 2.7 * inch, "Hayat Amin")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(1.0 * inch, 2.45 * inch, "Founder, Beyond Elevation  |  Fractional IP CXO")
    c.drawString(1.0 * inch, 2.25 * inch, "20+ years across AI, IP, and enterprise data licensing")
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(1.0 * inch, 1.85 * inch, "beyondelevation.com  |  hayat@beyondelevation.com")
    footer(c, 1)
    c.showPage()

def page_hook(c):
    fill_bg(c)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.75 * inch, PAGE_H - 0.75 * inch, "WHY THIS MATTERS")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 26)
    wrap_text(c, "Why most founders leave $4M+ on the table.",
              0.75 * inch, PAGE_H - 1.4 * inch, PAGE_W - 1.5 * inch,
              font="Helvetica-Bold", size=26, leading=32, color=INK)
    body = (
        "Most founders treat intellectual property as a legal task. "
        "They file a patent, ship the product, and never look at the IP again.\n\n"
        "That mindset is leaking money.\n\n"
        "The companies that compound the fastest treat IP as a revenue engine, "
        "not a defensive shield. They license to non-competing markets. They pull "
        "royalties from dormant filings. They turn their data corpus into a recurring line item. "
        "They negotiate AI vendor contracts that protect every output their team produces.\n\n"
        "If you are raising a Seed, A, or B, your investors will ask one question: "
        "what is the moat that only you can run? IP is the most defensible answer you have. "
        "But only if it is structured.\n\n"
        "This audit takes 10 minutes. It surfaces the seven gaps "
        "that quietly cost founders 2x to 10x in valuation and millions in unpaid royalties.\n\n"
        "Score yourself honestly. Then we will show you what to do next."
    )
    wrap_text(c, body, 0.75 * inch, PAGE_H - 3.0 * inch,
              PAGE_W - 1.5 * inch, font="Helvetica", size=12, leading=18, color=MUTED)
    footer(c, 2)
    c.showPage()

QUESTIONS = [
    ("How much of your IP is registered vs trade-secret?",
     "Registered IP (patents, trademarks, registered designs) is enforceable, transferable, and bankable. Trade secrets are powerful but evaporate the moment a key engineer leaves. Most founders are 90% trade secret and do not know it. Investors discount what cannot be defended in court.",
     "0 = no idea  |  1 = mostly trade secret, nothing filed  |  2 = some filings, no audit  |  3 = full IP register, refreshed quarterly"),
    ("Do your AI vendor contracts permit training on your output?",
     "If you are using OpenAI, Anthropic, or any LLM API at scale, the default terms vary wildly. Some quietly grant the vendor rights to your prompts, outputs, or fine-tuning data. Founders who do not read these clauses are donating their moat to the model providers.",
     "0 = never read them  |  1 = read but did not negotiate  |  2 = opted out of training  |  3 = custom DPA + zero retention + IP indemnity"),
    ("Is your defensibility in code, in patents, or in brand?",
     "Pure code moats erode in 90 days when a competitor copies the surface and AI accelerates the build. Brand moats take a decade. Patents and structured trade secrets sit in between and compound. The strongest companies layer all three. Most founders rely on one and call it a day.",
     "0 = single layer (one of the three)  |  1 = two layers, weakly mapped  |  2 = three layers, no monetization  |  3 = three layers, each producing revenue"),
    ("What % of your ARR is reproducible by a competitor in 90 days?",
     "Take your last 12 months of revenue. Now imagine a well-funded competitor with the same engineers and the same models. How much of that revenue could they replicate in one quarter? The honest answer is the slice of your ARR that is not protected. Investors price the rest.",
     "0 = 75%+ reproducible  |  1 = 50-75%  |  2 = 25-50%  |  3 = under 25% (genuinely hard to copy)"),
    ("Are your IP filings in your name or your investors'?",
     "This is the cleanup question that catches founders at the term sheet stage. Filings made in a personal name, an old C-corp, or a co-founder's LLC create chain-of-title gaps. Acquirers walk. Investors discount. This is fixable but only if you find it before the diligence call.",
     "0 = mixed and undocumented  |  1 = mostly entity, gaps unconfirmed  |  2 = audited, minor cleanups outstanding  |  3 = perfect chain of title, assignments executed"),
    ("Have you mapped royalty potential of dormant IP?",
     "Most founders have filings, datasets, or know-how that solve problems for non-competing industries. A pharma trade secret may license cleanly to an agtech firm. A consumer dataset may earn royalties from a B2B vertical. Dormant IP is the line item that hides on the balance sheet at zero.",
     "0 = no map  |  1 = informal list  |  2 = mapped but not pitched  |  3 = mapped, pitched, royalties live"),
    ("Does your cap table reflect IP-backed equity?",
     "If your IP is worth $20M and your cap table treats it as a $0 contribution, you are funding the upside and giving away the leverage. IP-backed equity, IP holding companies, and inventor royalty trusts are how operators keep more of what they create.",
     "0 = IP is unvalued in cap table  |  1 = valued but not allocated  |  2 = allocated, no royalty mechanism  |  3 = full IP holding co with royalty share"),
]

def page_question(c, idx, page_num):
    fill_bg(c)
    q, why, scoring = QUESTIONS[idx]
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.75 * inch, PAGE_H - 0.75 * inch, f"DIAGNOSTIC {idx + 1} OF 7")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 22)
    y = wrap_text(c, q, 0.75 * inch, PAGE_H - 1.4 * inch, PAGE_W - 1.5 * inch,
                  font="Helvetica-Bold", size=22, leading=28, color=INK)
    # Why it matters
    y -= 16
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.75 * inch, y, "Why it matters")
    y -= 18
    y = wrap_text(c, why, 0.75 * inch, y, PAGE_W - 1.5 * inch,
                  font="Helvetica", size=11, leading=16, color=MUTED)
    # Scoring box
    y -= 24
    c.setFillColor(BG2)
    c.roundRect(0.75 * inch, y - 1.4 * inch, PAGE_W - 1.5 * inch, 1.4 * inch, 10, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.0 * inch, y - 0.3 * inch, "Score yourself: 0 to 3")
    c.setFillColor(INK)
    wrap_text(c, scoring, 1.0 * inch, y - 0.6 * inch, PAGE_W - 2.0 * inch,
              font="Helvetica", size=10, leading=15, color=INK)
    # Score field
    c.setFillColor(white)
    c.roundRect(PAGE_W - 1.7 * inch, 1.4 * inch, 0.95 * inch, 0.55 * inch, 6, fill=1, stroke=1)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(PAGE_W - 1.7 * inch, 2.05 * inch, "Your score (0-3)")
    footer(c, page_num)
    c.showPage()

def page_scoring(c):
    fill_bg(c)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.75 * inch, PAGE_H - 0.75 * inch, "YOUR RESULT")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 26)
    wrap_text(c, "Add your seven scores. Read the band you land in.",
              0.75 * inch, PAGE_H - 1.35 * inch, PAGE_W - 1.5 * inch,
              font="Helvetica-Bold", size=24, leading=30, color=INK)
    bands = [
        ("0 to 7  |  Exposed",
         "Your IP is leaking value in real time. Competitors can copy you, vendors can train on you, and acquirers will discount you. Most founders sit here and do not realize it. The good news: this is the band where one quarter of focused work returns the most upside."),
        ("8 to 14  |  Foundational",
         "You have the bones. Filings exist, contracts are mostly clean, and you can articulate a moat. What is missing is monetization: dormant IP mapped, royalties live, AI vendor risk priced, cap table aligned. This is where 2x to 5x valuation lifts hide."),
        ("15 to 21  |  Leveraged",
         "You are operating at the level most founders never reach. Your IP is a revenue engine, your cap table reflects it, and your contracts protect it. Now the work is compounding: international filings, royalty trusts, IP-backed credit, and acquisition-ready dossiers."),
    ]
    y = PAGE_H - 2.6 * inch
    for title, body in bands:
        c.setFillColor(BG2)
        c.roundRect(0.75 * inch, y - 1.55 * inch, PAGE_W - 1.5 * inch, 1.55 * inch, 12, fill=1, stroke=0)
        c.setFillColor(ACCENT)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(1.0 * inch, y - 0.3 * inch, title)
        c.setFillColor(INK)
        wrap_text(c, body, 1.0 * inch, y - 0.55 * inch, PAGE_W - 2.0 * inch,
                  font="Helvetica", size=10.5, leading=15, color=MUTED)
        y -= 1.75 * inch
    # CTA
    c.setFillColor(INK)
    c.roundRect(0.75 * inch, 0.85 * inch, PAGE_W - 1.5 * inch, 0.95 * inch, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1.0 * inch, 1.5 * inch, "Want a 1:1 walkthrough of your score?")
    c.setFont("Helvetica", 10)
    c.drawString(1.0 * inch, 1.25 * inch, "Book a 30-minute IP leverage call with Hayat Amin.")
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(HexColor("#FAF7F2"))
    c.drawString(1.0 * inch, 1.02 * inch, "usemotion.com/meet/hayat-amin/be")
    footer(c, 10)
    c.showPage()

def main():
    c = canvas.Canvas(str(OUT), pagesize=LETTER)
    c.setTitle("The IP Leverage Audit")
    c.setAuthor("Hayat Amin / Beyond Elevation")
    c.setSubject("A 7-Step Diagnostic for Founders Raising Seed to Series B")
    page_cover(c)        # 1
    page_hook(c)         # 2
    for i in range(7):   # 3..9
        page_question(c, i, i + 3)
    page_scoring(c)      # 10
    c.save()
    size_kb = OUT.stat().st_size / 1024
    print(f"OK  {OUT}  ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
