// Plain meanings for words in the lessons, copied word for word from the guide's "Words used in this guide" list.
// re = the word(s) as they appear in captions (whole word, any case); term/def = the guide's entry.
export const GLOSSARY = [
 {
  "re": "ESCs?",
  "term": "ESC (speed controller)",
  "def": "the board that drives the four motors. Here it is the 50 A four-in-one board in the stack."
 },
 {
  "re": "FC",
  "term": "FC (flight controller)",
  "def": "the board with the gyro that keeps the drone level and talks to the receiver."
 },
 {
  "re": "stack",
  "term": "The stack",
  "def": "the flight controller and the ESC stacked on the same four screws."
 },
 {
  "re": "VTX",
  "term": "VTX (video transmitter)",
  "def": "sends the camera picture to the monitor."
 },
 {
  "re": "receiver",
  "term": "Receiver",
  "def": "gets your stick commands from the radio."
 },
 {
  "re": "ELRS|ExpressLRS",
  "term": "ELRS (ExpressLRS)",
  "def": "the radio link system the radio and the receiver both use."
 },
 {
  "re": "UART\\d?",
  "term": "UART",
  "def": "a numbered pair of pads (TX and RX) on the flight controller for talking to one device. This one has 6."
 },
 {
  "re": "AWG",
  "term": "AWG",
  "def": "wire thickness. A bigger number is a thinner wire."
 },
 {
  "re": "4S",
  "term": "4S",
  "def": "a battery of 4 cells in a row."
 },
 {
  "re": "LiPo|LiHV|LiHv",
  "term": "LiPo / LiHV",
  "def": "lithium polymer battery / the high-voltage kind, charged to 4.35 V a cell."
 },
 {
  "re": "windings",
  "term": "Windings",
  "def": "the copper wire coils inside a motor."
 },
 {
  "re": "threadlock(er)?",
  "term": "Threadlock",
  "def": "liquid that stops a screw working loose. The blue kind can still be undone."
 },
 {
  "re": "standoffs?",
  "term": "Standoff",
  "def": "a metal or nylon post with threads that holds two plates apart."
 },
 {
  "re": "grommets?",
  "term": "Grommets",
  "def": "soft rubber rings the stack sits on to soak up vibration."
 },
 {
  "re": "tinning|tinned|tin",
  "term": "Tinning",
  "def": "putting a thin layer of solder on a pad or wire end before joining them."
 },
 {
  "re": "polarity",
  "term": "Polarity",
  "def": "which side is + and which is -."
 },
 {
  "re": "solder bridge|bridge",
  "term": "Solder bridge",
  "def": "solder that joins two pads that must stay separate."
 },
 {
  "re": "XT60",
  "term": "XT60",
  "def": "the yellow battery plug on the packs and the drone."
 },
 {
  "re": "smoke stopper",
  "term": "Smoke stopper",
  "def": "a plug-in fuse for the first power-up. It cuts out at 1.2 A."
 },
 {
  "re": "OSD",
  "term": "OSD",
  "def": "the text drawn on top of the video (battery, timer). The flight controller has one."
 },
 {
  "re": "CRSF",
  "term": "CRSF",
  "def": "the language the receiver uses to talk to the flight controller. You pick it in Betaflight."
 },
 {
  "re": "bind",
  "term": "Bind",
  "def": "pairing the radio with the receiver so it only listens to your radio."
 },
 {
  "re": "Betaflight",
  "term": "Betaflight",
  "def": "the free program on your laptop that sets up the flight controller."
 },
 {
  "re": "payload",
  "term": "Payload",
  "def": "everything the drone carries for the job: the Pi, the thermal camera and the GPS."
 },
 {
  "re": "hover",
  "term": "Hover",
  "def": "staying still in the air."
 },
 {
  "re": "throttle",
  "term": "Throttle",
  "def": "the stick that sets motor speed."
 },
 {
  "re": "Pi",
  "term": "Pi",
  "def": "the Raspberry Pi, a small computer (common usage)."
 },
 {
  "re": "props|propellers",
  "term": "Props, CW and CCW",
  "def": "the propellers; clockwise and counter-clockwise, the two spin directions (common usage)."
 },
 {
  "re": "M[1-4](?!\\.\\d|\\d|\\s?x\\s?\\d)",
  "term": "M1 to M4",
  "def": "the four motor numbers (common usage)."
 },
 {
  "re": "bench",
  "term": "Bench",
  "def": "your work table (common usage)."
 }
];
