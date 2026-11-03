# Accuracy of every part in the 3D models

2026-11-03. Generated from `docs/build-truth/geometry/parts.json` (`python -I scripts/build/export_geometry.py`). Tap a part in the 3D view to see the same tag. ESTIMATED shapes are drawn so the part reads right, never quoted as fact.

| Part (parts.py) | Accuracy | Values (mm) | Source | Quote / reason |
|---|---|---|---|---|
| ANTENNA | estimate: check with the real part | height 78.0 | https://rotorvillage.ca/tbs-triumph-pro-sma-rhcp/ | only height and weight published; shape drawn simple |
| CAMERA | datasheet / listing | w 19.0, h 19.0, depth 22.0 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/; https://rotorvillage.ca/runcam-phoenix-2-special-edition/ | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm; Dimensions: 19mm*19mm*22mm ... FOV D:160° H:124° V:95° |
| CAM_TILT | datasheet / listing | default 10.0, min 0.0, max 40.0, step 5.0 | https://oscarliang.com/camera-angle/ | If you're new to FPV, a 10°–15° camera angle is an excellent starting point. |
| CAPACITOR | estimate: check with the real part | dia 10.0, h 20.0 | https://rotorvillage.ca/tbs-source-one-v6-5/; https://oscarliang.com/geprc-taker-f405/ | 35V 1000uF given; can size not published |
| CELL_18650 | datasheet / listing | dia 18.33, len 64.85 | https://rotorvillage.ca/samsung-30q-18650-3000mah-15a-li-ion-2pc/ | Approximate Dimensions: 18.33mm x 64.85mm |
| CHARGER | datasheet / listing | l 75.0, w 54.0, h 30.0 | https://www.toolkitrc.com/m4ac/ | Product size 75*54*30mm |
| ESC | datasheet / listing | w 42.9, d 39.7, holes 30.5 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/ | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm |
| FC | datasheet / listing | w 36.8, d 36.8, holes 30.5 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/ | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm |
| FRAME | maker drawing | wheelbase 240.0, arm_t 6.0, plate_t 2.0, standoff_long 30.0, standoff_short 22.0, standoff_od 5.0, stack_hole 30.5 | https://rotorvillage.ca/tbs-source-one-v6-5/; https://github.com/tbs-trappy/source_one | Wheelbase 5": 240 ... Arm thickness 5": 6mm ... Standoff height: 30 and 22mm; maker drawing, plate and arm outlines; labels '2mm', '6mm' |
| GPS | datasheet / listing | w 28.0, d 21.0, h 9.0 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/; https://shop.pimoroni.com/products/pa1010d-gps-breakout | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm; Dimensions: approx 28x21x9mm |
| HAT | estimate: check with the real part | w 52.32, d 22.99 | https://github.com/sparkfun/Qwiic_Hat_for_Raspberry_Pi | design file may be an earlier revision than DEV-14459 |
| IRON | datasheet / listing | handle_l 110.0, handle_w 16.0, tip_l 115.0, tip_d 5.5 | https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/ | Size of Control Handle: 110x16x15mm |
| LAPTOP | estimate: check with the real part | w 320.0, d 220.0, h 14.0 | none | Shad's own laptop; size unknown |
| LAYOUT | datasheet / listing | pi_x -36.0, standoff 12.0, mlx_gap 4.0, gps_x 58.0, battery_x -4.0, battery_ok_from -10.0, battery_ok_to 2.0, legs_min 4 | docs/build-truth/SIMULATION.md | Recommended layout L515, approved by Shad (DECISIONS.md) |
| LEGS | datasheet / listing | rear_piece 25.0, front_piece 28.0, pieces 2, od 5.0, foot_h 6.3, foot_d 9.6 | https://rotorvillage.ca/m3-x-25mm-knurled-black-textured-stand-off-10pk/; https://rotorvillage.ca/m3-x-28mm-knurled-black-textured-stand-off-10pk/; https://www.getfpv.com/lumenier-m3-rubber-landing-feet-8pcs.html | Material: Aluminum; Height: 25mm; 68 in stock; $7.99; Height: 28mm; 59 in stock; $7.99; Height: 6.3mm; In Stock; $7.99 (US shop) |
| LIPO_BAG | datasheet / listing | w 220.0, d 110.0, h 170.0 | https://rotorvillage.ca/rvs-lipo-storage-bag/ | Height: 170mm Width: 220mm Depth: 110mm |
| MLX | maker drawing | w 19.0, d 22.0, t 2.75, hole_dx 13.6, hole_from_top 2.7 | https://shop.pimoroni.com/products/mlx90640-thermal-camera-breakout | Dimensions: 19x19x2.75mm; Field of view: 55°x35°; drawing: holes 13.60 apart |
| MONITOR | datasheet / listing | w 135.0, d 88.0, h 16.0 | https://rotorvillage.ca/skyzone-m5-diversity-fpv-monitor/ | Dimension: 135x88x16mm |
| MOTOR | datasheet / listing | dia 28.6, height 32.8, shaft_dia 5.0, mount 16.0, lead_len 120.0, lead_awg 20 | https://www.rotorama.com/product/emax-eco-iii-2207-1900kv; https://www.racedayquads.com/products/emax-e3-series-2207-motor-1700kv-1900kv-2400kv | Mounting holes: 16mm M3 ... Outer shaft diameter: 5mm; Motor Dimensions: 28.6 x 32.8 mm ... Lead: 20# AWG 120mm NOTE: Listings disagree on the screw pattern (16 mm vs 19x19 mm). The V6 arm's radial slots (TBS drawing) le |
| MOTOR_SPLIT | estimate: check with the real part | base_h 4.0, bell_h 20.0, shaft_above 8.8 | none | bell/stator/shaft split not published |
| MULTIMETER | datasheet / listing | l 120.0, w 80.0, h 20.0 | https://rotorvillage.ca/flywoo-fpv-quad-tool-kit-w-multimeter-and-soldering-iron/ | Size of Control Handle: 110x16x15mm |
| PACK | datasheet / listing | l 79.0, w 38.0, h 26.0, xt60_lead 85.0, balance_lead 40.0 | https://rotorvillage.ca/gnb-1500mah-4s-120c-hv-lipo-xt60/ | Dimensions: 79mm x 38mm x 26mm (LxWxH) |
| PAD | estimate: check with the real part | t 2.0, margin 3.0 | none | foam/rubber pad: off-the-shelf, size cut to fit |
| PCB_T | estimate: check with the real part | t 1.6 | none | board thickness not published |
| PI | maker drawing | w 65.0, d 30.0, hole_inset 3.5, hole_dx 58.0, hole_dy 23.0 | https://datasheets.raspberrypi.com/rpizero2/raspberry-pi-zero-2-w-product-brief.pdf | Form factor: 65mm×30mm; holes 3.5 from the edges |
| PILOT_CAM | datasheet / listing | hfov 124.0, vfov 95.0 | https://rotorvillage.ca/runcam-phoenix-2-special-edition/ | Dimensions: 19mm*19mm*22mm ... FOV D:160° H:124° V:95° |
| PROP | datasheet / listing | dia 129.54, pitch_in 4.99, hub_bore 5.0, hub_t 7.0, blades 3 | https://rotorvillage.ca/gemfan-51499-hurricane-tri-blade-prop-2cw-2ccw/ | Length: 5.1 inch ... Hub size: 5mm (inner) ... Hub thickness: 7mm |
| QWIIC_CABLE | datasheet / listing | len 150.0 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/; https://www.sparkfun.com/flexible-qwiic-cable-female-jumper-4-pin.html | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm; length is 150mm |
| RADIO | datasheet / listing | w 156.6, d 65.1, h 125.3 | https://rotorvillage.ca/radiomaster-pocket-transmitter-elrs-charcoal-edition/ | 156.6*65.1*125.3mm (Folded size) |
| RX | datasheet / listing | w 13.0, d 11.0, h 3.0, antenna_len 65.0 | https://rotorvillage.ca/radiomaster-rp1-v2-tcxo-expresslrs-2-4ghz-receiver/ | Dimension: 13mm*11mm*3mm ... 65mm 2.4ghz T Antenna |
| SMOKE_STOPPER | datasheet / listing | l 42.0, w 32.0, h 11.0 | https://rotorvillage.ca/iflight-smart-smoke-stopper-xt30-xt60/ | Size(L x W x H): 42 x 32 x 11 mm |
| STACK_GAP | estimate: check with the real part | esc_above_plate 3.0, fc_above_esc 7.0 | none | grommet/nut heights not published |
| STANDOFF_PI | datasheet / listing | len 12.0 | https://rotorvillage.ca/geprc-taker-f405-bls-50a-combo-stack/; https://www.pishop.ca/product/nylon-11mm-m2-5-standoff-set-pack-of-4/ | Size: 42.9×39.7mm, hole30.5×30.5mm ... Size: 36.8×36.8mm; Nylon Standoffs - M2.5x12mm |
| STRAP | datasheet / listing | len 245.0, w 20.0 | https://rotorvillage.ca/rvs-kevlar-battery-strap-2pk/ | Length: 245mm ... Width: 20mm |
| THERMAL_CAM | datasheet / listing | hfov 55.0, vfov 35.0 | https://shop.pimoroni.com/products/mlx90640-thermal-camera-breakout | Dimensions: 19x19x2.75mm; Field of view: 55°x35°; drawing: holes 13.60 apart |
| VTX | datasheet / listing | w 31.0, d 22.0, h 6.0 | https://rotorvillage.ca/tbs-unify-pro-5g8-hv-vtx/ | 31x22x6mm form factor |
