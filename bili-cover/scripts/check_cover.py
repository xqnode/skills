"""Create centered 4:3 QA previews without modifying the source cover."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps


def geometry(width, height):
    crop_width = round(height * 4 / 3)
    if crop_width > width:
        raise ValueError("Image is too narrow for a full-height centered 4:3 crop")
    left = (width - crop_width) // 2
    crop = (left, 0, left + crop_width, height)
    pad_x, pad_y = round(crop_width * .05), round(height * .05)
    inner = (left + pad_x, pad_y, left + crop_width - pad_x, height - pad_y)
    return crop, inner


def ink_fraction(region):
    if region.width == 0 or region.height == 0:
        return 0.0
    pixels = (region.get_flattened_data() if hasattr(region, "get_flattened_data")
              else region.getdata())
    count = sum(min(pixel) < 213 for pixel in pixels)
    return count / (region.width * region.height)


def contains(outer, inner):
    return (outer[0] <= inner[0] and outer[1] <= inner[1]
            and inner[2] <= outer[2] and inner[3] <= outer[3])


def inspect_cover(image, boxes=None, allow_decoration=False):
    width, height = image.size
    crop, inner = geometry(width, height)
    issues, warnings = [], []
    if abs(width - height * 16 / 9) > 1:
        issues.append("ASPECT: full image must be 16:9")
    sides = {
        "left": ink_fraction(image.crop((0, 0, crop[0], height))),
        "right": ink_fraction(image.crop((crop[2], 0, width, height))),
    }
    if allow_decoration and not boxes:
        raise ValueError("--allow-side-decoration requires measured --boxes")
    for side, fraction in sides.items():
        if fraction > .003 and not allow_decoration:
            issues.append(f"MARGIN_CONTENT: {side} buffer has {fraction:.2%} significant ink")
    measured = []
    for item in boxes or []:
        if not isinstance(item, dict):
            raise ValueError("Each box must be an object")
        bbox, label = item.get("bbox"), item.get("label")
        if not isinstance(label, str) or not label:
            raise ValueError("Each box needs a nonempty label")
        if not isinstance(bbox, list) or len(bbox) != 4:
            raise ValueError(f"{label}: bbox needs four coordinates")
        if any(isinstance(v, bool) or not isinstance(v, (int, float))
               or not math.isfinite(v) for v in bbox):
            raise ValueError(f"{label}: coordinates must be finite numbers")
        if not (0 <= bbox[0] < bbox[2] <= width and 0 <= bbox[1] < bbox[3] <= height):
            raise ValueError(f"{label}: invalid or out-of-image bbox")
        safe = contains(crop, bbox)
        if not safe:
            issues.append(f"BOX_CLIPPED: {label} crosses central 4:3 boundary")
        elif not contains(inner, bbox):
            warnings.append(f"BOX_NEAR_EDGE: {label} exceeds recommended inner padding")
        measured.append({"label": label, "bbox": bbox, "inside_4x3": safe})
    return {
        "size": [width, height], "crop_4x3": list(crop),
        "recommended_inner": list(inner), "side_ink_fraction": sides,
        "boxes": measured, "issues": issues, "warnings": warnings,
        "geometry_passed": not issues,
        "requires_visual_review": True,
        "limitation": "Pixel margins and optional measured boxes only; not OCR or text/semantic verification",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--boxes", type=Path)
    parser.add_argument("--allow-side-decoration", action="store_true")
    args = parser.parse_args()
    outputs = ["preview-16x9.png", "preview-4x3.png", "preview-4x3-small.png",
               "safe-area-guide.png", "report.json"]
    try:
        if any((args.out_dir / name).exists() for name in outputs):
            raise ValueError("QA output already exists; choose a new --out-dir")
        boxes = None
        if args.boxes:
            payload = json.loads(args.boxes.read_text(encoding="utf-8-sig"))
            if not isinstance(payload, dict) or not isinstance(payload.get("boxes"), list):
                raise ValueError("Box file must contain a boxes array")
            boxes = payload["boxes"]
        with Image.open(args.image) as source:
            normalized = ImageOps.exif_transpose(source).convert("RGBA")
            image = Image.new("RGBA", normalized.size, "white")
            image.alpha_composite(normalized)
            image = image.convert("RGB")
        report = inspect_cover(image, boxes, args.allow_side_decoration)
        report["source"] = str(args.image.resolve())
        args.out_dir.mkdir(parents=True, exist_ok=True)
        image.save(args.out_dir / outputs[0])
        crop = image.crop(tuple(report["crop_4x3"]))
        crop.save(args.out_dir / outputs[1])
        crop.resize((320, 240), Image.Resampling.LANCZOS).save(args.out_dir / outputs[2])
        guide = image.copy()
        draw = ImageDraw.Draw(guide)
        for bbox, color in [(report["crop_4x3"], "#e23d3d"),
                            (report["recommended_inner"], "#129755")]:
            left, top, right, bottom = bbox
            draw.rectangle((left, top, right - 1, bottom - 1), outline=color, width=3)
        guide.save(args.out_dir / outputs[3])
        (args.out_dir / outputs[4]).write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False))
        return 0 if report["geometry_passed"] else 2
    except (ValueError, OSError, TypeError) as error:
        parser.exit(1, f"check_cover: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
