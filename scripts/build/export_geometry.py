"""
export_geometry.py - write the design inputs as plain files, so anyone (a Fable session included) can write their
own checker without reading my scripts.

    python -I scripts/build/export_geometry.py

Writes docs/build-truth/geometry/:
  parts.json          every size in parts.py with its accuracy tag (CAD / DATASHEET / ESTIMATED), source and quote
  weights.json        sourced weights (from the Builder's weight table, reused with its sources) plus my flags
  frame_outlines.json the TBS V6 outlines and bottom-plate windows (from extract_so1v6.py), millimetres
Units: millimetres and grams. Axes: +X forward (camera end), +Y left, Z up, origin = stack centre on the underside
of the bottom plate.
"""

import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "docs", "build-truth", "geometry")
sys.path.insert(0, HERE)
import parts as S  # noqa: E402

# Where each parts.py "src" id points (URLs and quotes are the ones in STEP-TRUTH.md's source list).
SOURCES = {
    "R2": ("https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/", "Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm"),
    "R3": ("https://rotorvillage.ca/tbs-source-one-v6-5/", "Wheelbase 5\": 240 ... Arm thickness 5\": 6mm ... Standoff height: 30 and 22mm"),
    "TBS So1-V6-2025-AUG-19.dxf": ("https://github.com/tbs-trappy/source_one", "maker drawing, plate and arm outlines; labels '2mm', '6mm'"),
    "R4": ("https://www.rotorama.com/product/emax-eco-iii-2207-1900kv", "Mounting holes: 16mm M3 ... Outer shaft diameter: 5mm"),
    "R5": ("https://www.racedayquads.com/products/emax-e3-series-2207-motor-1700kv-1900kv-2400kv", "Motor Dimensions: 28.6 x 32.8 mm ... Lead: 20# AWG 120mm"),
    "R6": ("https://rotorvillage.ca/gemfan-51499-hurricane-tri-blade-prop-2cw-2ccw/", "Length: 5.1 inch ... Hub size: 5mm (inner) ... Hub thickness: 7mm"),
    "R7": ("https://rotorvillage.ca/radiomaster-rp1-v2-tcxo-expresslrs-2-4ghz-receiver/", "Dimension: 13mm*11mm*3mm ... 65mm 2.4ghz T Antenna"),
    "R8": ("https://rotorvillage.ca/tbs-unify-pro-5g8-hv-vtx/", "31x22x6mm form factor"),
    "R10": ("https://rotorvillage.ca/tbs-triumph-pro-sma-rhcp/", "Height: 78mm"),
    "R11": ("https://www.toolkitrc.com/m4ac/", "Product size 75*54*30mm"),
    "R-M7AC": ("https://www.amainhobbies.com/toolkitrc-m7-ac-dc-battery-charger-6s-20a-300w-tlk-m7ac/p1445726", "Size: 112x73x38mm; Weight: 245g"),
    "R12": ("https://rotorvillage.ca/gnb-1500mah-4s-120c-hv-lipo-xt60/", "Dimensions: 79mm x 38mm x 26mm (LxWxH)"),
    "R-MV5000": ("https://rotorvillage.ca/more-volts-4s-5000mah-li-ion-battery/", "Weight: 307.9g (±5 g); Dimensions (L×W×H): ~79.15 x 44.25 x 44.25 mm; Amass XT60H + 4S JST-XH balance lead"),
    "R13": ("https://rotorvillage.ca/radiomaster-pocket-transmitter-elrs-charcoal-edition/", "156.6*65.1*125.3mm (Folded size)"),
    "R14": ("https://rotorvillage.ca/iflight-smart-smoke-stopper-xt30-xt60/", "Size(L x W x H): 42 x 32 x 11 mm"),
    "R15": ("https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/", "Size of Control Handle: 110x16x15mm"),
    "R16": ("https://rotorvillage.ca/rvs-lipo-storage-bag/", "Height: 170mm Width: 220mm Depth: 110mm"),
    "R17": ("https://rotorvillage.ca/skyzone-m5-diversity-fpv-monitor/", "Dimension: 135x88x16mm"),
    "R18": ("https://rotorvillage.ca/rvs-kevlar-battery-strap-2pk/", "Length: 245mm ... Width: 20mm"),
    "R19": ("https://shop.pimoroni.com/products/mlx90640-thermal-camera-breakout", "Dimensions: 19x19x2.75mm; Field of view: 55°x35°; drawing: holes 13.60 apart"),
    "R20": ("https://shop.pimoroni.com/products/pa1010d-gps-breakout", "Dimensions: approx 28x21x9mm"),
    "R22": ("https://www.sparkfun.com/flexible-qwiic-cable-female-jumper-4-pin.html", "length is 150mm"),
    "R25": ("https://www.pishop.ca/product/nylon-11mm-m2-5-standoff-set-pack-of-4/", "Nylon Standoffs - M2.5x12mm"),
    "R34": ("https://oscarliang.com/geprc-taker-f405/", "1x 35V 1000uF capacitor"),
    "pizero2-brief": ("https://datasheets.raspberrypi.com/rpizero2/raspberry-pi-zero-2-w-product-brief.pdf", "Form factor: 65mm×30mm; holes 3.5 from the edges"),
    "SparkFun Qwiic_Hat_for_Raspberry_Pi .brd": ("https://github.com/sparkfun/Qwiic_Hat_for_Raspberry_Pi", "board outline 52.32 x 22.99 mm (Eagle layer 20)"),
    "rv sam30q": ("https://rotorvillage.ca/samsung-30q-18650-3000mah-15a-li-ion-2pc/", "Approximate Dimensions: 18.33mm x 64.85mm"),
    "rv-phoenix": ("https://rotorvillage.ca/runcam-phoenix-2-special-edition/", "Dimensions: 19mm*19mm*22mm ... FOV D:160° H:124° V:95°"),
    "oscarliang camera-angle": ("https://oscarliang.com/camera-angle/", "If you're new to FPV, a 10°–15° camera angle is an excellent starting point."),
    "rv-so25": ("https://rotorvillage.ca/m3-x-25mm-knurled-black-textured-stand-off-10pk/", "Material: Aluminum; Height: 25mm; 68 in stock; $7.99"),
    "rv-so28": ("https://rotorvillage.ca/m3-x-28mm-knurled-black-textured-stand-off-10pk/", "Height: 28mm; 59 in stock; $7.99"),
    "gf-feet": ("https://www.getfpv.com/lumenier-m3-rubber-landing-feet-8pcs.html", "Height: 6.3mm; In Stock; $7.99 (US shop)"),
    "sim L515, Shad option 1": ("docs/build-truth/SIMULATION.md", "Recommended layout L515, approved by Shad (DECISIONS.md)"),
    "none": ("", "no source: drawn"),
}
CAD = {"FRAME", "PI", "MLX", "HAT"}


