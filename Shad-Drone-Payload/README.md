# Shad Drone Payload

Tested Python payload for the selected **Raspberry Pi Zero 2 WH + Pimoroni MLX90640 (55°) + Pimoroni PA1010D** design. Hardware interfaces follow the manufacturers' APIs; physical airborne operation still requires the checklist below.

## Wiring and power

- Use the Pi Zero 2 WH's **pre-soldered 2×20 header** and SparkFun DEV-14459 Qwiic HAT.
- Solder the included straight 1×5 male headers onto the thermal and GPS breakouts.
- Connect each breakout to a HAT port with a **CAB-17261 female-jumper** cable (not the PRT-17912 breadboard-jumper: its rigid GND/3V3/SDA/SCL block cannot match the Pimoroni header). The Pimoroni 1×5 order is **3V3, SDA, SCL, INT, GND** — the fourth position is skipped — while the cable colours are black GND, red 3V3, blue SDA, yellow SCL. Ignore the Qwiic HAT silkscreen: SparkFun states its SDA/SCL labels are reversed. Thermal address `0x33`; GPS `0x10`.
- Mount the thermal lens downward and GPS ceramic antenna upward, with independent retention. Never let either board touch carbon fibre.
- Bench power: the Pi-hole kit's **5.1V/2.5A micro-USB supply**.
- Aircraft power: the GEPRC stack's regulated **5V/3A** output through the 24AWG micro-USB cable modified as a power-only pigtail. Disconnect USB data lines and verify polarity/voltage with the multimeter before connecting the Pi. The analog VTX is powered separately from 4S, not from this 5V rail.
- Install dependencies and run synthetic tests **before flight**. The 9/9 claim from the old guide has been replaced by the actual test suite in this folder.

## Install on Raspberry Pi OS

Enable I2C, then in a virtual environment:

```bash
sudo raspi-config nonint do_i2c 0
```

Set the I2C bus to 400 kHz. The Pi takes the speed from its config file; a `frequency=` argument in the code is ignored
(the audit's finding). Add this line to `/boot/firmware/config.txt` (Pi OS bookworm and later; `/boot/config.txt` before bookworm),
then reboot (source: Adafruit's "Change the Clock Speed" guide):

```
dtparam=i2c_arm_baudrate=400000
```

Check that both sensors answer after the reboot (camera at 0x33, GPS at 0x10): `sudo i2cdetect -y 1`.
**How to read the bus speed back: not confirmed.** No source found for a command that reports it; do not rely on one.

```bash
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m unittest -v test_drone_logic.py
```

`pa1010d` depends on `smbus`/`pynmea2`; use its official repository if platform installation help is needed: <https://github.com/pimoroni/pa1010d-python>.

## Verify the demo

```bash
python payload.py --demo
python payload.py --demo --serve
```

Open `http://127.0.0.1:8000`. The viewer is an **offline coordinate plot**, not internet map tiles. `flight-log.jsonl` is the authoritative append-only record.

## Run on hardware

1. Complete `python -m unittest -v test_drone_logic.py` first.
2. Set heading clockwise from north with `--heading`; the code does not infer reliable heading while stationary.
3. Put the GPS antenna outside with a clear sky view and wait for a fix.
4. Switch the payload on **while the drone sits on the ground**: the first GPS fix becomes the ground height (GPS altitude is above
   sea level, Edmonton is about 670 m) and the code uses *height above ground* for the footprint. Or give it yourself:
   `python payload.py --serve --heading 0 --ground-alt-m 670`. Frames at or below that ground height are skipped, not guessed.
5. Run `python payload.py --serve --heading 0`.
   Bench test with no GPS (the mug test, indoors): `python payload.py --bench` reads only the thermal camera and prints
   every hot spot it finds. It writes nothing to the flight log.
6. Validate the thermal frame, GPS fix quality, logged coordinates and failsafes on the bench.
7. Use repeated controlled hot/cold targets and surveyed positions to measure detection and geolocation errors before any flight.

## Tests

The standard-library suite covers no/single/multiple hotspots, 4-connectivity, diagonals, minimum size, edge wrapping, threshold inclusion, invalid inputs, 55°×35° footprint math, heading rotation, coordinate validation, persistence, the end-to-end synthetic pipeline, height above ground (a sea-level GPS altitude must not be used as height) and a loop that survives GPS timeouts and I2C errors, and the bench mode for the mug test (31 tests). It does **not** claim to test physical hardware or airborne accuracy.

## Limitations

Ideal-nadir geometry omits tilt, terrain, lens distortion and GPS/altitude/heading errors. A low-resolution hotspot is not proof of fire or proof that an area is safe. Do not fly near a wildfire; complete Transport Canada registration/certification, RF, airspace, NOTAM, privacy and site checks before operation.

The position of a hot spot assumes the drone faces north (`--heading 0`; the code never reads a compass), the camera
looks straight down (stop and hover level before a reading), and the ground below is at the take-off height (take off
at about the same level as the search area). A simulation of this code put a fire 11.4 m off when facing east and
5.1 m off at 10 degrees nose down. Not measured on the real drone.
