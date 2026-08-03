#!/usr/bin/env python3
"""Generate PDF versions of the two Codex sources that are not native PDFs."""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
MASTER_PATH = ROOT / "resources" / "master.json"
POINT_BUY_IMAGE = ROOT / "resources" / "images" / "ability-score-point-costs-v2.jpg"


def ascii_text(value: object) -> str:
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
    }
    text = str(value)
    for original, replacement in replacements.items():
        text = text.replace(original, replacement)
    return text.encode("latin-1", "replace").decode("latin-1")


def draw_page_frame(canvas, document) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#B89A5A"))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#5F594E"))
    canvas.drawString(18 * mm, 10 * mm, "Catacombs & Starspawns - Source Library")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()


def generate_point_buy_pdf() -> Path:
    output = OUTPUT_DIR / "ability-score-point-costs-v2.pdf"
    document = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Ability Score Point Costs V2",
        author="Catacombs & Starspawns",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "PointBuyTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#2A251D"),
        spaceAfter=7 * mm,
    )
    image = Image(str(POINT_BUY_IMAGE))
    available_width = A4[0] - 36 * mm
    available_height = A4[1] - 63 * mm
    scale = min(available_width / image.imageWidth, available_height / image.imageHeight)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    document.build(
        [
            Paragraph("Ability Score Point Costs V2", title),
            image,
        ],
        onFirstPage=draw_page_frame,
        onLaterPages=draw_page_frame,
    )
    return output


def value_table(value: object, styles) -> Table | None:
    if isinstance(value, list) and value and all(isinstance(item, dict) for item in value):
        columns = list(value[0].keys())
        rows = [[Paragraph(f"<b>{ascii_text(column.title())}</b>", styles["TableCell"]) for column in columns]]
        rows.extend(
            [Paragraph(ascii_text(item.get(column, "")), styles["TableCell"]) for column in columns]
            for item in value
        )
        widths = [(A4[0] - 36 * mm) / len(columns)] * len(columns)
    elif isinstance(value, dict) and value:
        rows = [[Paragraph("<b>Class</b>", styles["TableCell"]), Paragraph("<b>Recorded value</b>", styles["TableCell"])]]
        rows.extend(
            [Paragraph(ascii_text(key).title(), styles["TableCell"]), Paragraph(ascii_text(item), styles["TableCell"])]
            for key, item in value.items()
        )
        widths = [42 * mm, A4[0] - 78 * mm]
    else:
        return None

    result = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8DFC9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#2A251D")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B8AD96")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return result


def generate_reconciliation_pdf(master: dict) -> Path:
    output = OUTPUT_DIR / "master-content-reconciliation-notes.pdf"
    document = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Master Content Reconciliation Notes",
        author="Catacombs & Starspawns",
    )
    base = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "NotesTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=colors.HexColor("#2A251D"),
            spaceAfter=5 * mm,
        ),
        "Intro": ParagraphStyle(
            "NotesIntro",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#514A3F"),
            spaceAfter=6 * mm,
        ),
        "Heading": ParagraphStyle(
            "ConflictHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#6F5423"),
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
            keepWithNext=True,
        ),
        "Body": ParagraphStyle(
            "ConflictBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#302C26"),
            spaceAfter=3 * mm,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=10,
            textColor=colors.HexColor("#302C26"),
        ),
    }

    conflicts = master.get("sourceConflicts", [])
    story = [
        Paragraph("Master Content Reconciliation Notes", styles["Title"]),
        Paragraph(
            "Maintainer record of source conflicts, missing material, and current app choices. "
            "These notes do not replace the original documents. Confirm unresolved rules with the DM.",
            styles["Intro"],
        ),
        Paragraph(f"{len(conflicts)} recorded source issues", styles["Intro"]),
    ]

    for index, conflict in enumerate(conflicts, start=1):
        if index == 11:
            story.append(PageBreak())
        story.append(Paragraph(f"{index}. {ascii_text(conflict['topic'])}", styles["Heading"]))
        story.append(Paragraph(ascii_text(conflict["note"]), styles["Body"]))
        for key, value in conflict.items():
            if key in {"topic", "note"}:
                continue
            detail_label = {
                "perClass": "Per-class values",
                "handbookCh2CoreTraits": "Handbook Ch. 2 core traits",
            }.get(key, ascii_text(key))
            story.append(Paragraph(detail_label, styles["Body"]))
            detail_table = value_table(value, styles)
            if detail_table:
                story.extend([detail_table, Spacer(1, 2 * mm)])

    document.build(story, onFirstPage=draw_page_frame, onLaterPages=draw_page_frame)
    return output


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    generated = [generate_point_buy_pdf(), generate_reconciliation_pdf(master)]
    for path in generated:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