def tag(name, d):
    if d.get("approx"):
        return "ESTIMATED"
    return "CAD" if name in CAD else "DATASHEET"


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = {}
    for name, d in vars(S).items():
        if not (isinstance(d, dict) and "src" in d and "approx" in d):
            continue
        srcs = [s for s in SOURCES if s != "none" and s in d["src"]] or [d["src"]]
        rows[name] = {
            "values_mm": {k: v for k, v in d.items() if k not in ("src", "approx", "why", "mass_g")},
            "accuracy": tag(name, d),
            "why_estimated": d.get("why", ""),
            "sources": [{"id": s, "url": SOURCES.get(s, ("", ""))[0], "quote": SOURCES.get(s, ("", ""))[1]} for s in srcs],
        }
        if "mass_g" in d:
            rows[name]["mass_g"] = d["mass_g"]                # grams, kept out of values_mm
    rows["MOTOR"]["note"] = ("Listings disagree on the screw pattern (16 mm vs 19x19 mm). The V6 arm's radial slots "
                             "(TBS drawing) let screw centres sit 8.0-9.5 mm from the shaft, so either pattern fits.")
    with open(os.path.join(OUT, "parts.json"), "w", encoding="utf-8") as f:
        json.dump({"units": "mm", "axes": "+X forward, +Y left, Z up; origin stack centre, underside of bottom plate",
                   "parts": rows, "motor_layout": S.MOTOR_LAYOUT,
                   "motor_xy_mm": {m: S.motor_xy(m) for m in S.MOTOR_LAYOUT}}, f, indent=1, ensure_ascii=False)
    shutil.copyfile(os.path.join(HERE, "data", "so1v6_outlines.json"), os.path.join(OUT, "frame_outlines.json"))
    print("WROTE", os.path.relpath(os.path.join(OUT, "parts.json"), ROOT), len(rows), "parts")


if __name__ == "__main__":
    main()
