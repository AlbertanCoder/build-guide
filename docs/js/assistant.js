/*!
 * Guide Assistant — an offline-first question answering panel for
 * "Shad's Fire-Detecting Drone — Step-by-Step Build Guide".
 *
 * Three deliberate design rules, because the guide's whole value is that it
 * only states what was checked:
 *
 *   1. Grounded. Every answer comes from a curated troubleshooting entry or a
 *      passage lifted out of this page at runtime. Nothing is generated from a
 *      model unless GUIDE_ASSISTANT.endpoint is configured (see worker.js).
 *   2. Honest. When the answer is not in the guide, it says so and points at
 *      tab 7 (Honest limits & sources) instead of guessing. It never invents a
 *      price, a part number or a regulation.
 *   3. Offline. No network, no key, no font or CDN. It works from file:// in
 *      the single-file build, exactly like the rest of the page.
 *
 * Public surface (used by the self-test and by the optional LLM bridge):
 *   window.GuideAssistant.ask(text)        -> promise of a rendered message
 *   window.GuideAssistant.jump(tab, step)  -> open a tab / assembly step
 *   window.GuideAssistant.selfTest()       -> [{ name, ok, info }]
 *   window.GuideAssistant.kb               -> curated entries (read-only)
 */
(function () {
  "use strict";

  /* ---------- config ---------- */
  const CONFIG = window.GUIDE_ASSISTANT || {};
  /* Set window.GUIDE_ASSISTANT = { endpoint: "https://your-worker.dev/ask" }
     before this file loads to let a model write the answers. The page stays
     fully functional without it. Never put an API key in this file. */
  let ENDPOINT = typeof CONFIG.endpoint === "string" ? CONFIG.endpoint.trim() : "";
  /* True once our own server answered /api/health, even with no key saved yet:
     the settings drawer must work before AI does, or the first key can never
     be entered from the page. */
  let SERVER_PRESENT = false;
  /* job 8: what /api/health last said (month's spend, where questions go), and whether this is an unpaired phone */
  let HEALTH = null;
  let PAIR_NEEDED = false;
  const DEVICE_KEY = "ga-device-token";

  /* ?endpoint=http://localhost:8790/api/ask points any copy of this page at a
     proxy (handy for testing); #ga-local forces the offline engine even then. */
  (function applyUrlOverrides() {
    const query = String(location.search || "").replace(/^\?/, "");
    const params = {};
    query.split("&").forEach(function (pair) {
      if (!pair) { return; }
      const i = pair.indexOf("=");
      params[decodeURIComponent(i === -1 ? pair : pair.slice(0, i))] =
        i === -1 ? "1" : decodeURIComponent(pair.slice(i + 1));
    });
    if (params.endpoint) { ENDPOINT = params.endpoint; }
    if (/ga-local/.test(String(location.hash))) { ENDPOINT = ""; }
  })();

  const STORE = "shad-drone-guide-v1-assistant";
  const MAX_TURNS = 40;

  /* The page's places (Home, Build, Buy, Fly safely) and the pages inside Learn. */
  const TABS = {
    home: "Home", steps: "Build", parts: "Buy", fly: "Fly safely",
    why: "Learn: What & Why", build: "Learn: How it works", plan: "Learn: Plan",
    career: "Learn: Career & pay", quiz: "Learn: Quizzes", limits: "Learn: Limits & sources"
  };

  /* C3: how to reach the AI answers. No fixed address: the launcher starts THIS folder's server and opens it,
     and refuses a server that belongs to another copy of the guide. */
  const START_HINT = "Double-click Start Guide Assistant.cmd in this guide's folder: it starts this folder's guide server (node server/assistant-server.js) and opens the page.";

  /* ---------- knowledge base helpers ---------- */
  /* kb(id, title, "tag,tag,tag", [steps], { note, why, next, src, see }) */
  const KB = [];
  function kb(id, title, tags, steps, extra) {
    const entry = {
      id: id, title: title, tags: tags.split(","), steps: steps,
      note: "", why: "", src: "", see: [], next: ""
    };
    if (extra) { for (const k in extra) { if (extra[k]) entry[k] = extra[k]; } }
    KB.push(entry);
    return entry;
  }
  /* see: [label, tab, stepNumber?] — the step number is optional */
  const STEP = function (n, label) { return [label || ("Step " + n), "steps", n]; };

  /* ======================================================================
     SAFETY FIRST — these are ordered before anything clever on purpose
     ====================================================================== */
  kb("props-on", "Props on while you are still configuring", "props,prop,propeller,propellers,armed,motor spins,spinning,cut,injury,hand,fingers,betaflight motors tab,bench test",
    ["Take the props off before you touch Betaflight, the receiver or any wiring. That is the rule the guide repeats in steps 1, 2, 3 and 8.",
     "With props off you can still check motor order and direction: Betaflight → Motors tab → enable the safety checkbox → spin each motor at a low value.",
     "Props go on last — only after the receiver, modes, failsafe and video all work — and come off first before anything is changed.",
     "Treat every powered quad as armed. A 5-inch prop at idle cuts skin; at power it injures badly."],
    { note: "If a prop is already spinning and something is wrong: pull the battery, not the radio. Disconnect the XT60 first.", why: "The guide calls this 'the cardinal rule of the hobby' and repeats it at every step for a reason: a spinning 5-inch prop is the only part of this build that can hurt you in a fraction of a second.", src: "Guide steps 1, 2, 3, 8 and the airframe quiz", see: [STEP(8), ["Airframe quiz", "quiz"]] })
    .next = "motor-order";

  kb("lipo-swollen", "LiPo is swollen, warm, puffy or damaged", "lipo,swollen,puffy,puffed,round,hot,warm,smoke,fire,damaged,battery,charge,charging,storage,retire,dispose,recycle,vent",
    ["Stop. Do not charge it, do not fly it, do not 'test it once more'.",
     "Move it away from anything flammable — outdoors on concrete or gravel is right, a bag on a wooden bench is not.",
     "Do not puncture it or put it in household garbage. Take it to a battery recycling depot.",
     "For packs you are keeping: storage-charge them (LipoStorage, 3.85 V per cell) when you are not flying for a while.",
     "Charge only inside a closed LiPo bag, on a non-flammable surface, with you in the room the whole time."],
    { note: "LiPo fires are the genuine hazard in this hobby. Everything else in this build fails safely; a pack does not.", why: "The charger pack here is a 4S HV LiPo and a damaged cell can vent flame with no warning, so the rule is dispose first, investigate never.", src: "Guide step 5 and the airframe quiz", see: [STEP(5), ["LiPo safety lines", "steps"]] })
    .next = "charger-setup";

  kb("vtx-no-antenna", "I powered the VTX without its antenna", "vtx,antenna,burn,burnt,no antenna,unify,tbs,hot,video dead,sma,rp-sma,transmitter,damage",
    ["Power down now and fit the antenna. Never power a VTX with nothing connected to the SMA.",
     "Check whether it survived: antenna on, battery connected, monitor on the right channel. A few seconds unloaded often survives; a minute usually does not.",
     "Feel the VTX body — it should be warm, not painful to hold. A cooked one runs scalding hot and drops power or goes silent.",
     "Confirm the connector: the TBS Unify Pro 5G8 HV and the TBS Triumph PRO antenna in this plan are both SMA. Forcing an RP-SMA wrecks the centre pin and gives a link that works at 2 m and dies at 50 m."],
    { note: "The guide's step 4 warning: never power the VTX without its antenna screwed on.", src: "Guide step 4", see: [STEP(4, "Step 4 — control and video")] })
    .next = "no-video";

  kb("video-antenna", "Which antenna goes on the video transmitter?", "which antenna,video antenna,vtx antenna,triumph,diamond,5.8,5.8ghz,rhcp,sma,antenna for the vtx,what antenna,crossfire antenna",
    ["The TBS Triumph PRO SMA RHCP, which the order list uses. It covers 5500 to 6000 MHz, the band the video transmitter sends on.",
     "The TBS Diamond is a different antenna: 850 to 950 MHz, made for a Crossfire link. It is the wrong band for video, so it is not in this plan.",
     "Screw the antenna on before any power, every time."],
    { note: "The Rotor Village listing for the Triumph PRO gives the frequency range 5500-6000 MHz; the Diamond's 850-950 MHz range is from the earlier order list.", src: "Parts list and Guide step 4", see: [STEP(4, "Step 4 — control and video")] });

  kb("sensor-5v", "I put 5V on the thermal camera or GPS", "5v,sensor,dead,magic smoke,3v3,3.3v,mlx90640,gps,pa1010d,qwiic,hat,burnt,sensor dead",
    ["Those breakout boards are 3.3 V Qwiic devices, and 5 V on the 3V3 rail usually kills them outright — there is no protection to save you.",
     "Test before you replace anything: run sudo i2cdetect -y 1 and look for 33 (thermal) and 10 (GPS).",
     "If only one address is missing, only that board is gone. If neither appears, re-check the HAT seating and the header solder joints first — that failure looks identical.",
     "Replace a suspect board rather than living with it. A partly damaged sensor returns plausible-looking garbage, which is worse than a dead one."],
    { note: "Guide step 6 warning, verbatim: sensors are 3.3V only — never put 5V on them.", src: "Guide step 6", see: [STEP(6, "Step 6 — wire the Pi payload"), ["Weekend 2 checklist", "plan"]] })
    .next = "i2c-detect";

  kb("wildfire-law", "Can I fly near a wildfire to test this?", "fire,wildfire,forest,601.15,notam,legal,fly over,5 nautical,9.3 km,3000 ft,emergency,permission",
    ["No. CAR 601.15 prohibits operating over a forest-fire area, or within 5 NM (9.3 km) of it below 3,000 ft AGL, and NOTAM-restricted airspace is closed to you as well.",
     "An active fire creates its own emergency airspace. Firefighting aircraft operate low and fast and are not looking for your quad.",
     "Use the guide's substitute: a controlled warm target such as a mug of hot water among cold objects, on private land with permission, at a legal test site.",
     "Write down what you measured. That controlled test is the evidence; a wildfire is not a test range."],
    { note: "Illegal and dangerous, regardless of how good the thermal data would be.", why: "This is the one mission that looks obvious and is the one you must not fly — which is why the final exam asks about it directly.", src: "CAR 601.15 · Guide rules quiz", see: [["Rules quiz", "quiz"], ["Honest limits & sources", "limits"]] })
    .next = "people-30m";

  kb("people-30m", "How close can I fly to people?", "people,person,30 metres,meters,30m,basic,crowd,bystander,public,over people,horizontal,bystanders",
    ["Under Basic operations: more than 30 m (100 ft) horizontally from any person, at all times.",
     "Closer than that becomes Advanced operations territory — different certificate, different rules, different conversation with an insurer.",
     "Basic conditions the guide lists: VLOS, \u226425 kg, uncontrolled airspace, more than 5.6 km from certified airports and more than 1.9 km from heliports.",
     "Keep the aircraft in sight without aids, and keep every other rule in force: aerodromes, NOTAMs, site permission, fire rules."],
    { why: "The 30 m figure is a category boundary, not a safety suggestion: crossing it changes which certificate the flight requires.", src: "Transport Canada — Basic operations · Guide rules quiz", see: [["Rules quiz", "quiz"], ["Honest limits & sources", "limits"]] })
    .next = "certification";

  kb("first-power-smoke", "Smoke, sparks or a hot smell on first power-up", "smoke,smoke stopper,short,pop,spark,burning,smell,capacitor,cap,polarity,first power,smoked,blew up",
    ["Pull the battery immediately and let everything cool before you touch it.",
     "Never re-power to 'see if it does it again'. The smoke was the diagnosis.",
     "Inspect in this order: battery-lead polarity, capacitor orientation, solder bridges on the ESC pads, motor wires shorting to carbon, a damaged motor winding.",
     "Use the meter: continuity across the XT60 should not read shorted, and neither should neighbouring motor pads.",
     "First power always goes through the iFlight smoke stopper in this plan. Direct connection is how you turn an $86 stack into a story."],
    { note: "Glasses on, window open, and never leave a LiPo connected unattended while you work.", src: "Guide step 3 — solder the stack", see: [STEP(3, "Step 3 — solder the stack"), ["Weekend 1 checklist", "plan"]] })
    .next = "esc-desync";

  /* ======================================================================
     RADIO LINK — RadioMaster Pocket (ELRS) + RP1 V2 receiver
     ====================================================================== */
  kb("rx-wont-bind", "Receiver won't bind", "bind,binding,elrs,rp1,receiver,led,blinking,solid,lua,pair,wont bind,not binding,no bind,model mismatch",
    ["Check the ELRS major version first: the first number of the Version string must match between the transmitter module and the receiver. 3.x talks to 3.x; 3.x will never bind to 2.x.",
     "Confirm the receiver has power — RP1 V2 wants 5V and GND — and that its UFL antenna is clicked on. Binding with no antenna fails and risks the PA.",
     "Bind from the radio: ELRS Lua script → [Bind]. On newer ExpressLRS the same menu also offers the bench bind options; those need a current Betaflight (4.5 or newer) on the flight controller, so check your version before relying on them.",
     "Or bind without the radio: press and hold the receiver's bind button for about 1.5 s, or short the boot pad to ground, then power it.",
     "Read the LED: double blink, pause, repeat = sitting in bind mode. Solid = bound. Three fast blinks then a pause = Model Mismatch (fix Model Match in the Lua, or toggle it off and on while both ends are powered).",
     "Once bound, the Lua script shows a C in the top right when the receiver is connected and talking."],
    { note: "Bind with the flight controller powered from USB and props off. You are one accidental arm command from a bench injury otherwise.", why: "Almost every 'won't bind' case is a firmware major-version mismatch or a receiver that is not actually powered — both are visible in under a minute before you touch anything else.", src: "ExpressLRS binding docs · Guide weekend 1 task 4", see: [STEP(4, "Step 4 — add the receiver"), ["Weekend 1 checklist", "plan"]] })
    .next = "no-channels";

  kb("no-channels", "Sticks do nothing in Betaflight's Receiver tab", "channels,sticks,no input,no movement,receiver tab,uart,uart2,serial rx,crsf,rp1,sbus,protocol,mode",
    ["Wiring first, because this is where it usually breaks: receiver TX → flight controller R2 and receiver RX → flight controller T2. The guide is explicit that you do not use the PWM-only ER4 example.",
     "Ports tab: turn on Serial RX for UART2 only (not UART1, not both).",
     "Configuration tab: Receiver protocol = CRSF, and make sure telemetry is on if you want link data.",
     "Check the receiver is actually bound (solid LED) and that the radio's model is the one with the ELRS module active.",
     "Then check channel map — AETR is the usual default — and confirm the arm switch is on a channel you can see moving.",
     "If channels move but nothing arms, that is a different problem: look at the arming-disable flags."],
    { why: "TX-to-RX and RX-to-TX is the single most common wiring error, and no amount of software configuration fixes a crossed pair.", src: "Guide weekend 1 task 4", see: [STEP(4, "Step 4 — add control and video"), ["Weekend 1 checklist", "plan"]] })
    .next = "arm-wont-arm";

  kb("failsafe", "Setting up failsafe (do this before the first hover)", "failsafe,fail safe,signal loss,lost signal,drop,disarm,throttle cut,safety,stage 2",
    ["Betaflight → Failsafe: set Stage 2 to Drop (or to a deliberate, tested behaviour). Do not leave the default without knowing what it does.",
     "Test it on the bench with props off: arm, throttle up slightly, then switch the radio off. The motors must stop.",
     "Confirm the radio's own failsafe does not fight Betaflight's — in CRSF the flight controller decides.",
     "Only then go outside. The guide's step 8 checklist puts radio and failsafe checks before the first hover for this reason."],
    { note: "An untested failsafe is the same as no failsafe. The test takes two minutes on the bench.", src: "Guide step 4 and step 8", see: [STEP(8, "Step 8 — test in this order"), STEP(4, "Step 4 — control and video")] })
    .next = "arm-wont-arm";

  kb("arm-wont-arm", "It won't arm — arming disabled", "arm,arming,disabled,wont arm,flags,beep,doesnt spin,turtle,switch,throttle",
    ["Betaflight → Setup: read the Arming Disable flags. They name the reason instead of making you guess.",
     "The usual ones: throttle not at zero, arm switch assigned to the wrong range, accelerometer needs calibration, the quad is not level (some modes), or the model is still in a pre-arm state.",
     "Check the Modes tab actually saves: press Save, not just Add Range.",
     "USB-only power can also block arming on some setups — arm from a battery with props off when you are testing."],
    { src: "Guide weekend 1 task 5 — Betaflight setup, props off", see: [["Weekend 1 checklist", "plan"], STEP(8)] })
    .next = "motor-order";

  kb("motor-order", "Motors spin the wrong way, or in the wrong order", "motor,motors,direction,order,reversed,spin wrong,props out,desync,flip over,instaflip,m1 m2 m3 m4",
    ["Props off. Always props off for this.",
     "Betaflight → Motors tab: spin each motor with the slider and match the number on screen to the physical motor for this frame (the guide's step 2 picture shows the M1–M4 order).",
     "If numbering is wrong, fix the motor resource mapping rather than rewiring.",
     "If direction is wrong, either reverse that motor in the ESC config (DShot bidirectional/reversed motor setting) or swap any two of its three wires at the ESC — not both.",
     "Then recheck hover: 1 m up, land, feel the motors. An instaflip on takeoff is almost always motor order or direction."],
    { note: "An instaflip with props on, indoors, is how people get hurt. Verify direction with props off, at low slider values, on the bench.", src: "Guide step 2 (motor order) and step 8", see: [STEP(2, "Step 2 — build the frame"), STEP(8, "Step 8 — test in this order")] })
    .next = "motors-hot";

  kb("link-quality", "Link quality drops out or RSSI warnings alarm", "rssi,lq,link quality,range,telemetry,dropout,signal,weak,elrs power,packet rate,dbi",
    ["Antenna first: RP1's UFL connector must be clicked down, and the antenna must not be buried against carbon fibre or the Pi.",
     "Keep the receiver antenna away from the VTX antenna — 5.8 GHz next to 2.4 GHz at high power is a classic way to lose the link at range.",
     "Check the ELRS packet rate and TX power in the Lua script. Higher packet rate = lower latency, less range headroom.",
     "Fly line of sight. Buildings, ground and your own body all block 2.4 GHz.",
     "Watch LQ in the OSD rather than RSSI alone; LQ falling off a cliff is the honest warning."],
    { src: "Guide step 4 · ExpressLRS signal-health docs", see: [STEP(4, "Step 4 — control and video")] })
    .next = "failsafe";

  /* ======================================================================
     VIDEO — RunCam Phoenix 2 · TBS Unify Pro 5G8 HV · Skyzone M5F
     ====================================================================== */
  kb("no-video", "No picture on the FPV monitor", "no video,no picture,black screen,snow,static,monitor,m5,skyzone,channel,band,scan,camera,vtx,dvr,lens cap",
    ["Antenna on the VTX before you power it — every time. That is the rule most likely to have already cost you a VTX.",
     "Lens cap. It is embarrassing and it is the most common cause.",
     "Match band and channel exactly: the Unify's channel has to equal the M5F's band+channel, not just 'channel 3'. Use the monitor's scan/auto-search once to find the signal, then lock it in.",
     "Check the camera has power and video out: power comes from the VTX's 5V/9V pad in a typical analog chain, video goes to the VTX's video-in.",
     "Check the VTX is fed from the flight controller's 9V pad, as in Step 4, not from the 5V rail.",
     "If the picture is there but tearing, suspect the camera's video ground or a loose JST/solder joint before you replace anything."],
    { note: "The VTX is powered from the flight controller's 9V pad (Step 4), not from the 5V rail that feeds the Pi.", why: "Analog video fails in boring ways: no antenna, lens cap, wrong band, no power. Work down that list before buying parts.", src: "Guide step 4", see: [STEP(4, "Step 4 — control and video")] })
    .next = "bad-range";

  kb("bad-range", "Picture breaks up as soon as I move away", "breakup,range,interference,static,snow,distance,flicker,antenna,polarization,power,channel overlap",
    ["Check the antenna connector type: SMA vs RP-SMA. A wrong-gender pair looks connected, spins on, and gives you metres instead of hundreds of metres.",
     "Both antennas must be the same polarization (both RHCP or both linear) — a mismatched pair loses most of the link budget.",
     "Make sure your channel is not overlapping a neighbour's; keep clear of the low band if others are flying.",
     "Keep VTX power legal for your licence and site, and keep the aircraft in sight.",
     "Mount the VTX antenna clear of the frame with a proper pigtail, not bent against carbon."],
    { src: "Guide step 4 and the M5F monitor notes", see: [STEP(4, "Step 4 — control and video")] })
    .next = "no-video";

  /* ======================================================================
     POWER — GEPRC F405 + BLS 50A stack · Pi Zero 2 WH · 4S HV packs
     ====================================================================== */
  kb("pi-power", "The Pi keeps rebooting, or browns out when I throttle up", "pi,raspberry,reboot,reboot loop,undervoltage,brownout,lightning bolt,power,5v,3a,bec,pigtail,crash,shutdown,corrupt sd",
    ["On the bench use the kit's own 5.1V/2.5A supply first — if it misbehaves on a good bench supply, the problem is the Pi or the SD card, not your wiring.",
     "In the air the Pi runs from the stack's regulated 5V/3A output through the meter-checked 24AWG micro-USB pigtail. The GEPRC stack provides that rail; the 4S battery does not get connected to the Pi directly.",
     "Measure it under load, not at idle: a multimeter on the Pi's 5V and GND while everything is running. A rail that sags below about 4.7 V causes exactly these random reboots and SD-card corruption.",
     "Beware the Zero family's silence: on the Zero models there is no low-voltage warning circuitry like the bigger Pis have, so a starving Pi often just reboots instead of telling you.",
     "Do not feed another 5V source into the same rail (no backfeed from a second BEC or a USB power bank while the flight pack is connected).",
     "Keep the pigtail short, and keep the payload wiring away from the ESC's motor current paths.",
     "If it still browns out on throttle punches, suspect the stack's 5V regulator before the Pi: a servo/ESC spike is a normal cause."],
    { note: "Never power the Pi from both the bench USB supply and the flight battery at once.", why: "A Pi that reboots mid-flight takes your thermal log with it, and repeated brownouts corrupt the SD card — the failure looks like a software bug but it is a voltage problem.", src: "Raspberry Pi power-supply docs · Guide step 6 and weekend 2 task 10", see: [STEP(6, "Step 6 — wire the Pi payload"), ["Weekend 2 checklist", "plan"], ["Honest limits & sources", "limits"]] })
    .next = "bec-current";

  kb("bec-current", "Will the 5V rail power the Pi and both sensors?", "current,amps,bec,3a,power budget,rail,how much current,overload,lights,led",
    ["The F405 stack supplies a regulated 5V/3A output in this plan, and the Pi Zero 2 W plus two Qwiic sensors sit comfortably inside that with headroom.",
     "The half that catches people: the stack's rail is shared. Do not hang the LED strip or anything else hungry off the same 5V pad as the Pi.",
     "The 4S COB LED strip in this plan runs from the flight battery, not the Pi's 5V rail — that is deliberate.",
     "Measure instead of assuming: current clamp or inline meter on the 5V feed with the payload running full tilt (camera streaming, WiFi active).",
     "If you add anything later, re-measure. The guides' numbers are a design budget, not a guarantee about your exact build."],
    { src: "Guide step 6, step 7 and the parts list", see: [STEP(6), ["Parts & budget", "parts"]] })
    .next = "pi-power";

  kb("motors-hot", "Motors or ESC are hot after a 1-metre hover", "motors,hot,temperature,esc,warm,too hot,hover,check,burn,smell",
    ["Land and feel the motors and the ESC immediately — the guide's step 8 makes this the point of the first hover.",
     "Warm is normal. Too hot to hold your fingers on for a couple of seconds is not; stop flying and diagnose.",
     "Check the boring things first: motor screws touching a winding, a prop on backwards, a bent motor shaft, a dragging bell.",
     "Then tuning: on default PIDs a fresh build can run hot, and a soft-sagging battery pushes current up too.",
     "Re-test only after a change, keep the hover to a few seconds, and write the temperature down so you can compare."],
    { note: "A motor that is hot enough to smell is a motor you are about to lose.", src: "Guide step 8", see: [STEP(8, "Step 8 — test in this order"), STEP(2, "Step 2 — motor screws")] })
    .next = "esc-desync";

  kb("esc-desync", "A motor stutters, twitches or desyncs", "desync,stutter,twitch,jitter,esc,flip,motor cuts,failsafe mid air,dshot",
    ["Check the solder joint on that motor's three ESC pads — a cold joint behaves exactly like a failing ESC.",
     "Confirm the ESC protocol in Betaflight (DShot is right for this stack) and that motor direction is set once, not twice.",
     "Check the motor's own wires for a nick where they pass the arm — a partly cut wire is intermittent and maddening.",
     "Run the motor on the bench with props off and watch the ESC temperature and the motor's smoothness across the throttle range.",
     "If it is one motor, swap that motor to another ESC output. If the fault follows the motor, it is the motor; if it stays on the output, it is the ESC."],
    { src: "Guide step 3 and step 8", see: [STEP(3, "Step 3 — solder the stack"), STEP(8)] })
    .next = "motors-hot";

  /* ======================================================================
     THERMAL PAYLOAD — Pi Zero 2 WH · Qwiic HAT · MLX90640 (0x33) · PA1010D (0x10)
     ====================================================================== */
  kb("thermal-noise", "Thermal image is noisy, jumpy or speckled at a high refresh rate", "noise,noisy,jitter,jumpy,speckle,flicker,unstable,8hz,16hz,refresh rate,refresh_rate,mlx90640,thermal,grain,flickering pixels,static in the image,accuracy",
    ["Drop the refresh rate first. The MLX90640 supports a range of rates — 0.5, 1, 2, 4, 8, 16, 32 and 64 Hz — and noise climbs steeply with each step up. The guide's own payload example runs REFRESH_2_HZ, not 8.",
     "That is not folklore: Adafruit's library docs for the sensor say to start at the lowest speed and only increase the I2C clock rate and the refresh rate slowly, because 'the sensor does not like it if the I2C host cannot keep up'.",
     "If you were at 8 Hz, drop to 4 or 2 and re-look at the image. A frame that calms down at 2 Hz was telling you the bus could not feed it, not that the sensor is defective.",
     "Check the bus speed. The Pi sets the I2C clock in its config file (dtparam=i2c_arm_baudrate=400000), not in the payload code, so confirm that line is there and the Pi was rebooted. If the wiring is long or the Qwiic cable is daisy-chained, shorten it and retest. How to read the speed back is not confirmed.",
     "Handle the read failures instead of ignoring them: the example wraps getFrame in try/except ValueError and continues, because a failed half-frame read raises rather than returning garbage.",
     "Let it settle. Give the sensor 30 s or so after power-up before you judge the noise — cold-start drift looks like noise on a 32×24 frame.",
     "Average a few frames in software for your detection pass (2–4 frames is plenty at 2 Hz). Averaging costs you nothing in hardware and cuts fixed-pattern noise.",
     "If it is still ugly: check the sensor is not getting vibration from the frame (nylon standoffs, zip tie, Kevlar strap — step 7), and that nothing warm (ESC, VTX, Pi) is in the lens's field of view."],
    { note: "Do not 'fix' noise by raising the refresh rate — that is the cause, not the cure. Higher refresh also makes motion smear worse in flight, not better.", why: "At 8 Hz and above, the sensor's readout is faster than a marginal I2C link can service, so half-frames get dropped or truncated and the reconstructed image shows exactly the streaky, speckled noise people describe as '8 Hz noise'.", src: "Adafruit MLX90640 library API docs (refresh_rate) · Guide weekend 2 payload example running REFRESH_2_HZ at 400 kHz", see: [STEP(6, "Step 6 — wire the Pi payload"), ["Weekend 2 checklist (payload code)", "plan"], ["Detection & mapping quiz", "quiz"]] })
    .next = "thermal-valueerror";

  kb("thermal-valueerror", "getFrame keeps raising ValueError (or Errno 121 remote I/O)", "valueerror,error,exception,read fail,i2c error,errno 121,remote i/o,nack,crash,cant read frame,traceback",
    ["ValueError out of getFrame means the I2C read did not complete — the sensor did not deliver both halves of a frame. It is a bus problem, not a Python bug.",
     "Copy the guide's handling pattern: catch it and continue. One failed frame at 2 Hz is invisible; letting it kill the process is not.",
     "Slow the bus to 400000 Hz and shorten the Qwiic run. Re-seat both ends of the PRT-17912 cable until they click.",
     "Errno 121 / remote I/O error is the same story one layer down: the device did not acknowledge. Check 3.3 V power at the sensor, and that the Qwiic HAT is fully pushed onto the Pi's header.",
     "If it fails only when the motors run, you have electromagnetic noise on the bus: move the payload wiring away from the ESC and re-test on the bench with the stack powered.",
     "After repeated failures, re-initialise the sensor object rather than hammering a wedged one."],
    { note: "Never wrap this in a bare except that hides everything — the guide's example catches ValueError specifically so a real bug still surfaces.", src: "Guide weekend 2 payload example (try/except ValueError, continue)", see: [["Weekend 2 checklist (payload code)", "plan"], STEP(6)] })
    .next = "thermal-noise";

  kb("thermal-flat", "Every pixel reads the same, or roughly room temperature", "flat,all same,ambient,nothing,lens cap,blank,no heat,uniform,sensor cold,not working,constant temperature",
    ["Lens cap off, and confirm you are not looking at a wall — a 32×24 sensor pointed at a uniform surface correctly reports a uniform temperature.",
     "Wave your hand 30 cm in front of the lens. If the frame does not change, the sensor is not delivering new data (see the ValueError entry) rather than being broken.",
     "Check you are filling the frame buffer: the example allocates 768 elements for the 32×24 array; a shorter list raises IndexError or silently misreads.",
     "Give it 30 s after power-up. Right after boot the sensor is still settling and reads flat.",
     "Then test properly: a controlled warm target (a mug of hot water, a person) among cold objects at 1–2 m on the bench.",
     "Remember what the guide refuses to claim: 768 readings per frame at ±2 °C in the 0–100 °C range is a sensor specification, not a proven detection result."],
    { src: "Guide step 6 and weekend 2 tasks 8–9", see: [STEP(6), ["Detection & mapping quiz", "quiz"]] })
    .next = "thermal-noise";

  kb("i2c-detect", "i2cdetect shows no sensors (0x33 and 0x10 missing)", "i2cdetect,i2c,0x33,0x10,not detected,sensors not found,no address,qwiic,hat,header,enable i2c,raspi-config,address missing",
    ["Turn I2C on: sudo raspi-config → Interface Options → I2C → enable, then reboot. A fresh Raspberry Pi OS image has it off.",
     "Scan the bus: sudo i2cdetect -y 1. You want 33 (thermal camera) and 10 (GPS) in the grid. Anything else means you are looking at the wrong bus.",
     "Push the Qwiic HAT fully down onto the Pi's 40-pin header — 'looks seated' is not seated. One row of pins off gives you exactly this symptom.",
     "Check the header itself if you soldered it: a cold joint on SDA or SCL kills the whole bus, and both sensors disappear together.",
     "Re-seat each PRT-17912 cable at both ends until it clicks, and match the labels on the board: 3V3, GND, SDA, SCL. The Qwiic connector is keyed, but the board silkscreen is what you verify against.",
     "Measure 3.3 V at the sensor with the meter. No 3.3 V means the problem is upstream of the sensor, not the sensor.",
     "If only one address is missing, swap that cable to a known-good port on the HAT to separate a bad cable from a dead board."],
    { note: "Never probe a Qwiic connector with the Pi powered and the sensor connected — shorting 3V3 to SDA is how sensors die.", why: "The guide's step 6 makes this an explicit gate: both addresses must answer before you mount the payload. Everything downstream assumes the bus works.", src: "Guide step 6 and weekend 2 task 8", see: [STEP(6, "Step 6 — wire the Pi payload"), ["Weekend 2 checklist", "plan"]] })
    .next = "shared-bus";

  kb("shared-bus", "Two sensors on one Qwiic HAT — will they conflict?", "share,shared,bus,address,conflict,two sensors,both sensors,qwiic hat,dev-14459,prt-17912,cable,same bus,3.3v",
    ["No conflict: the MLX90640 answers at 0x33 and the PA1010D at 0x10, so both can live on the same I2C bus at the same time. That is why the plan uses the four-port Qwiic HAT.",
     "Wiring: Pi header → Qwiic HAT (DEV-14459) → one PRT-17912 cable per sensor. Each sensor gets its own port; they are all electrically the same bus.",
     "Both sensors are 3.3 V devices on the Pi's 3.3 V I2C bus. Nothing in this chain takes 5 V.",
     "Keep each cable short. Two devices on a marginal bus is still a marginal bus — the noise guidance is the same as for one sensor.",
     "Verify with sudo i2cdetect -y 1 and expect both 33 and 10, every boot."],
    { why: "Two devices only collide if they share an address. These do not, which is exactly why the guide can put the thermal lens down and the GPS antenna up on one HAT.", src: "Guide step 6 · parts list (Qwiic HAT + two cables)", see: [STEP(6), ["Parts & budget", "parts"]] })
    .next = "i2c-detect";

  kb("hotspot-threshold", "Detection finds everything — or nothing at all", "finding everything,finds everything,finds nothing,hotspots,threshold,false positive,sensitivity,60c,60 c,min pixels,minimum pixels,tuning,detect,hotspot,flood fill,too sensitive,misses",
    ["Start from the guide's tested defaults in the payload example: find_hotspots(frame, 60, 3) — 60 °C threshold, at least 3 connected pixels.",
     "Too many false positives → raise the temperature threshold and raise the minimum pixel count. A single hot pixel is usually a fixed-pattern artefact, not a fire.",
     "Missing real targets → lower the threshold toward the target's actual surface temperature, and lower the pixel minimum — but write down that you did.",
     "Test the change against a controlled warm target among cold controls, not against your imagination. Recording detection rate and false positives is the whole point of weekend 4.",
     "Keep the logic separate from the flight code — the included hotspots.py is pure and covered by the package's synthetic tests, so you can change a threshold and re-run the suite in seconds.",
     "Never describe the result as accuracy. The guide is explicit that ideal geometry is sampling, not detection performance."],
    { note: "Every threshold change invalidates your previous measurements. Re-run the same controlled test after each change or the numbers mean nothing.", why: "A 32×24 sensor and a 1 m target at 30 m are the same size in pixels; the threshold is doing most of the work, so it has to be tuned against measurements rather than vibes.", src: "Guide weekend 2 task 9, weekend 4 tasks 14–16, 'Detection & mapping' quiz", see: [["Weekend 4 checklist", "plan"], ["Detection & mapping quiz", "quiz"], ["Honest limits & sources", "limits"]] })
    .next = "detect-reality";

  kb("thermal-mount", "Image smears or blurs while the drone is moving", "smear,blur,vibration,motion,mount,jelly,wobbly,shaky,standoff,loose,cable,moving",
    ["A 2 Hz sensor plus forward flight equals motion smear. For detection, hover or fly slow, straight passes — the guide's test method is a survey pass over a stationary target, not a chase.",
     "Mount the payload rigidly: nylon standoffs over the frame's centre, zip tie, then the Kevlar strap as a second lock (step 7).",
     "Keep cables out of the prop circles and tie the loose ends down — a swinging cable vibrates the Pi and the sensor with it.",
     "Check nothing warm is in the lens field of view: the ESC and VTX are right there, and a heat source that moves with the aircraft is a guaranteed false positive.",
     "Lens one way down, antenna one way up. Reversed orientation gives you a clean image of the sky."],
    { note: "No bare circuit board touches carbon fibre — that is the guide's step 7 warning, and it is also a vibration rule.", src: "Guide step 7", see: [STEP(7, "Step 7 — mount and balance")] })
    .next = "hotspot-threshold";

  /* ======================================================================
     GPS & MAPPING — PA1010D · payload.py · map_server.py
     ====================================================================== */
  kb("gps-no-fix", "GPS never gets a fix", "gps,fix,no fix,satellites,pa1010d,indoor,cold start,antenna,sky,coordinates,no position,hdop,waiting",
    ["Indoors there is no fix. Ever. Take it outside with a clear view of the sky before you decide anything is broken — this is the number one false alarm in the whole payload.",
     "A cold start can take a while, especially with a small patch antenna; give it minutes, not seconds, and keep it still.",
     "Antenna up, away from carbon fibre and away from the Pi's metal and the VTX. Carbon shadows GPS badly.",
     "Confirm the device answers at 0x10 and that NMEA sentences are arriving — if the sentences flow but the fix does not, it is sky view, not wiring.",
     "Log fix quality alongside position so a 2-satellite 'fix' never ends up on a map as if it were good data."],
    { src: "Guide weekend 3 task 11, step 6 wiring", see: [["Weekend 3 checklist", "plan"], STEP(6)] })
    .next = "map-viewer";

  kb("map-viewer", "The map viewer shows nothing / the demo won't serve", "map,viewer,payload.py,serve,localhost,8000,demo,jsonl,flight log,empty,blank map,no marker,browser",
    ["Prove the viewer with synthetic data first: cd Shad-Drone-Payload, then python payload.py --demo --serve, and open http://127.0.0.1:8000.",
     "If the demo draws a marker, the viewer works and your problem is live data — not the map.",
     "Then run the real backend and confirm a GPS fix exists before expecting a marker. No fix means no coordinates, whatever the map does.",
     "Check the append-only log is actually growing (flight-log.jsonl) and that each line parses as JSON. One truncated line is enough to break a naive reader.",
     "Run the unit tests before blaming the code: python -m unittest -v test_drone_logic.py. The package ships 31 passing synthetic tests — if they fail on your machine, the environment is the problem."],
    { src: "Guide weekend 3 task 13 · payload package README", see: [["Weekend 3 checklist", "plan"]] })
    .next = "geo-error";

  kb("geo-error", "The map marker is nowhere near the target", "marker,off target,position,error,geolocation,heading,accuracy,offset,map wrong,gps error,coordinate",
    ["Work out which input is wrong before touching the maths. The chain is: pixel offset → metres → rotated by heading → added to GPS position.",
     "Heading is the usual culprit. Set a calibrated aircraft heading explicitly; a stationary GPS cannot tell you which way the aircraft is pointing.",
     "Altitude sets the scale: ground width = 2 × altitude × tan(FOV/2), and a 10 % altitude error is a 10 % position error, neatly.",
     "Altitude, tilt, terrain and lens distortion are all excluded from the included geo.py model. Over uneven ground or with the aircraft tilted, expect the error you were warned about.",
     "Measure it: put surveyed targets at measured positions, fly repeated passes, and record the error. That measured number is the only honest one."],
    { note: "Do not quote a 2 m accuracy figure. The guide says explicitly that repeated surveyed-target results are what count.", src: "Guide weekend 3 task 12 · 'Detection & mapping' quiz", see: [["Weekend 3 checklist", "plan"], ["Detection & mapping quiz", "quiz"]] })
    .next = "detect-reality";

  kb("detect-reality", "Will this actually detect a fire from 30 m?", "detect,detection,works,really,accuracy,30 m,30m,1 metre,pixel,resolution,honest,limit,can it see,small target",
    ["Do the geometry before believing anything: at 30 m with the 55° lens the frame is about 31.2 m wide, and 31.2 ÷ 32 gives roughly 0.98 m per pixel. A 1-metre target is about one pixel.",
     "One pixel is sampling, not detection. Whether that pixel is a fire depends on temperature contrast, background, emissivity, sensor noise and your threshold.",
     "The sensor is 32×24 — 768 readings per frame at ±2 °C over 0–100 °C. That is the specification, not a result.",
     "What the evidence supports: FPInnovations describes the mission product as a map of GPS-referenced hotspots delivered to the firefighter — not a magic aircraft, and not a guarantee this prototype works.",
     "Get closer, hug the thermal contrast, or accept that the honest deliverable is 'hotspots on a map, with measured error'.",
     "Until you have repeated controlled tests with recorded detection rates and false positives, do not say it detects fires. The guide's honesty box is the product."],
    { why: "Every over-claim invites one question you cannot answer. Measured limits survive scrutiny; promises do not.", src: "Guide: How it works calculator, final exam question on 1 m at 30 m, FPInnovations TR-2020-N29", see: [["Altitude & coverage calculator", "build"], ["Honest limits & sources", "limits"], ["Final exam", "quiz"]] })
    .next = "fov";

  /* ======================================================================
     THE BUILD ITSELF — money, order, schedule, rules, career
     ====================================================================== */
  kb("fov", "55° lens or 110° lens — which one?", "fov,lens,wide,narrow,coverage,55,110,field of view,swath,resolution,which lens",
    ["55°: a narrower swath with better metres-per-pixel. At 30 m AGL that is about 31.2 m wide — roughly 0.98 m per pixel across the 32-pixel frame.",
     "110°: a much wider swath but each pixel covers far more ground, so small targets disappear.",
     "For finding small hot spots, narrower wins every time. For covering a field fast, wider wins — and you pay for it in detection.",
     "The calculator in How it works (in Learn) does the arithmetic for both, including the 55°×35° vertical coverage. Move the altitude slider rather than trusting a table.",
     "The 55° version is the one in this order plan (CA$86.95 at PiShop, checked 2026-11-03: out of stock that day)."],
    { src: "Guide: How it works calculator · parts list", see: [["Altitude & coverage calculator", "build"], ["Parts & budget", "parts"]] })
    .next = "detect-reality";

  /* Worded from the page's own Buy-today lines; the total is read live from the page. */
  kb("buy-today", "What do I buy today, and how much is it?", "buy today,today's list,todays list,today list,shopping list,what to buy today,what do i buy,buy now",
    ["Open Buy, then \"Shopping list for today, shop by shop\". Each line has its shop, a dated stock badge and a backup place to buy it.",
     "Prices and stock were read from each shop's page on the date shown: a snapshot, not a reservation.",
     "Freight is calculated at checkout and is not included."],
    { src: "Guide: Buy today", see: [["Buy today", "parts"]],
      live: function () {
        const line = document.getElementById("buy-line");
        const sum = document.getElementById("buy-sum");
        const gst = sum ? Array.prototype.map.call(sum.querySelectorAll("p"), function (p) { return p.textContent; })
          .filter(function (t) { return t.indexOf("Plus 5% GST") === 0; })[0] : "";
        return line && line.textContent ? "On the page right now: " + line.textContent + (gst ? ". " + gst : "") : "";
      } });

  kb("budget", "What does this cost, and is my total right?", "cost,price,total,budget,gst,money,how much,1603,1682,1678,1759,cheap,expensive,tax,freight,1630,1711",
    ["The required parts come to CA$1,630.69 for merchandise and the CA$20.34 of Transport Canada fees. It does not include a laptop: you use your own.",
     "Add 5 % GST on the CA$1,610.35 taxable subtotal — the Transport Canada fees are not taxable — for CA$80.52, a planning total of CA$1,711.21, still before remaining retailer freight on the small items. Optional extras (spare props, the coating spray, the LED strip and the monitor's memory card) are CA$85.51 + GST on top.",
     "The budget table in Buy is live: change any price and the total, the progress bar and the notes update. Tick an item you already own and it drops out of the total.",
     "If you want to spread it out, the staged plan splits the required CA$1,630.69 into seven stages, plus the optional Stage 8 (CA$85.51), each of which gives you something to build or test the day it arrives.",
     "Every price was checked on the shop's own page on 3 Nov 2026, with a backup shop where one was found. A working link is not stock: that day the Pi kit, the 55° thermal camera, the frame and the GEPRC stack were out of stock at their main shop (the frame was in stock at EpicFPV, the stack only at a US shop), so confirm availability and freight at checkout rather than trusting a live page."],
    { why: "The staging exists so the project survives real life: seven smaller payments that each end in progress beat one bill you keep postponing.", src: "Guide: Buy, and the order list", see: [["Parts & budget", "parts"], ["Staged buying plan", "parts"]] })
    .next = "stock";

  kb("what-next", "What should I do next? Where do I start?", "next,start,begin,first,order,whats next,step by step,how do i begin,kick off",
    ["Read What & Why (in Learn) for the ten minutes it takes — it tells you what you are building and why, including what it will not do.",
     "Then order with the staged plan in Buy if money is tight, or the full list if it is not. Confirm stock at checkout; the links are checked but stock is not guaranteed.",
     "When the boxes arrive, do step 1: five piles, every item ticked against the order list, and the manuals downloaded.",
     "Then work the eight steps in order, respecting the done-means rule: each step has an observable check, and you do not move on until it passes.",
     "Take the matching quiz on the Quizzes page in Learn after each weekend. If you cannot explain a step out loud, you do not own it yet."],
    { src: "Guide tabs 1, 3, 4 and 6", see: [["What you're building & why", "why"], STEP(1, "Step 1 — lay out the parts"), ["Quizzes", "quiz"]] })
    .next = "how-long";

  kb("how-long", "How long will this take?", "how long,time,weeks,hours,46,weekend,finish date,schedule,commitment",
    ["46 hours of hands-on work across 19 tracked tasks and 8 assembly steps.",
     "The slider in the header turns that into weeks and a projected finish date from today — 8 hours a week lands around 6 weeks.",
     "Realistically the clock is dominated by three things: waiting for deliveries, learning Betaflight, and the thermal tuning weekend.",
     "The weekend breakdown on the Plan page in Learn is a reasonable pace: airframe, payload, GPS/mapping, flight tests, then the evidence pass.",
     "The finish date saves with your other progress in this browser, so you can keep it honest instead of optimistic."],
    { src: "Guide: Home's hours slider and the Plan page", see: [["Build-time calculator", "home"], ["Plan", "plan"], ["Build steps", "steps"]] })
    .next = "what-next";

  kb("certification", "Do I need a licence or registration to fly this?", "licence,license,certificate,basic,advanced,registration,tc,canada,law,legal,pilot,exam,fees",
    ["Yes. A drone between 250 g and 25 kg needs a Pilot Certificate — Basic Operations and registration/marking, with the proof of registration on you when you fly.",
     "Basic conditions the guide lists: VLOS, ≤25 kg, more than 30 m horizontally from any person, uncontrolled airspace, more than 5.6 km from certified airports and 1.9 km from heliports.",
     "Fees: the plan allows CA$20.34 (checked 2026-11-03) — exam CA$10.17 plus registration CA$10.17 on the Transport Canada pages. Confirm the live portal fees before you pay, because they change.",
     "Night flying needs lights sufficient for you or a visual observer to see the aircraft (CAR 901.39) — and that does not waive any other rule.",
     "Beyond Visual Line of Sight, over people, or in controlled airspace puts you in Advanced operations, which is a different certificate and a different project.",
     "This build is 5-inch class and well over 250 g, so assume you are in scope and get the certificate before the first hover."],
    { note: "The guide's footer says it plainly: a prototype builder's roadmap, not career or legal advice. Check the current Transport Canada rules yourself.", src: "Transport Canada Basic operations · CAR 901.39 · Guide rules quiz", see: [["Rules quiz", "quiz"], ["Honest limits & sources", "limits"]] })
    .next = "career";

  kb("career", "Is any of this a career? What does it pay?", "job,career,salary,wage,pay,systems analyst,resume,work,employer,hiring,43.27,21211,pitch",
    ["The guide pairs the build with a target role: Systems Analyst / data work, NOC 21211, Alberta/Edmonton.",
     "Job Bank figures quoted: CA$28.00 low, CA$43.27 median, CA$57.69 high per hour, updated 19 Nov 2025. Those are occupational wages, not a starting offer.",
     "The GoA Systems Analyst recruitment standard PDF was reviewed 20 May 2026 — that is the document to read for what a hiring manager there expects.",
     "The build is the demonstration, not the credential. The evidence package (README, honest limits, measured results, 5-minute video, flight log) is what makes it credible in an interview.",
     "The Career & pay page in Learn has the demo kit and pitch practice. Do not say 'it detects fires from 30 m' until you have measured it — one exaggeration undoes the whole story."],
    { src: "Guide: Career & pay · Job Bank NOC 21211 · GoA Systems Analyst MRS", see: [["Career & pay", "career"]] })
    .next = "certification";

  kb("saved-progress", "Is my progress saved? Will it sync to my phone?", "saved,progress,save,localstorage,sync,browser,phone,laptop,other device,lost,cleared,tick",
    ["Everything saves in this browser only — checkboxes, quiz bests, flashcard state, budget prices and the build-time slider.",
     "There is no account and no sync: opening the page on your phone starts from zero.",
     "Clearing site data, or using private/incognito mode, wipes it. So does a different browser on the same machine.",
     "For a record you can keep, screenshot the progress bar and the quiz scores, or keep the numbers in the order document."],
    { src: "Guide footer — progress and quiz scores save in this browser only", see: [["Build steps", "steps"], ["Quizzes", "quiz"]] })
    .next = "stock";

  kb("stock", "A part is out of stock or discontinued — can I substitute?", "stock,out of stock,substitute,alternative,discontinued,replace,unavailable,cant find,backup,substitution",
    ["Every budget row has a backup retailer link next to the primary one — check that first before redesigning anything.",
     "The plan already contains substitutions after the first audit: the GEPRC TAKER F405 BLS 50A stack replaced a discontinued SpeedyBee F405 V4, and the stack, thermal camera and Pi were all re-checked on 3 Nov 2026.",
     "A safe substitute has to match on voltage, current rating, mounting pattern and connector — and for the payload, on I2C address and 3.3 V logic.",
     "If you change a part, update the order document and the budget rather than carrying a stale number in your head.",
     "Read the audit report for the reasoning already applied, so you are not repeating work that was done."],
    { src: "Guide: Buy · Shad-Drone-Audit-Report.md", see: [["Parts & budget", "parts"], ["Honest limits & sources", "limits"]] })
    .next = "budget";

  kb("solder", "My solder joints look bad / a joint broke off", "solder,soldering,joint,cold joint,tin,flux,bridge,pad,wire,wont stick,tug test,iron,temperature",
    ["A good joint is shiny, concave and small. A dull lump is a cold joint and it will fail in flight, not on the bench.",
     "Set the iron hot enough (the shop listing says this iron works from 220 to 400 C; around 350 °C for these pads is general practice, not from a maker document), use flux, and tin both the pad and the wire before joining them.",
     "Cut each motor wire so it just reaches the ESC — a long loop is a wire waiting to be nicked by a prop or a zip tie.",
     "Give every wire a gentle tug after soldering. If it moves, redo it now instead of discovering it at 30 m.",
     "Check for bridges between adjacent pads with the meter's continuity mode before the first power-up, then use the smoke stopper."],
    { note: "Eye protection and an open window. Solder splatter and flux fumes are the cheap hazards in this build.", src: "Guide step 3", see: [STEP(3, "Step 3 — solder the stack")] })
    .next = "first-power-smoke";

  kb("charger-setup", "How do I set up the M7AC charger for these packs?", "charger,m7ac,m4ac,toolkitrc,lihv,lion,li-ion,4s,balance,balance lead,amps,charge rate,storage charge,how to charge",
    ["Before you connect a pack, open the charge settings (short-press OK) and set Battery Type: LiHv for the GNB 1500 pack, Lion for the More Volts 5000 Li-ion pack. A wrong type can damage the pack and become a fire hazard (the M7AC manual).",
     "Cells: Auto, Mode: Charge, Charge Current 1.0 A for the GNB and 2.5 A for the More Volts (the guide's cautious settings). Then plug in the main XT60 lead AND the balance lead, scroll to Start and press OK.",
     "Charge inside the closed LiPo bag, on something that will not burn, with you in the room. The guide repeats this because it is the one that matters.",
     "If you are not flying within a day or two, choose Mode: Storage instead of Charge.",
     "Also put the two 18650 cells in the RadioMaster Pocket — that is a separate power system from the flight battery."],
    { src: "Guide step 5", see: [STEP(5, "Step 5 — charge the batteries safely")] })
    .next = "flight-time";

  /* Fable Part 2, N3: two questions that used to land on the wrong card. Worded from the page's own lines. */
  kb("vtx-power", "Where does the video transmitter get its power?", "video transmitter,vtx power,power the vtx,get its power,9v pad,9v,vtx wiring,vtx wires,orange wire,green wire",
    ["From the flight controller's 9V pad (Step 4): red to the FC's 9V pad, both black wires to GND, yellow (video) to the FC's VTX pad, white (control) to T1.",
     "The VTX also has an orange wire (5 V out) and a green wire (audio). You do not use them. Cut each one short and cover it with heat shrink, so it touches nothing.",
     "Never power the VTX without its antenna screwed on."],
    { src: "Guide Step 4 (S4.3)", see: [STEP(4, "Step 4 — control and video")] });

  kb("weight", "How much does the drone weigh?", "weigh,weight,how heavy,heavy,grams,drone weigh,how much does it weigh,how much does the drone weigh,250 g,mass",
    ["Weigh it: when the drone is finished, put it on a kitchen scale with the battery fitted and write the number down. That figure, not this estimate, is the one that counts.",
     "A drone of 250 g or more must be registered; this build is over that."],
    { src: "Guide: Fly safely (How heavy will it be?)", see: [["Fly safely", "fly"]],
      live: function () {
        const w = document.getElementById("glance-weight");
        return w && w.textContent && !/Loading/.test(w.textContent) ? "On the page right now: " + w.textContent : "";
      } });

  kb("flight-time", "How long can it fly, and why does the voltage sag?", "how long can it fly,how long does it fly,how long will it fly,fly for,flight time,minutes,how long fly,sag,voltage drop,1500mah,battery,low voltage,land,capacity",
    ["There is no measured number yet: payload weight, throttle habits and temperature all move it. Estimates, not yet measured (the game's flight model, corrected against a similar real build, give or take 25 %): about 9 to 10 minutes of calm flying on the GNB 1500 LiPo, and about 20 to 23 minutes on the More Volts 5000 Li-ion. Measure your own and write it down.",
     "The pack is a 1500 mAh 4S HV. Treat 3.5 V per cell under load as your land-now line (general practice, not from a maker document), and land earlier while you are learning. The More Volts Li-ion pack sits lower: never let it go below 2.8 V per cell in flight (11.2 V; its listing), and land when it rests at 3.3 V per cell (13.2 V; the game's landing rule, an ASSUMPTION).",
     "Sag is normal: a full 4S HV pack is about 17.4 V (4 cells x 4.35 V, the guide's LiHV figure), and a hard throttle punch can drop a volt for a moment (general practice, not from a maker document). Sustained sag means a tired or cold pack.",
     "The payload, the LED strip (an optional extra) and cold weather all cost flight time. Test flights should be short and purposeful anyway.",
     "Record capacity put back in at the charger — that is your real consumption, straight from the machine."],
    { src: "Guide step 5 and step 8", see: [STEP(8, "Step 8 — test in this order"), STEP(5)] })
    .next = "lipo-swollen";

  kb("betaflight-connect", "Betaflight won't connect to the flight controller", "betaflight,connect,dfu,flash,com port,usb,not connecting,driver,boot button,no port,target",
    ["Use a data cable, not a charge-only one. Half the 'dead' flight controllers on the internet are the wrong USB cable.",
     "Betaflight → select the correct COM port (Windows) and connect. If nothing appears, the FC is not enumerating — try another cable and another USB port before another driver.",
     "To flash, use DFU mode: hold the boot button while plugging in, then flash the correct target for the GEPRC F405.",
     "Before you change anything, save a diff: CLI → diff all → copy it somewhere. It is the difference between a five-minute fix and an evening.",
     "Never flash with a battery connected. USB only, props off, and let it finish before you touch anything."],
    { note: "Back up the diff before flashing or restoring. This costs ten seconds and has saved more builds than any tutorial.", src: "Guide weekend 1 task 5", see: [["Weekend 1 checklist", "plan"]] })
    .next = "no-channels";

  kb("payload-tests", "How many payload software tests are there, and how do I run them?", "how many tests,payload tests,software tests,unit tests,run the tests,unittest,31 tests,test_drone_logic,synthetic tests",
    ["The payload package has 31 synthetic tests, and all 31 passed (not yet on the drone).",
     "Open a terminal in the Shad-Drone-Payload folder and run: python -m unittest -v test_drone_logic.py. It should end with OK.",
     "Then run: python payload.py --demo. Fit, power, detection accuracy and flight still have to be proven by the tests in the build steps."],
    { src: "Guide Step 8 (S8.1) and What & Why", see: [STEP(8, "Step 8 — test, in this order")] });

  kb("cell-voltage", "What maximum cell voltage do I set in Betaflight?", "cell voltage,max cell voltage,maximum cell voltage,cell max,4.40,4.35,vbat,power & battery,power and battery,battery tab",
    ["Set Betaflight's maximum cell voltage to 4.40 V, in the Power & Battery tab (Step 4).",
     "The packs charge to 4.35 V per cell; at 4.35, Betaflight would count a full pack as 5 cells."],
    { src: "Guide Step 4 and Stage 3", see: [STEP(4, "Step 4 — control and video")] });

  kb("quiz", "How do the quizzes and flashcards work?", "quiz,quizzes,test,score,flashcard,flashcards,practice,pass,75,questions,exam",
    ["Five topic quizzes plus a final exam: airframe, power, batteries & safety, payload, detection & mapping, flight rules, then the final exam (8 questions).",
     "You pass a topic at 75 % or better; the overview counts how many of the six you have passed.",
     "Every answer explains why it is right, with the source — that explanation is worth more than the score.",
     "Flashcards are the fast recall layer: flip each card, and the progress counter tracks how many you have seen.",
     "Your best score per quiz and the flashcard state save in this browser, so you can walk away and come back."],
    { src: "Guide: Quizzes", see: [["Quizzes", "quiz"]] })
    .next = "what-next";

  kb("autonomy", "Can it fly itself and find fires on its own?", "fly itself,flies itself,on its own,autonomous,autonomy,self flying,waypoint,gps flight,mission,autopilot,ai decides,rtl",
    ["No. The guide is explicit that no AI briefing is implemented and that generated prose is never ground truth.",
     "What exists: a payload that finds hot pixels, converts them to GPS-referenced coordinates and logs them. A human flies the aircraft.",
     "Letting detection logic command the flight controller is a safety decision nobody should make casually — the guide keeps detection separate from flight code on purpose.",
     "If you want to go further later, that is a new project with new certifications, and it should never start by removing the human."],
    { why: "Keeping detection separate from flight control is what makes the synthetic tests possible, and it keeps a false positive from becoming a control input.", src: "Guide: Limits & sources 'future AI briefing' question · CHAIN step 5", see: [["What you're building & why", "why"], ["Honest limits & sources", "limits"]] })
    .next = "detect-reality";

  /* ======================================================================
     TEXT UTILITIES
     ====================================================================== */
  const STOP = (",a,an,the,and,or,but,if,then,than,so,as,at,by,for,from,in,into,of,on,onto,to,with,is,are,was,were,be,been,being,am,do,does,did,doing,have,has,had,it,its,this,that,these,those,i,im,ive,me,my,we,our,you,your,he,she,they,them,their,what,which,who,whom,when,where,why,how,not,no,yes,can,could,should,would,will,just,also,very,really,about,get,got,up,down,out,off,over,under,again,still,any,some,more,most,all,one,two,use,using,need,needs,want,wants,make,makes,goes,going,go," )
    .split(",");

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/\u2019|\u2018/g, "'")
      .replace(/[^a-z0-9'.+\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  /* Crude, deterministic stem: enough to join noise/noisy, sensor/sensors,
     charge/charging, bind/binding without shipping a stemmer library. */
  function stem(w) {
    if (w.length <= 3) { return w; }
    if (/ies$/.test(w)) { return w.slice(0, -3) + "y"; }
    if (/(sses|shes|ches|xes)$/.test(w)) { return w.slice(0, -2); }
    if (/s$/.test(w) && !/ss$/.test(w)) { return w.slice(0, -1); }
    if (/ing$/.test(w) && w.length > 5) { return w.slice(0, -3); }
    if (/ed$/.test(w) && w.length > 4) { return w.slice(0, -2); }
    return w;
  }
  function tokens(s) {
    const out = [];
    norm(s).split(" ").forEach(function (w) {
      if (!w || w.length < 2) { return; }
      if (STOP.indexOf(w) !== -1 || STOP.indexOf(stem(w)) !== -1) { return; }
      out.push(stem(w));
    });
    return out;
  }
  function uniq(list) {
    const seen = {}, out = [];
    list.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }
  function clip(s, n) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n - 1).replace(/[ ,.;:]$/, "") + "…" : t;
  }

  /* ======================================================================
     RETRIEVAL — index this page at runtime, so answers quote the real guide
     ====================================================================== */
  const PASSAGES = [];

  function plain(el) {
    return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }
  function addPassage(tab, step, label, el, text) {
    if (!text || text.length < 40) { return; }
    const tf = {};
    tokens(text).forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
    let len = 0;
    Object.keys(tf).forEach(function (k) { len += tf[k]; });
    PASSAGES.push({
      tab: tab, step: step, label: label, text: text, el: el || null,
      tf: tf, len: len
    });
  }

  /* A block longer than one passage (1,400 characters) used to lose its tail: Step 4's maximum cell
     voltage and the park rule were never found. Such a block is also indexed line by line: each list
     item and paragraph inside it is its own passage, labelled with the block it belongs to. */
  function addDeep(tab, step, label, el, prefix) {
    if (plain(el).length <= 1400) { return; }
    Array.prototype.forEach.call(el.querySelectorAll("li, p, .asm-warn, .asm-note-top"), function (x) {
      if (x.closest(".asm-step") && !el.classList.contains("asm-step")) { return; }
      const t = plain(x);
      if (t.length < 30) { return; }
      addPassage(tab, step, label, x, (prefix + t).slice(0, 1400));
    });
  }

  function buildIndex() {
    PASSAGES.length = 0;
    const panels = document.querySelectorAll("main section[role='tabpanel']");
    Array.prototype.forEach.call(panels, function (panel) {
      const tab = String(panel.id || "").replace(/^p-/, "");
      const before = PASSAGES.length;

      /* assembly steps get one passage each — they are the most asked-about */
      const steps = panel.querySelectorAll(".asm-step");
      Array.prototype.forEach.call(steps, function (sec) {
        const n = Number(sec.getAttribute("data-step"));
        const h = sec.querySelector("h3");
        const notes = sec.querySelector(".asm-notes") || sec;
        addPassage(tab, n, "Step " + n + " — " + plain(h), sec,
          ("Step " + n + " " + plain(h) + ". " + plain(notes)).slice(0, 1400));
        addDeep(tab, n, "Step " + n + " — " + plain(h), sec, "Step " + n + " " + plain(h) + ". ");
      });

      /* the money boxes are not cards or folds: index the bill, the GST line and Buy today's totals */
      ["#bill", "#parts-gst", "#buy-sum", "#buy-line"].forEach(function (sel) {
        const box = panel.querySelector(sel);
        if (box && plain(box)) { addPassage(tab, null, sel === "#bill" || sel === "#parts-gst" ? "Your bill" : "Buy today", box, plain(box).slice(0, 1400)); }
      });

      /* accordions: everything else worth quoting */
      const accs = panel.querySelectorAll("details.acc");
      Array.prototype.forEach.call(accs, function (d) {
        if (d.querySelector(".asm-step")) { return; }
        const sum = d.querySelector("summary");
        addPassage(tab, null, plain(sum), d, plain(d).slice(0, 1400));
        addDeep(tab, null, plain(sum), d, plain(sum) + ". ");
      });

      /* loose cards that are not inside an accordion */
      const cards = panel.querySelectorAll(".card");
      Array.prototype.forEach.call(cards, function (c) {
        if (c.closest("details")) { return; }
        const h = c.querySelector("h2, h3, strong");
        addPassage(tab, null, plain(h) || (TABS[tab] || tab), c, plain(c).slice(0, 1400));
        addDeep(tab, null, plain(h) || (TABS[tab] || tab), c, "");
      });

      if (PASSAGES.length === before) {
        addPassage(tab, null, TABS[tab] || tab, panel, plain(panel).slice(0, 1400));
      }
    });
    /* The curated domain pack (docs/domain/, generated into docs/js/domain.js)
       is indexed by the same BM25 as the page, so one retrieval pass serves the
       build and the wider drone/AI material. Each chunk carries its source and
       date in the passage text, so the model can label a claim per-claim
       instead of inventing a citation. */
    const domain = typeof window !== "undefined" ? window.GUIDE_DOMAIN : null;
    if (domain && domain.chunks && domain.chunks.length) {
      domain.chunks.forEach(function (c) {
        addPassage("", null, domainLabel(c), null,
          c.text + " Source: " + c.source + " (verified " + c.verified + ").");
      });
    }

    return PASSAGES.length;
  }

  /* Corrections are labelled as corrections at every surface (decisions 4 and
     12): never folded silently into the prose, always named. */
  function domainLabel(c) {
    if (c && c.correction) {
      return "Correction on file \u00b7 " + String(c.heading || "")
        .replace(/^\s*correction\s*[\u2014\-\u2013]+\s*/i, "");
    }
    return "Domain \u00b7 " + String((c && c.heading) || "");
  }

  /* Corrections on file ride along with offline answers: when one is among the
     top retrieval hits for the question, the answer says so, in words. */
  function withCorrections(msg, question) {
    if (!msg || msg.role !== "bot") { return msg; }
    const hits = searchPassages(String(question || ""), 3).filter(function (h) {
      return /^Correction on file/.test(h.p.label || "");
    });
    if (!hits.length) { return msg; }
    const note = hits[0].p.text.replace(/\s*Source: [\s\S]*$/, "").slice(0, 220);
    const out = Object.assign({}, msg);
    out.body = (msg.body || []).concat(["\u26a0 Correction on file: " + note]);
    return out;
  }

  /* BM25 over the page passages */
  function searchPassages(query, limit) {
    const q = uniq(tokens(query));
    if (!q.length || !PASSAGES.length) { return []; }
    const N = PASSAGES.length;
    let totalLen = 0;
    PASSAGES.forEach(function (p) { totalLen += p.len; });
    const avg = totalLen / N || 1;
    const df = {};
    q.forEach(function (t) {
      let n = 0;
      PASSAGES.forEach(function (p) { if (p.tf[t]) { n += 1; } });
      df[t] = n;
    });
    const scored = PASSAGES.map(function (p) {
      let s = 0;
      q.forEach(function (t) {
        const f = p.tf[t] || 0;
        if (!f) { return; }
        const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
        s += idf * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * (p.len / avg)));
      });
      return { p: p, score: s };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.filter(function (x) { return x.score > 0; }).slice(0, limit || 3);
  }

  /* ======================================================================
     MATCHING — curated entries first, because they carry the advice
     ====================================================================== */
  function tagHits(query, entry) {
    const q = " " + norm(query) + " ";
    let hits = 0, score = 0;
    entry.tags.forEach(function (tag) {
      const t = norm(tag);
      if (!t) { return; }
      const found = t.indexOf(" ") !== -1 ? q.indexOf(t) !== -1 : q.indexOf(" " + t + " ") !== -1;
      if (!found) { return; }
      hits += 1;
      score += 1 + Math.min(t.length, 18) / 18;
    });
    /* title words are worth something but never enough on their own */
    const qs = uniq(tokens(query));
    const ts = uniq(tokens(entry.title));
    let overlap = 0;
    qs.forEach(function (w) { if (ts.indexOf(w) !== -1) { overlap += 1; } });
    score += overlap * 1.4;
    return { score: score, hits: hits, overlap: overlap };
  }

  function matchEntry(query) {
    let best = null;
    KB.forEach(function (entry) {
      const r = tagHits(query, entry);
      if (!r.score) { return; }
      if (!best || r.score > best.score) {
        best = { entry: entry, score: r.score, hits: r.hits, overlap: r.overlap };
      }
    });
    if (!best) { return null; }
    const qlen = uniq(tokens(query)).length;
    /* Short questions ("no video", "gps fix") need less evidence than long
       rambling ones, otherwise nothing ever clears the bar. */
    const need = qlen <= 2 ? 1.2 : (qlen <= 4 ? 2.0 : 2.6);
    /* A written answer needs at least one of its own tags in the question: a shared title word alone
       ("test", "fly") once sent "How do I run the tests?" to the wildfire card. Without a tag hit the
       question falls through to the nearest page passage instead. */
    best.confident = best.hits > 0 && best.score >= need;
    best.close = best.hits > 0 && best.score >= 1.4;
    return best;
  }

  function relatedChips(entry, n) {
    const out = [];
    const start = KB.indexOf(entry);
    for (let i = 1; i <= KB.length && out.length < (n || 2); i += 1) {
      const e = KB[(start + i) % KB.length];
      if (e && e.id !== entry.id) { out.push(e.title); }
    }
    return out;
  }

  /* ======================================================================
     ANSWERING — deterministic, grounded, and honest about its own scope
     ====================================================================== */
  const GREETING = ["hi", "hello", "hey", "yo", "hiya", "good morning", "good afternoon", "good evening"];
  const THANKS = ["thanks", "thank you", "cheers", "ta", "thx", "appreciate it"];
  const MORE = ["more", "next", "and then", "what else", "go on", "continue", "anything else"];
  const WHY = ["why", "why is that", "why?", "explain", "how come"];

  const ctx = { lastId: "", lastQuery: "", turns: 0, history: [] };

  function entryMessage(entry, opts) {
    const o = opts || {};
    const see = (entry.see || []).map(function (s) {
      return { label: s[0], tab: s[1], step: s[2] || null };
    });
    /* an entry may read one live line from the page (the Buy-today total), so its figures never go stale */
    let live = "";
    try { live = typeof entry.live === "function" ? entry.live() : ""; } catch (e) { live = ""; }
    return {
      role: "bot",
      title: entry.title,
      body: (o.lead ? [o.lead] : []).concat(live ? [live] : []),
      steps: entry.steps.slice(0, o.limit || entry.steps.length),
      note: entry.note || "",
      src: entry.src || "",
      see: see,
      chips: o.chips || []
    };
  }

  function introMessage() {
    return {
      role: "bot",
      intro: true,
      title: "Ask me about this build",
      body: ["I answer from this guide's own text and from a troubleshooting set written for exactly these parts — the GEPRC F405 stack, the RP1 receiver, the Pi Zero 2 WH, the MLX90640 and the PA1010D GPS.",
        "If something is not in the guide, I will tell you instead of inventing it. Prices and regulations always get pointed back at the page that keeps them current."],
      steps: [],
      note: "",
      src: ENDPOINT
        ? "Answers below are written by an AI model from this guide's own passages, each shown with its source."
        : "No network, no API key: answers come from this page and its built-in troubleshooting set.",
      see: [],
      chips: ["No video on the monitor", "Thermal image is noisy at 8 Hz", "Receiver won't bind", "Pi keeps rebooting", "What does it cost?"]
    };
  }

  function refusalMessage(query) {
    const hits = searchPassages(query, 2);
    if (hits.length && hits[0].score >= 2) {
      const p = hits[0].p;
      return {
        role: "bot",
        title: "Closest thing in the guide",
        body: ["I do not have a tested answer for that specific question, so here is the nearest passage rather than a guess:"],
        steps: [],
        quote: { label: p.label || (TABS[p.tab] || p.tab), text: clip(p.text, 420) },
        note: "",
        src: "",
        see: [{ label: p.label || (TABS[p.tab] || p.tab), tab: p.tab, step: p.step }],
        chips: ["What should I do next?", "Honest limits"]
      };
    }
    return {
      role: "bot",
      title: "That one is outside this guide",
      body: ["I would rather say so than invent an answer. This guide covers one specific build: a 5-inch analog FPV quad with a Pi Zero 2 WH thermal payload.",
        "Things I can help with right now:"],
      steps: ["Bench problems: props, power, smoke stopper, soldering.",
        "Radio and video: binding, channels, failsafe, no picture.",
        "Payload: I2C, the thermal camera's noise and refresh rate, GPS fixes, thresholds.",
        "Money, rules and schedule: the budget, Transport Canada conditions, the 46 hours."],
      note: "For what the guide deliberately does not claim, read Honest limits & sources (in Learn).",
      src: "",
      see: [{ label: "Honest limits & sources", tab: "limits" }],
      chips: ["Thermal image is noisy at 8 Hz", "Receiver won't bind", "How close can I fly to people?", "What does it cost?"]
    };
  }

  /* ======================================================================
     NAVIGATION — reuse the page's own tab / stepper logic, never duplicate it
     ====================================================================== */
  function jump(tab, step) {
    if (tab && TABS[tab] && typeof window.openTab === "function") { window.openTab(tab); }
    let el = null;
    if (step) {
      Array.prototype.forEach.call(document.querySelectorAll("#p-steps details"), function (d) {
        if (d.querySelector(".asm-step[data-step='" + step + "']")) { d.open = true; }
      });
      const dot = document.querySelector("[data-asm-dot='" + step + "']");
      if (dot) { dot.click(); }
      el = document.querySelector(".asm-step[data-step='" + step + "']");
    } else if (tab) {
      el = document.getElementById("p-" + tab);
    }
    if (!el) { return false; }
    try { el.scrollIntoView({ behavior: "smooth", block: step ? "center" : "start" }); }
    catch (e) { el.scrollIntoView(); }
    el.classList.add("ga-flash");
    setTimeout(function () { el.classList.remove("ga-flash"); }, 1800);
    return true;
  }

  /* ======================================================================
     THE DISPATCHER
     ====================================================================== */
  function anyStarts(q, list) {
    for (let i = 0; i < list.length; i += 1) {
      if (q.indexOf(list[i]) === 0) { return true; }
    }
    return false;
  }
  function entryById(id) {
    for (let i = 0; i < KB.length; i += 1) { if (KB[i].id === id) { return KB[i]; } }
    return null;
  }
  function seeOf(entry) {
    return (entry.see || []).map(function (s) {
      return { label: s[0], tab: s[1], step: s[2] || null };
    });
  }

  const TAB_WORDS = [
    [/^(open |show |go to |jump to )?(the )?(budget|parts list|price list)/, "parts"],
    [/^(open |show |go to |jump to )?(the )?quiz/, "quiz"],
    [/^(open |show |go to |jump to )?(the )?(career|salary|jobs)/, "career"],
    [/^(open |show |go to |jump to )?(the )?(limits|sources)/, "limits"],
    [/^(open |show |go to |jump to )?(the )?(how it works|pipeline)/, "build"]
  ];

  /* The offline answer, with any correction on file shown alongside it (the
     corrections memory reaches every answer path, not just the model's). */
  function answerLocal(text) {
    return withCorrections(answerLocalRaw(text), text);
  }

  function answerLocalRaw(text) {
    const raw = String(text || "").trim();
    const q = norm(raw);
    if (!q) { return introMessage(); }

    /* --- pleasantries ------------------------------------------------- */
    if (anyStarts(q, GREETING)) { return introMessage(); }
    if (anyStarts(q, THANKS)) {
      return {
        role: "bot", title: "Any time",
        body: ["Props off, safety glasses on, and check the obvious thing before the expensive thing."],
        steps: [], src: "", see: [], chips: ["What should I do next?", "Thermal image is noisy at 8 Hz"]
      };
    }

    const last = ctx.lastId ? entryById(ctx.lastId) : null;

    /* --- follow-ups that only make sense in a conversation ------------- */
    if (last && anyStarts(q, WHY) && last.why) {
      return {
        role: "bot", title: "Why that is the answer",
        body: [last.why], steps: [], src: last.src,
        see: seeOf(last), chips: relatedChips(last, 2)
      };
    }
    if (last && (anyStarts(q, MORE) || /^(yes|yeah|yep|ok|okay|sure|do it)$/.test(q))) {
      const next = last.next ? entryById(last.next) : null;
      if (next) {
        ctx.lastId = next.id;
        return entryMessage(next, { lead: "Next thing to check:", chips: relatedChips(next, 2) });
      }
      return {
        role: "bot", title: "That is the whole checklist",
        body: ["Nothing further in that entry. The full ordered list for this part of the build is one click away."],
        steps: [], src: "", see: seeOf(last), chips: relatedChips(last, 3)
      };
    }

    /* --- "open step 6", "show me the budget" --------------------------- */
    const stepM = q.match(/\bstep\s*([1-8])\b/) || q.match(/\b([1-8])(?:st|nd|rd|th)?\s+step\b/);
    if (stepM && /^(open|show|go|goto|jump|take|bring|where|find|scroll|what)/.test(q)) {
      const n = Number(stepM[1]);
      const names = ["", "Lay out all the parts", "Build the frame", "Solder the stack",
        "Add control and video", "Charge the batteries safely", "Wire the Pi payload",
        "Mount and balance", "Test, in this order"];
      jump("steps", n);
      return {
        role: "bot", title: "Step " + n + " — " + names[n],
        body: ["Opened it in Build. Each step ends with a check you have to pass before the next one."],
        steps: [], src: "", see: [STEP(n, "Back to step " + n), ["All 8 steps", "steps"]],
        chips: ["Props on or off?", "What should I do next?"]
      };
    }
    for (let i = 0; i < TAB_WORDS.length; i += 1) {
      if (TAB_WORDS[i][0].test(q) && /^(open|show|go|jump|take)/.test(q)) {
        const tab = TAB_WORDS[i][1];
        jump(tab);
        return {
          role: "bot", title: "Opened " + (TABS[tab] || tab),
          body: ["I switched tabs for you. Ask me anything about what is in there."],
          steps: [], src: "", see: [[TABS[tab] || tab, tab]], chips: ["What should I do next?"]
        };
      }
    }

    /* --- curated entries ---------------------------------------------- */
    const m = matchEntry(q);
    if (m && m.confident) {
      ctx.lastId = m.entry.id;
      ctx.lastQuery = raw;
      return entryMessage(m.entry, { chips: relatedChips(m.entry, 2) });
    }
    if (m && m.close) {
      ctx.lastId = m.entry.id;
      ctx.lastQuery = raw;
      return entryMessage(m.entry, {
        lead: "Closest match I have — if that is not your problem, rephrase it or pick a suggestion below.",
        chips: relatedChips(m.entry, 2)
      });
    }

    /* --- nothing matched: quote the nearest passage, or admit the gap --- */
    return refusalMessage(raw);
  }

  /* ======================================================================
     UI — a small dialog that stays out of the page's way
     ====================================================================== */
  const UI = { root: null, panel: null, log: null, input: null, busy: false };
  const MESSAGES = [];

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function renderMessage(msg) {
    const wrap = el("div", "ga-msg ga-" + (msg.role || "bot"));
    if (msg.role === "user") {
      wrap.appendChild(el("p", "ga-user-text", msg.text));
      return wrap;
    }
    const card = el("div", "ga-card");
    if (msg.title) { card.appendChild(el("h4", "ga-title", msg.title)); }
    if (msg.md && msg.body && msg.body.length) {
      const stream = el("div", "ga-stream");
      renderMarkdown(stream, msg.body.join("\n\n"));
      card.appendChild(stream);
    } else {
      (msg.body || []).forEach(function (t) { card.appendChild(el("p", "ga-body", t)); });
    }
    if (msg.quote) {
      const q = el("blockquote", "ga-quote");
      q.appendChild(el("span", "ga-quote-label", msg.quote.label));
      q.appendChild(el("span", "ga-quote-text", msg.quote.text));
      card.appendChild(q);
    }
    if (msg.steps && msg.steps.length) {
      const ol = el("ol", "ga-steps");
      msg.steps.forEach(function (s) { ol.appendChild(el("li", null, s)); });
      card.appendChild(ol);
    }
    if (msg.note) { card.appendChild(el("p", "ga-note", msg.note)); }
    if (msg.suggestion) { renderSuggestion(card, msg); }
    if (msg.view3d) { renderView3d(card, msg.view3d); }
    if (msg.src) { card.appendChild(el("p", "ga-src", "Source: " + msg.src)); }
    if (msg.see && msg.see.length) {
      const row = el("div", "ga-see");
      msg.see.forEach(function (s) {
        const b = el("button", "ga-link", s.label);
        b.type = "button";
        b.addEventListener("click", function () { jump(s.tab, s.step); });
        row.appendChild(b);
      });
      card.appendChild(row);
    }
    wrap.appendChild(card);
    if (msg.chips && msg.chips.length && msg.intro) {
      const row = el("div", "ga-chips");
      msg.chips.forEach(function (c) {
        const b = el("button", "ga-chip", c);
        b.type = "button";
        b.addEventListener("click", function () { ask(c); });
        row.appendChild(b);
      });
      wrap.appendChild(row);
    }
    return wrap;
  }

  function suggestionStatusText(s) {
    if (s.status === "dismissed") { return "Suggestion dismissed. No server request or write was made."; }
    if (s.status === "accepted") {
      return "Proposal created: " + s.proposal + ". Your real guide is unchanged pending normal review.";
    }
    return s.error || "Accept creates a proposal for review. Reject dismisses only this local suggestion.";
  }

  function renderSuggestion(card, msg) {
    const s = msg.suggestion;
    /* A reload must never resurrect an in-flight write as an active pending card. */
    if (!s.status || s.status === "accepting") { s.status = "ready"; }
    const op = s.op || {};
    card.appendChild(el("p", "ga-note", "Section: " + op.section));
    card.appendChild(el("p", "ga-src", "Before"));
    card.appendChild(el("pre", "ga-suggestion-text", op.oldText || ""));
    card.appendChild(el("p", "ga-src", "Suggested replacement"));
    card.appendChild(el("pre", "ga-suggestion-text", op.newText || ""));

    const groups = [
      ["improves", "What improves"],
      ["corpusSupport", "Corpus support"],
      ["conflicts", "Conflicts"]
    ];
    groups.forEach(function (group) {
      card.appendChild(el("p", "ga-title", group[1]));
      const claims = s.report && Array.isArray(s.report[group[0]]) ? s.report[group[0]] : [];
      if (!claims.length) {
        card.appendChild(el("p", "ga-note", group[0] === "conflicts"
          ? "No conflict was found in the supplied corpus; other conflicts may exist."
          : "No cited claims were returned."));
        return;
      }
      const list = el("ol", "ga-steps");
      claims.forEach(function (item) {
        const li = el("li", null, item.claim);
        const citations = el("ul", "ga-suggestion-citations");
        (item.citations || []).forEach(function (citation) {
          citations.appendChild(el("li", "ga-src",
            citation.source + " · " + citation.label + " — “" + citation.quote + "”"));
        });
        li.appendChild(citations);
        list.appendChild(li);
      });
      card.appendChild(list);
    });

    const status = el("p", "ga-note", suggestionStatusText(s));
    status.setAttribute("data-ga-suggestion-status", "true");
    card.appendChild(status);
    const row = el("div", "ga-see");
    const accept = el("button", "ga-chip", "Accept");
    accept.type = "button";
    accept.setAttribute("data-ga-suggestion-accept", "true");
    const reject = el("button", "ga-chip", "Reject");
    reject.type = "button";
    reject.setAttribute("data-ga-suggestion-reject", "true");
    accept.disabled = s.status !== "ready";
    reject.disabled = s.status !== "ready";
    accept.addEventListener("click", function () {
      acceptSuggestion(msg, accept, reject, status);
    });
    reject.addEventListener("click", function () {
      if (s.status !== "ready") { return; }
      s.status = "dismissed";
      s.error = "";
      accept.disabled = true;
      reject.disabled = true;
      status.textContent = suggestionStatusText(s);
      persist(true);
    });
    row.appendChild(accept);
    row.appendChild(reject);
    card.appendChild(row);
  }

  /* ---------- markdown-lite, built as DOM nodes (no innerHTML, no XSS) ------ */
  function inlineInto(target, text) {
    String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(function (part) {
      if (!part) { return; }
      if (/^\*\*[^*]+\*\*$/.test(part)) { target.appendChild(el("strong", null, part.slice(2, -2))); }
      else if (/^`[^`]+`$/.test(part)) { target.appendChild(el("code", null, part.slice(1, -1))); }
      else { target.appendChild(document.createTextNode(part)); }
    });
  }

  function renderMarkdown(container, text) {
    container.textContent = "";
    String(text || "").split(/\n{2,}/).forEach(function (block) {
      /* [[NAV ...]] and [[REMEMBER ...]] are instructions for the page and the server, never text to read */
      const lines = block.split("\n").filter(function (l) { return l.trim() && !/^\s*\[\[/.test(l); });
      if (!lines.length) { return; }
      const allBullet = lines.every(function (l) { return /^\s*[-*\u2022]\s+/.test(l); });
      const allNumber = lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); });
      if (allBullet || allNumber) {
        const list = el(allBullet ? "ul" : "ol", "ga-steps");
        lines.forEach(function (l) {
          const li = el("li");
          inlineInto(li, l.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s+/, ""));
          list.appendChild(li);
        });
        container.appendChild(list);
        return;
      }
      const p = el("p", "ga-body");
      lines.forEach(function (l, i) {
        if (i) { p.appendChild(document.createElement("br")); }
        inlineInto(p, l);
      });
      container.appendChild(p);
    });
  }

  /* ---------- streaming card ------------------------------------------------ */
  function streamingCard() {
    const wrap = el("div", "ga-msg ga-bot");
    const card = el("div", "ga-card");
    const title = el("h4", "ga-title", "Thinking\u2026");
    const body = el("div", "ga-stream");
    const foot = el("div", "ga-foot");
    const stop = el("button", "ga-stop", "Stop");
    stop.type = "button";
    foot.appendChild(stop);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(foot);
    wrap.appendChild(card);
    UI.log.appendChild(wrap);
    UI.log.scrollTop = UI.log.scrollHeight;
    return { wrap: wrap, card: card, title: title, body: body, foot: foot, stop: stop, meta: null };
  }

  function finishStream(card, msg) {
    if (card.stop.parentNode) { card.stop.parentNode.removeChild(card.stop); }
    card.title.textContent = msg.title || "Answer";
    if (msg.src) { card.foot.appendChild(el("p", "ga-src", "Source: " + msg.src)); }
    if (msg.see && msg.see.length) {
      const row = el("div", "ga-see");
      msg.see.forEach(function (s) {
        const b = el("button", "ga-link", s.label);
        b.type = "button";
        b.addEventListener("click", function () { jump(s.tab, s.step); });
        row.appendChild(b);
      });
      card.foot.appendChild(row);
    }
    card.card.classList.remove("ga-live");
    UI.log.scrollTop = UI.log.scrollHeight;
  }

  /* ---------- retrieval-augmented context for the model --------------------
     The curated entry goes first: it is exactly the advice a good answer should
     contain, and the page passages give the model the guide's own wording. */
  function buildContext(question) {
    const out = [];
    const hit = matchEntry(norm(question));
    if (hit) {
      const e = hit.entry;
      const first = (e.see && e.see[0]) || null;
      let text = e.steps.join(" ");
      if (e.note) { text += " Safety note: " + e.note; }
      if (e.why) { text += " Why: " + e.why; }
      if (e.src) { text += " Source: " + e.src; }
      out.push({
        label: "Troubleshooting: " + e.title,
        tab: first ? first[1] : "",
        step: first && first[2] ? first[2] : null,
        text: text
      });
    }
    searchPassages(question, 4).forEach(function (h) {
      out.push({
        label: h.p.label || TABS[h.p.tab] || h.p.tab,
        tab: h.p.tab, step: h.p.step || null, text: h.p.text
      });
    });
    return out.slice(0, 6);
  }

  function historyText(msg) {
    if (!msg) { return ""; }
    if (msg.md && msg.body && msg.body.length) { return msg.body.join("\n\n"); }
    return [msg.title || ""].concat(msg.steps || []).join(". ").trim();
  }

  /* Build position is conversation state too: the phone can reopen the tab and
     assembly step where the desktop stopped. Read the page's own controls rather
     than maintaining a second stepper that could drift out of sync. */
  function normaliseBuild(value) {
    if (!value || typeof value !== "object" || !TABS[value.tab]) { return null; }
    const n = Number(value.step);
    return {
      tab: value.tab,
      step: value.tab === "steps" && Number.isInteger(n) && n >= 1 && n <= 8 ? n : null
    };
  }
  function buildPosition() {
    const selected = document.querySelector("[role='tab'][aria-selected='true']");
    const tab = selected && selected.id.indexOf("t-") === 0 ? selected.id.slice(2) : "why";
    let step = null;
    if (tab === "steps") {
      const dot = document.querySelector("[data-asm-dot][aria-current='step']");
      const n = dot ? Number(dot.getAttribute("data-asm-dot")) : NaN;
      if (Number.isInteger(n) && n >= 1 && n <= 8) { step = n; }
    }
    return { tab: TABS[tab] ? tab : "why", step: step };
  }
  function restoreBuild(value) {
    const build = normaliseBuild(value);
    return build ? jump(build.tab, build.step) : false;
  }
  let buildSyncTimer = null;
  function scheduleBuildSync() {
    if (buildSyncTimer) { clearTimeout(buildSyncTimer); }
    buildSyncTimer = setTimeout(function () { buildSyncTimer = null; persist(); }, 80);
  }
  function watchBuildPosition() {
    document.addEventListener("click", function (e) {
      const target = e.target && e.target.closest;
      if (target && e.target.closest("#tabs, #learn-tabs, [data-assembly]")) { scheduleBuildSync(); }
    });
    document.addEventListener("keydown", function (e) {
      const target = e.target && e.target.closest;
      if (target && e.target.closest("#tabs, #learn-tabs") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        scheduleBuildSync();
      }
    });
    window.addEventListener("hashchange", scheduleBuildSync);
  }

  function persist(localOnly) {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        v: 3,
        lastId: ctx.lastId,
        history: ctx.history.slice(-12),
        messages: MESSAGES.slice(-MAX_TURNS),
        build: buildPosition()
      }));
    } catch (e) { /* private mode: the chat simply does not persist */ }
    if (!localOnly) { syncThread(); }
  }

  /* ---- conversation memory (decisions 11's spirit: kept, never trained on) --
     One thread per browser, mirrored to the server when one is present, so the
     phone and the desktop see the same conversations. The local copy always
     survives; the mirror is best-effort. */
  const THREAD_KEY = "ga-thread";
  function threadId() {
    try {
      let id = localStorage.getItem(THREAD_KEY);
      if (!id) {
        id = "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
        localStorage.setItem(THREAD_KEY, id);
      }
      return id;
    } catch (e) { return "t-ephemeral"; }
  }
  function threadTitle() {
    const first = MESSAGES.filter(function (m) { return m.role === "user"; })[0];
    return String((first && (first.text || first.title)) || "conversation").slice(0, 70);
  }
  function syncThread() {
    if (!ENDPOINT || typeof fetch !== "function") { return null; }
    try {
      return fetch("/api/conversations/" + threadId(), {
        method: "PUT",
        headers: writeTokenHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          title: threadTitle(),
          messages: MESSAGES.slice(-200),
          history: ctx.history.slice(-12),
          lastId: ctx.lastId,
          build: buildPosition()
        })
      }).catch(function () { return null; /* offline: localStorage keeps it */ });
    } catch (e) { return null; }
  }
  function loadThread(id) {
    return fetch("/api/conversations/" + encodeURIComponent(id), { cache: "no-store", headers: writeTokenHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) { return null; }
        MESSAGES.length = 0;
        UI.log.textContent = "";
        (j.thread.messages || []).forEach(function (m) {
          MESSAGES.push(m);
          UI.log.appendChild(renderMessage(m));
        });
        ctx.history = (j.thread.history || []).slice(-12);
        ctx.lastId = j.thread.lastId || "";
        try { localStorage.setItem(THREAD_KEY, id); } catch (e) { /* ignore */ }
        restoreBuild(j.thread.build);
        UI.log.scrollTop = UI.log.scrollHeight;
        persist();
        return j.thread;
      })
      .catch(function () { return null; /* leave the view alone */ });
  }

  function modeLabel() {
    if (ENDPOINT) { return "AI answers \u00b7 grounded in this guide"; }
    if (typeof location !== "undefined" && location.protocol === "file:") {
      return "Offline copy \u00b7 " + KB.length + " written answers \u00b7 no AI";
    }
    return "Grounded in this guide \u00b7 works offline";
  }

  const LOCAL_HOST = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(location.hostname);

  function setMode() {
    const sub = document.getElementById("ga-sub");
    if (sub) { sub.textContent = modeLabel(); }
    /* Say it out loud, in the panel, rather than leaving the user to work out why
       the answers are canned and the key field is disabled. */
    const note = document.getElementById("ga-offline-note");
    if (note) {
      const isFile = typeof location !== "undefined" && location.protocol === "file:";
      note.hidden = !!ENDPOINT;
      note.textContent = isFile
        ? "This is the offline copy: " + KB.length + " written answers, no AI, and no API key can be entered here. " +
          "For AI: " + START_HINT
        : PAIR_NEEDED
          ? "This phone is not paired with the laptop yet, so these are the " + KB.length + " written answers. " +
            "On the laptop: ⚙ Settings, Phone access, Pair a phone. Then type its 6-digit code below."
        : SERVER_PRESENT
          ? "No API key yet, so these are the " + KB.length + " written answers only. " +
            "Open \u2699 Settings, paste your provider key, and press Save key."
          : LOCAL_HOST
            ? "No local server, so these are the " + KB.length + " written answers only. For AI: " + START_HINT
            /* Fable Part 2, N2: on the published site (a phone, or any other computer) there is nothing to run */
            : "These are the " + KB.length + " written answers. AI answers need the guide's local server, which runs " +
              "on the laptop the guide is set up on; this published page cannot use it.";
    }
  }

  /* If the page is being served by server/assistant-server.js, use it without
     any configuration. Silent: on any failure the offline engine stays in use.
     Returns a promise so the test hook can wait for the answer. */
  function probeEndpoint() {
    if (ENDPOINT || location.protocol === "file:" || typeof fetch !== "function") {
      return Promise.resolve(ENDPOINT);
    }
    return fetch("/api/health", { cache: "no-store", headers: writeTokenHeaders() })
      .then(function (r) {
        /* job 8: a phone on the home network that is not paired yet gets 401 with pair: true */
        if (r.status === 401) {
          return r.json().then(function (j) { if (j && j.pair) { PAIR_NEEDED = true; setMode(); showPairCard(true); } return null; }, function () { return null; });
        }
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (j && j.ok) { SERVER_PRESENT = true; PAIR_NEEDED = false; HEALTH = j; showPairCard(false); setMode(); }
        if (j && j.ok && (j.keyConfigured || j.local)) {
          ENDPOINT = "/api/ask";
          setMode();
        }
        if (j && j.ok) { updateStatus(); startProgressSync(); }
        return ENDPOINT;
      })
      .catch(function () { return ENDPOINT; /* not our server: stay offline */ });
  }

  /* Test hook: ?ga-ask=<question> asks one question, then reports what the page
     actually rendered so scripts/dev/check-llm-path.ps1 can assert on it. The
     report is only accepted by a server started with GA_TEST=1. */
  function runAskProbe(question) {
    return ask(question, { forceModel: true }).then(function (msg) {
      const text = msg && msg.md ? (msg.body || []).join("\n\n") : historyText(msg);
      const report = {
        endpoint: ENDPOINT || "offline",
        chars: String(text || "").length,
        see: (msg && msg.see) ? msg.see.length : 0,
        src: (msg && msg.src) || "",
        renderedListItems: UI.log.querySelectorAll(".ga-stream li").length,
        renderedLinks: UI.log.querySelectorAll(".ga-link").length,
        stillStreaming: UI.log.querySelectorAll(".ga-live").length,
        hasNavDirective: /\[\[NAV/i.test(String(text || "")),
        text: String(text || "").slice(0, 600)
      };
      const pre = document.createElement("pre");
      pre.id = "ga-answer-probe";
      pre.textContent = Object.keys(report).map(function (k) {
        return "PROBE " + k + "=" + report[k];
      }).join("\n");
      document.body.appendChild(pre);
      try {
        fetch("/api/probe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(report)
        }).catch(function () { /* no test server listening: fine */ });
      } catch (e) { /* ignore */ }
      return report;
    });
  }

  /* Real-browser Item C probe: save a position, move away, then load the same
     thread as another device would. Results go only to a GA_TEST=1 server. */
  function runBuildSyncProbe() {
    const lines = [];
    const add = function (name, ok, info) {
      lines.push((ok ? "PASS " : "FAIL ") + name + (info ? "  [" + info + "]" : ""));
    };
    jump("steps", 4);
    const wanted = buildPosition();
    add("the browser reads the current tab and assembly step",
      wanted.tab === "steps" && wanted.step === 4, JSON.stringify(wanted));

    return Promise.resolve(syncThread()).then(function (r) {
      add("the browser's thread sync succeeds", !!r && r.ok === true, r ? "status " + r.status : "no response");
      return fetch("/api/conversations/" + encodeURIComponent(threadId()), { cache: "no-store", headers: writeTokenHeaders() });
    }).then(function (r) { return r.json(); }).then(function (j) {
      const build = j && j.thread && j.thread.build;
      add("the server stores the browser's build position",
        !!build && build.tab === "steps" && build.step === 4, JSON.stringify(build || null));
      jump("why", null);
      add("moving away really changes the visible tab",
        document.getElementById("p-why").hidden === false && buildPosition().tab === "why");
      return loadThread(threadId());
    }).then(function (thread) {
      add("loading the thread restores its tab",
        !!thread && document.getElementById("p-steps").hidden === false);
      const dot = document.querySelector("[data-asm-dot][aria-current='step']");
      add("loading the thread restores its assembly step",
        !!dot && Number(dot.getAttribute("data-asm-dot")) === 4,
        dot ? dot.getAttribute("data-asm-dot") : "no current step");
      let local = null;
      try { local = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { /* reported below */ }
      add("the local thread copy restores the same build position",
        !!local && local.build && local.build.tab === "steps" && local.build.step === 4,
        JSON.stringify(local && local.build));
      add("loading a build position preserves the conversation",
        !!thread && Array.isArray(thread.messages) && thread.messages.length === MESSAGES.length,
        MESSAGES.length + " messages");
    }).catch(function (e) {
      add("the build-sync browser probe ran without throwing", false, String(e && e.message ? e.message : e));
    }).then(function () {
      try {
        fetch("/api/probe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ buildSync: lines })
        }).catch(function () { /* no test server: fine */ });
      } catch (e) { /* ignore */ }
      return lines;
    });
  }

  function push(msg) {
    MESSAGES.push(msg);
    UI.log.appendChild(renderMessage(msg));
    UI.log.scrollTop = UI.log.scrollHeight;
    persist();
    return msg;
  }

  function setOpen(on) {
    UI.panel.hidden = !on;
    document.documentElement.classList.toggle("ga-lock", on && window.innerWidth < 560);
    if (on) {
      UI.panel.removeAttribute("inert");
      updateStatus();
      if (UI.input) { UI.input.focus(); }
    } else {
      UI.panel.setAttribute("inert", "");
    }
  }

  /* ---- the History panel: every conversation, on every device -------------- */
  function buildHistory() {
    const node = el("div", "ga-settings");
    node.id = "ga-history";
    node.hidden = true;
    node.appendChild(el("h4", null, "Conversation history"));
    node.appendChild(el("p", "ga-sub",
      "Stored on your own server only. Never used for training."));
    const list = el("div", null);
    list.id = "ga-history-list";
    node.appendChild(list);
    const row = el("div", "ga-row");
    const fresh = el("button", "ga-chip", "New chat");
    fresh.type = "button";
    fresh.id = "ga-history-new";
    fresh.addEventListener("click", function () {
      try { localStorage.removeItem(THREAD_KEY); } catch (e) { /* ignore */ }
      MESSAGES.length = 0;
      ctx.lastId = "";
      ctx.history.length = 0;
      UI.log.textContent = "";
      push(introMessage());
      renderHistory();
    });
    row.appendChild(fresh);
    node.appendChild(row);
    return {
      node: node,
      refresh: renderHistory
    };
  }

  function renderHistory() {
    const list = document.getElementById("ga-history-list");
    if (!list) { return; }
    list.textContent = "";
    if (!ENDPOINT) {
      list.appendChild(el("p", "ga-sub",
        "History lives on the local server. Run node server/assistant-server.js and reload."));
      return;
    }
    fetch("/api/conversations", { cache: "no-store", headers: writeTokenHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        list.textContent = "";
        const threads = (j && j.threads) || [];
        if (!threads.length) {
          list.appendChild(el("p", "ga-sub", "No conversations yet. Ask something."));
          return;
        }
        threads.slice(0, 40).forEach(function (t) {
          const btn = el("button", "ga-chip");
          btn.style.cssText = "display:block;width:100%;text-align:left;margin:0 0 6px";
          btn.textContent = t.title + "  \u00b7  " + t.count + " messages";
          btn.addEventListener("click", function () { loadThread(t.id); });
          list.appendChild(btn);
        });
      })
      .catch(function () {
        list.appendChild(el("p", "ga-sub", "Could not reach the server."));
      });
  }

  function mount() {
    if (document.getElementById("ga-root")) { return; }
    const root = el("div", null);
    root.id = "ga-root";

    const launcher = el("button", "ga-launcher");
    launcher.id = "ga-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "ga-panel");
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z");
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    launcher.appendChild(svg);
    launcher.appendChild(el("span", "ga-launcher-label", "Ask the guide"));

    const panel = el("div", "ga-panel");
    panel.id = "ga-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "ga-h");

    const head = el("div", "ga-head");
    const titles = el("div", "ga-head-titles");
    const h = el("strong", null, "Guide Assistant");
    h.id = "ga-h";
    titles.appendChild(h);
    const sub = el("span", "ga-sub", modeLabel());
    sub.id = "ga-sub";
    titles.appendChild(sub);
    head.appendChild(titles);

    const btns = el("div", "ga-head-btns");
    const clear = el("button", "ga-icon-btn", "Clear");
    clear.type = "button";
    clear.title = "Clear this conversation";
    clear.addEventListener("click", function () {
      MESSAGES.length = 0;
      ctx.lastId = "";
      ctx.history.length = 0;
      UI.log.innerHTML = "";
      push(introMessage());
    });
    const close = el("button", "ga-icon-btn ga-close", "\u2715");
    close.type = "button";
    close.setAttribute("aria-label", "Close assistant");
    close.addEventListener("click", function () { setOpen(false); launcher.focus(); });
    const gear = el("button", "ga-icon-btn", "\u2699");
    gear.type = "button";
    gear.id = "ga-settings-btn";
    gear.title = "Settings: API key and daily budget";
    gear.setAttribute("aria-label", "Settings");
    gear.setAttribute("aria-expanded", "false");
    const hist = el("button", "ga-icon-btn", "\u2318");
    hist.type = "button";
    hist.id = "ga-history-btn";
    hist.title = "Conversation history";
    hist.setAttribute("aria-label", "History");
    hist.setAttribute("aria-expanded", "false");
    /* The header keeps only Settings and Close. "New chat" and "Past chats" sit in a row right under it (C4: a
       beginner does not look for them inside Settings). */
    btns.appendChild(gear);
    btns.appendChild(close);
    head.appendChild(btns);

    const log = el("div", "ga-log");
    log.id = "ga-log";
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-label", "Conversation");

    const form = el("form", "ga-form");
    form.id = "ga-form";
    const label = el("label", "ga-sr", "Ask a question about this build");
    label.setAttribute("for", "ga-input");
    const input = el("textarea", "ga-input");
    input.id = "ga-input";
    input.rows = 1;
    input.maxLength = 500;
    input.placeholder = "e.g. thermal image is noisy at 8 Hz";
    const send = el("button", "ga-send", "Send");
    send.type = "submit";
    const suggest = el("button", "ga-send", "Suggest an edit");
    suggest.type = "button";
    suggest.id = "ga-suggest";
    suggest.title = "Draft one cited paragraph proposal for the visible section";
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(send);
    /* "Suggest an edit" and "Show in 3D" are built below but deliberately not added to the panel: one chat box and one
       settings button. Their code stays so they can be put back; docs/assistant/REMAINING.md stays parked. */
    const show3d = el("button", "ga-send", "Show in 3D");
    show3d.type = "button";
    show3d.id = "ga-3d";
    show3d.title = "Type what you want to see, e.g. where the receiver wires go, and get a 3D view of it";
    show3d.addEventListener("click", function () {
      const t = input.value.trim();
      if (!t || UI.busy) {
        if (!t) { input.focus(); input.placeholder = "Type what you want to see in 3D, then press Show in 3D"; }
        return;
      }
      input.value = "";
      make3d(t);
    });
    suggest.addEventListener("click", function () {
      const t = input.value.trim();
      if (!t || UI.busy) { return; }
      input.value = "";
      suggestEdit(t);
    });

    const settings = buildSettings();
    /* job 8: where questions go, the monthly cap and phone access sit at the end of Settings */
    const job8 = buildJob8Settings();
    settings.node.appendChild(job8.node);
    const memory = buildMemoryPanel();
    const pairCard = buildPairCard();
    const history = buildHistory();
    const chatRow = el("div", "ga-row ga-chatrow");
    const freshChat = el("button", "ga-chip", "New chat");
    freshChat.type = "button";
    freshChat.addEventListener("click", function () { clear.click(); showSettings(false); showMemory(false); });
    /* the History button (id ga-history-btn) now lives here, labelled "Past chats" */
    hist.className = "ga-chip";
    hist.textContent = "Past chats";
    const memBtn = el("button", "ga-chip", "What I remember");
    memBtn.type = "button";
    memBtn.id = "ga-memory-btn";
    memBtn.setAttribute("aria-expanded", "false");
    chatRow.appendChild(freshChat);
    chatRow.appendChild(hist);
    chatRow.appendChild(memBtn);
    let settingsOpen = false;
    let historyOpen = false;
    let memoryOpen = false;
    function paintViews() {
      log.hidden = settingsOpen || historyOpen || memoryOpen;
      form.hidden = settingsOpen || historyOpen || memoryOpen;
    }
    function showSettings(on) {
      settingsOpen = !!on;
      if (settingsOpen) {
        historyOpen = false; history.node.hidden = true; hist.setAttribute("aria-expanded", "false");
        memoryOpen = false; memory.node.hidden = true; memBtn.setAttribute("aria-expanded", "false");
      }
      settings.node.hidden = !settingsOpen;
      paintViews();
      gear.setAttribute("aria-expanded", settingsOpen ? "true" : "false");
      if (settingsOpen) { settings.refresh(); job8.refresh(); }
    }
    function showHistory(on) {
      historyOpen = !!on;
      if (historyOpen) {
        settingsOpen = false; settings.node.hidden = true; gear.setAttribute("aria-expanded", "false");
        memoryOpen = false; memory.node.hidden = true; memBtn.setAttribute("aria-expanded", "false");
      }
      history.node.hidden = !historyOpen;
      paintViews();
      hist.setAttribute("aria-expanded", historyOpen ? "true" : "false");
      if (historyOpen) { history.refresh(); }
    }
    function showMemory(on) {
      memoryOpen = !!on;
      if (memoryOpen) {
        settingsOpen = false; settings.node.hidden = true; gear.setAttribute("aria-expanded", "false");
        historyOpen = false; history.node.hidden = true; hist.setAttribute("aria-expanded", "false");
      }
      memory.node.hidden = !memoryOpen;
      paintViews();
      memBtn.setAttribute("aria-expanded", memoryOpen ? "true" : "false");
      if (memoryOpen) { memory.refresh(); }
    }
    gear.addEventListener("click", function () { showSettings(!settingsOpen); });
    hist.addEventListener("click", function () { showHistory(!historyOpen); });
    memBtn.addEventListener("click", function () { showMemory(!memoryOpen); });
    const status = el("p", "ga-status");
    status.id = "ga-status";
    status.hidden = true;

    const offlineNote = el("p", "ga-offline-note");
    offlineNote.id = "ga-offline-note";
    offlineNote.hidden = true;

    panel.appendChild(head);
    panel.appendChild(status);
    panel.appendChild(chatRow);
    panel.appendChild(offlineNote);
    panel.appendChild(pairCard);
    panel.appendChild(settings.node);
    panel.appendChild(history.node);
    panel.appendChild(memory.node);
    panel.appendChild(log);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    UI.root = root; UI.panel = panel; UI.log = log; UI.input = input;
    UI.showSettings = showSettings;
    UI.showMemory = showMemory;
    setOpen(false);

    launcher.addEventListener("click", function () {
      const open = panel.hidden;
      setOpen(open);
      launcher.setAttribute("aria-expanded", open ? "true" : "false");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) { return; }
      input.value = "";
      ask(t);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && settingsOpen) {
        if (e.target && e.target.id !== "ga-model") { showSettings(false); }
        return;
      }
      if (e.key === "Escape" && !panel.hidden) { setOpen(false); launcher.focus(); }
    });
  }

  /* ======================================================================
     SETTINGS — the API key and the daily budget.

     The key is POSTed to the local server once, stored in a git-ignored file,
     and never read back: the field is disabled when there is no local server,
     because on file:// or the public site there is nowhere safe to keep it.
     The budget is server state too — a cap enforced only in the page is a
     suggestion, not a cap.
     ====================================================================== */
  function settingsAvailable() {
    /* "/api/ask" means our local server answered /api/health. An absolute URL
       means a Cloudflare Worker, which has no settings endpoint. */
    return ENDPOINT === "/api/ask" || SERVER_PRESENT;
  }

  function buildSettings() {
    const node = el("div", "ga-settings");
    node.id = "ga-settings";
    node.hidden = true;

    const note = el("p", "ga-note");
    note.id = "ga-settings-note";
    note.hidden = true;

    /* The escape hatch. A disabled key field is a dead end: the user is stuck in
       the one copy that can never take a key. This button is shown only when
       there is no local server. It no longer links a fixed address (C3: the
       server on that port may belong to another copy of the guide); it says how
       to start THIS folder's server, which opens the right page itself. */
    const openServer = el("button", "ga-chip", "How to get the AI answers");
    openServer.type = "button";
    openServer.id = "ga-open-server";
    openServer.hidden = true;
    openServer.addEventListener("click", function () {
      setNote(START_HINT, false);
    });

    const providerLabel = el("label", null, "Provider");
    const providerSel = el("select", "ga-select");
    providerSel.id = "ga-provider";
    const providerNote = el("p", "ga-sub");
    providerNote.id = "ga-provider-note";

    const modelLabel = el("label", null, "Model");
    const modelState = el("span", "ga-sub");
    modelState.id = "ga-model-state";
    modelLabel.appendChild(modelState);
    let lastSettings = null;
    let providerModels = [];
    let modelListSig = "";
    const modelInput = el("input", "ga-key-input");
    modelInput.id = "ga-model";
    modelInput.autocomplete = "off";
    modelInput.placeholder = "type to search, e.g. sonnet";
    modelInput.setAttribute("list", "ga-model-list");
    const modelList = document.createElement("datalist");
    modelList.id = "ga-model-list";
    const modelRow = el("div", "ga-row");
    const saveModel = el("button", "ga-chip", "Use this model");
    saveModel.type = "button";
    saveModel.id = "ga-model-save";
    modelRow.appendChild(saveModel);

    const keyLabel = el("label", null, "API key");
    const keyState = el("span", "ga-sub");
    keyState.id = "ga-key-state";
    keyState.textContent = "not set";
    keyLabel.appendChild(keyState);

    const keyInput = el("input", "ga-key-input");
    keyInput.type = "password";
    keyInput.id = "ga-key";
    keyInput.autocomplete = "off";
    keyInput.placeholder = "paste your provider key (stored on this machine only)";

    const keyRow = el("div", "ga-row");
    const saveKey = el("button", "ga-chip", "Save key");
    saveKey.type = "button";
    saveKey.id = "ga-key-save";
    const testKey = el("button", "ga-chip", "Test key");
    testKey.type = "button";
    testKey.id = "ga-key-test";
    const clearKey = el("button", "ga-chip", "Clear");
    clearKey.type = "button";
    clearKey.id = "ga-key-clear";
    keyRow.appendChild(saveKey);
    keyRow.appendChild(testKey);
    keyRow.appendChild(clearKey);

    /* The write token (decision 14's gate 3): needed only when the server is
       reachable beyond this machine. Stored in this browser alone; the server
       never echoes it back. */
    const tokenLabel = el("label", null, "Write token");
    const tokenState = el("span", "ga-sub");
    tokenState.id = "ga-write-token-state";
    tokenState.textContent = "not set";
    tokenLabel.appendChild(tokenState);
    const tokenInput = el("input", "ga-key-input");
    tokenInput.type = "password";
    tokenInput.id = "ga-write-token";
    tokenInput.autocomplete = "off";
    tokenInput.placeholder = "needed only when the server is shared over your network";
    const tokenRow = el("div", "ga-row");
    const saveToken = el("button", "ga-chip", "Save token");
    saveToken.type = "button";
    saveToken.id = "ga-write-token-save";
    const clearToken = el("button", "ga-chip", "Clear");
    clearToken.type = "button";
    clearToken.id = "ga-write-token-clear";
    tokenRow.appendChild(saveToken);
    tokenRow.appendChild(clearToken);
    saveToken.addEventListener("click", function () {
      try {
        localStorage.setItem("ga-write-token", tokenInput.value.trim());
        tokenInput.value = "";
        tokenState.textContent = tokenInput.value ? "" : "saved on this device";
        setNote("Write token saved in this browser.", false);
      } catch (e) { setNote("This browser will not store the token.", true); }
    });
    clearToken.addEventListener("click", function () {
      try { localStorage.removeItem("ga-write-token"); } catch (e) { /* ignore */ }
      tokenState.textContent = "not set";
      setNote("Write token cleared.", false);
    });

    const budgetLabel = el("label", null, "Daily budget");
    const budgetVal = el("b", null, "\u2014");
    budgetVal.id = "ga-budget-val";
    budgetLabel.appendChild(budgetVal);
    const budget = el("input", "ga-budget");
    budget.type = "range";
    budget.id = "ga-budget";
    budget.min = "0.1";
    budget.max = "2";
    budget.step = "0.05";
    budget.value = "0.25";
    const scaleNote = el("p", "ga-sub");

    const viewsHead = el("h4", "ga-settings-section", "3D views");
    const viewsNote = el("p", "ga-sub",
      "\u201cShow in 3D\u201d asks the AI to plan a scene from the guide's part models, and Blender builds it on this computer.");
    const renderLabel = el("label", null, "3D model");
    const renderState = el("span", "ga-sub");
    renderState.id = "ga-render-model-state";
    renderLabel.appendChild(renderState);
    const renderInput = el("input", "ga-key-input");
    renderInput.id = "ga-render-model";
    renderInput.autocomplete = "off";
    renderInput.setAttribute("list", "ga-model-list");
    renderInput.placeholder = "empty = same as the answer model";
    const renderNote = el("p", "ga-sub");
    renderNote.id = "ga-render-model-note";
    const effortLabel = el("label", null, "Thinking effort");
    const effortSel = el("select", "ga-select");
    effortSel.id = "ga-render-effort";
    [["off", "Off \u2014 cheapest, fine for simple views"], ["low", "Low"],
      ["medium", "Medium \u2014 recommended"], ["high", "High \u2014 best layouts, costs the most"]].forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o[0];
      opt.textContent = o[1];
      effortSel.appendChild(opt);
    });
    const effortNote = el("p", "ga-sub");
    effortNote.id = "ga-render-effort-note";
    const blenderLabel = el("label", null, "Blender");
    const blenderState = el("span", "ga-sub");
    blenderState.id = "ga-blender-state";
    blenderLabel.appendChild(blenderState);
    const blenderInput = el("input", "ga-key-input");
    blenderInput.id = "ga-blender-path";
    blenderInput.autocomplete = "off";
    blenderInput.placeholder = "only if not found: paste the path to blender.exe, then press Enter";

    const settingsHead = el("div", "ga-settings-head");
    settingsHead.appendChild(el("h4", null, "Settings"));
    const doneTop = el("button", "ga-chip", "Done");
    doneTop.type = "button";
    doneTop.id = "ga-settings-done";
    settingsHead.appendChild(doneTop);
    const doneBottom = el("button", "ga-send ga-settings-done", "Done \u2014 back to chat");
    doneBottom.type = "button";
    doneBottom.id = "ga-settings-done-bottom";
    [doneTop, doneBottom].forEach(function (b) {
      b.addEventListener("click", function () { if (UI.showSettings) { UI.showSettings(false); } });
    });

    node.appendChild(settingsHead);
    node.appendChild(el("p", "ga-sub", "Changes save by themselves. Each one is confirmed in the green box below this line."));
    node.appendChild(note);
    node.appendChild(providerLabel);
    node.appendChild(providerSel);
    node.appendChild(providerNote);
    node.appendChild(modelLabel);
    node.appendChild(modelInput);
    node.appendChild(modelList);
    node.appendChild(modelRow);
    node.appendChild(keyLabel);
    node.appendChild(keyInput);
    node.appendChild(keyRow);
    node.appendChild(tokenLabel);
    node.appendChild(tokenInput);
    node.appendChild(tokenRow);
    node.appendChild(budgetLabel);
    node.appendChild(budget);
    node.appendChild(scaleNote);
    node.appendChild(viewsHead);
    node.appendChild(viewsNote);
    node.appendChild(renderLabel);
    node.appendChild(renderInput);
    node.appendChild(renderNote);
    node.appendChild(effortLabel);
    node.appendChild(effortSel);
    node.appendChild(effortNote);
    node.appendChild(blenderLabel);
    node.appendChild(blenderInput);
    node.appendChild(openServer);
    node.appendChild(doneBottom);

    function setNote(text, bad) {
      note.textContent = text || "";
      note.hidden = !text;
      note.className = bad ? "ga-note" : "ga-note ok";
    }

    function setDisabled(on) {
      [providerSel, modelInput, saveModel, renderInput, effortSel, blenderInput, keyInput, saveKey, testKey, clearKey, budget].forEach(function (n) {
        n.disabled = !!on;
      });
    }

    function paint(s) {
      keyState.textContent = s.keyConfigured ? "saved, ending " + s.keyHint : "not set";
      modelState.textContent = s.cheapModel ? "\u2713 saved: " + s.cheapModel : "not set";
      renderState.textContent = "\u2713 saved: " + (s.renderModel ? s.renderModel : "same as answers (" + s.renderModelInUse + ")");
      if (document.activeElement !== renderInput) { renderInput.value = s.renderModel || ""; }
      renderNote.textContent = s.renderSuggested && s.renderModelInUse !== s.renderSuggested
        ? "Recommended for 3D: " + s.renderSuggested + ". Placing parts in space is harder than answering, so a strong model pays off here."
        : "This is the recommended model for 3D views.";
      if (s.renderEffort) { effortSel.value = s.renderEffort; }
      effortNote.textContent = s.effortSupported
        ? "Thinking lets the model check its layout before answering. With Sonnet 5.5 on medium, a view costs about 2 cents."
        : "Your provider does not take a thinking setting, so this is ignored there.";
      blenderState.textContent = s.blenderPath ? "\u2713 found: " + s.blenderPath : "not found \u2014 install it free from blender.org";
      try {
        tokenState.textContent = (localStorage.getItem("ga-write-token") || "")
          ? "saved on this device" : "not set";
      } catch (e) { tokenState.textContent = "not set"; }
      if (!providerSel.options.length && s.presets) {
        s.presets.forEach(function (p) {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = p.label;
          providerSel.appendChild(opt);
        });
      }
      if (s.preset) { providerSel.value = s.preset; }
      if (document.activeElement !== modelInput) { modelInput.value = s.cheapModel || ""; }
      lastSettings = s;
      renderModels();
      const sig = (s.preset || s.baseUrl || "") + "|" + (s.keyConfigured ? s.keyHint : "");
      if (sig !== modelListSig) {
        modelListSig = sig;
        providerModels = [];
        fetch("/api/models", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (modelListSig !== sig) { return; }
            providerModels = Array.isArray(j.ids) ? j.ids : [];
            renderModels();
          })
          .catch(function () { /* the suggested models still show */ });
      }
      providerNote.textContent = (s.baseUrl || "") +
        (s.cheapModel ? "  ·  cheap " + s.cheapModel : "") +
        (s.strongModel && s.strongModel !== s.cheapModel ? "  ·  strong " + s.strongModel : "");
      budget.min = String(s.budgetMin);
      budget.max = String(s.budgetMax);
      /* dailyUsdMax 0 means "no cap", not "zero dollars" — a slider cannot show
         zero, and "$0.00 / day" reads like the assistant is switched off. */
      const capped = Number(s.dailyUsdMax) > 0;
      if (document.activeElement !== budget) {
        budget.value = String(capped ? s.dailyUsdMax : s.budgetMin);
      }
      budgetVal.textContent = capped
        ? "  $" + Number(s.dailyUsdMax).toFixed(2) + " / day"
        : "  no cap set";
      scaleNote.textContent =
        "A research job is capped at $" + Number(s.jobBudgetUsd).toFixed(2) +
        " so it can never eat a whole day." +
        (s.blocked ? " Today's budget is spent: answers fall back to the offline engine." : "");
    }

    function renderModels() {
      const s = lastSettings || {};
      const preset = (s.presets || []).find(function (p) { return p.id === s.preset; });
      const suggested = (preset && preset.models ? preset.models : []).slice();
      if (s.cheapModel && suggested.indexOf(s.cheapModel) === -1 &&
          providerModels.indexOf(s.cheapModel) === -1) { suggested.unshift(s.cheapModel); }
      modelList.textContent = "";
      suggested.concat(providerModels.filter(function (m) { return suggested.indexOf(m) === -1; }))
        .forEach(function (m) {
          const opt = document.createElement("option");
          opt.value = m;
          if (suggested.indexOf(m) !== -1) { opt.label = "Suggested"; }
          modelList.appendChild(opt);
        });
    }

    function knownModel(v) {
      return [].some.call(modelList.options, function (o) { return o.value === v; });
    }

    function load() {
      if (!settingsAvailable()) {
        setDisabled(true);
        budgetVal.textContent = "  not available";
        scaleNote.textContent = "";
        setNote("This is the offline copy: there is nowhere safe to keep a key here, " +
          "so the field stays disabled. " + START_HINT + " The key is entered and kept " +
          "in the page that opens, never in this one.", true);
        openServer.hidden = false;
        return;
      }
      openServer.hidden = true;
      setDisabled(false);
      fetch("/api/settings", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (s) { paint(s); setNote(""); })
        .catch(function () { setNote("Could not read settings from the server.", true); });
    }

    function post(payload) {
      return fetch("/api/settings", {
        method: "POST",
        headers: writeTokenHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) { throw new Error(j && j.error ? j.error : "HTTP " + r.status); }
          return j;
        });
      });
    }

    providerSel.addEventListener("change", function () {
      post({ preset: providerSel.value })
        .then(function (s) {
          paint(s);
          setNote(s.keyCleared
            ? "Provider set. The saved key belonged to the previous provider, so it was removed: paste this provider's key and press Save key."
            : "Provider set. Press Test key — a key only works with the provider that issued it.", !!s.keyCleared);
        })
        .catch(function (e) { setNote(e.message, true); });
    });

    /* An input filled with the current model would filter the suggestion list
       down to just that model, so it is emptied on focus (the current model
       stays visible as the placeholder) and put back if nothing was typed. */
    modelInput.addEventListener("focus", function () {
      if (lastSettings && modelInput.value === lastSettings.cheapModel) {
        modelInput.placeholder = lastSettings.cheapModel;
        modelInput.value = "";
      }
    });
    modelInput.addEventListener("blur", function () {
      if (!modelInput.value.trim() && lastSettings) { modelInput.value = lastSettings.cheapModel || ""; }
      modelInput.placeholder = "type to search, e.g. sonnet";
    });
    modelInput.addEventListener("input", function () {
      const v = modelInput.value.trim();
      if (!lastSettings) { return; }
      modelState.textContent = v && v !== lastSettings.cheapModel
        ? "not saved yet: pick a suggestion or press Enter"
        : (lastSettings.cheapModel ? "\u2713 saved: " + lastSettings.cheapModel : "not set");
    });

    function saveTypedModel() {
      const v = modelInput.value.trim();
      if (!v) { setNote("Type a model name first, e.g. anthropic/claude-sonnet-5.5.", true); return; }
      saveModel.disabled = true;
      post({ model: v })
        .then(function (s) {
          paint(s);
          setNote("\u2713 Saved. The model is now " + s.cheapModel + "." +
            (providerModels.length && providerModels.indexOf(s.cheapModel) === -1
              ? " Your provider did not list that name, so ask a question to check it works."
              : " Ask a question to try it."));
        })
        .catch(function (e) { setNote(e.message, true); })
        .then(function () { saveModel.disabled = false; });
    }

    modelInput.addEventListener("change", function () {
      const v = modelInput.value.trim();
      if (v && knownModel(v) && (!lastSettings || v !== lastSettings.cheapModel)) { saveTypedModel(); }
    });
    modelInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); saveTypedModel(); }
    });
    saveModel.addEventListener("click", saveTypedModel);

    function saveSetting(payload, done) {
      post(payload)
        .then(function (s) { paint(s); setNote("\u2713 Saved. " + done(s)); })
        .catch(function (e) { setNote(e.message, true); });
    }
    function saveRenderModel() {
      saveSetting({ renderModel: renderInput.value.trim() }, function (s) {
        return s.renderModel ? "3D views now use " + s.renderModel + "." : "3D views now use the answer model.";
      });
    }
    renderInput.addEventListener("change", function () {
      const v = renderInput.value.trim();
      if (lastSettings && v !== (lastSettings.renderModel || "") && (!v || knownModel(v))) { saveRenderModel(); }
    });
    renderInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); saveRenderModel(); }
    });
    effortSel.addEventListener("change", function () {
      saveSetting({ renderEffort: effortSel.value }, function (s) { return "Thinking effort for 3D views is now " + s.renderEffort + "."; });
    });
    blenderInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") { return; }
      e.preventDefault();
      saveSetting({ blenderPath: blenderInput.value.trim() }, function (s) {
        blenderInput.value = "";
        return s.blenderPath ? "Blender found at " + s.blenderPath + "." : "Blender path cleared.";
      });
    });

    saveKey.addEventListener("click", function () {
      const v = keyInput.value.trim();
      if (!v) { setNote("Paste a key first, or use Clear to remove the saved one.", true); return; }
      saveKey.disabled = true;
      post({ apiKey: v })
        .then(function (s) {
          keyInput.value = "";
          paint(s);
          if (s.keyConfigured && !ENDPOINT) { ENDPOINT = "/api/ask"; setMode(); }
          setNote("Key saved on this machine only. Press Test key to prove it works.");
        })
        .catch(function (e) { setNote(e.message, true); })
        .then(function () { saveKey.disabled = false; });
    });

    clearKey.addEventListener("click", function () {
      post({ apiKey: "" })
        .then(function (s) {
          paint(s);
          if (!s.keyConfigured && !s.local && ENDPOINT === "/api/ask") { ENDPOINT = ""; setMode(); }
          setNote("Key cleared. The assistant falls back to the offline engine.");
        })
        .catch(function (e) { setNote(e.message, true); });
    });

    testKey.addEventListener("click", function () {
      if (!settingsAvailable()) { return; }
      testKey.disabled = true;
      setNote("Testing the key\u2026");
      fetch("/api/settings/verify", { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (j) { setNote(j.detail || "", !j.verified); })
        .catch(function () { setNote("Could not reach the server to test the key.", true); })
        .then(function () { testKey.disabled = false; });
    });

    budget.addEventListener("input", function () {
      budgetVal.textContent = "  $" + Number(budget.value).toFixed(2) + " / day";
    });
    budget.addEventListener("change", function () {
      post({ dailyUsdMax: Number(budget.value) })
        .then(function (s) { paint(s); setNote("Daily budget saved on the server."); })
        .catch(function (e) { setNote(e.message, true); });
    });

    return { node: node, refresh: load };
  }

  /* ======================================================================
     ASKING — local by default, model-assisted only if an endpoint is set
     ====================================================================== */
  /* Non-streaming endpoint (the Cloudflare Worker): plain JSON answer. */
  function readJsonAnswer(data) {
    const answer = String(data && data.answer ? data.answer : "").trim();
    if (!answer) { throw new Error("empty answer"); }
    return {
      role: "bot", title: "Answer", body: [answer], md: true,
      src: data.sources && data.sources.length ? data.sources.join(" \u00b7 ") : "Retrieved from this guide",
      see: (data.see || []).map(function (s) {
        return { label: s.label, tab: s.tab, step: s.step || null };
      }),
      chips: (data.chips || []).slice(0, 3)
    };
  }

  /* Streaming endpoint (server/assistant-server.js): SSE, token by token. */
  function pumpStream(res, sink) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const step = function () {
      return reader.read().then(function (chunk) {
        if (chunk.done) { return; }
        buf += decoder.decode(chunk.value, { stream: true });
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || "";
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i].trim();
          if (!line.startsWith("data:")) { continue; }
          let evt;
          try { evt = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
          if (evt.type === "delta" && evt.text) { sink.delta(evt.text); }
          else if (evt.type === "replace") { sink.replace(evt.text); }
          else if (evt.type === "meta") { sink.meta(evt); }
          else if (evt.type === "error") { throw new Error(evt.error || "model error"); }
          else if (evt.type === "done") { return; }
        }
        return step();
      });
    };
    return step();
  }

  function askModel(question, sink, signal, opts) {
    opts = opts || {};
    let passages = buildContext(question);
    /* job 8: the step he is on goes first, so the answer is about HIS build, not the FAQ */
    const sc = stepContext();
    if (sc.passage && !passages.some(function (p) { return p.step === sc.step && /^Your step/.test(p.label || ""); })) {
      passages.unshift(sc.passage);
    }
    /* Nothing retrieved ("can you help me?", a general how-to): send the guide's
       overview so the model can say what it covers or label a general answer. */
    if (!passages.length) {
      passages = PASSAGES.filter(function (p) { return p.tab === "why"; }).slice(0, 2)
        .map(function (p) { return { label: p.label || TABS[p.tab] || p.tab, tab: p.tab, step: p.step || null, text: p.text }; });
    }
    if (!passages.length) { return Promise.reject(new Error("no passages")); }
    return fetch(ENDPOINT, {
      method: "POST",
      headers: writeTokenHeaders({ "content-type": "application/json" }),
      signal: signal,
      body: JSON.stringify({
        question: question,
        passages: passages.slice(0, 6),
        history: ctx.history.slice(-6),
        context: sc.context,
        detail: opts.detail === true,
        /* Routing hints for the server: a confident curated answer is the
           cheapest and most reliable case, and the retrieval score says whether
           the evidence is strong enough for a small model. */
        curated: !!((matchEntry(norm(question)) || {}).confident),
        topScore: (function () {
          const top = searchPassages(question, 1);
          return top.length ? Number(top[0].score.toFixed(3)) : 0;
        })()
      })
    }).then(function (res) {
      const type = res.headers.get("content-type") || "";
      if (!res.ok) {
        return res.text().then(function (body) {
          /* job 8: the server's own plain sentence (the monthly cap, an unpaired phone) is shown as it is */
          let said = "";
          try { said = String((JSON.parse(body) || {}).error || ""); } catch (e) { /* not JSON */ }
          if (res.status === 401) { PAIR_NEEDED = true; setMode(); showPairCard(true); }
          const err = new Error("HTTP " + res.status + ": " + body.slice(0, 120));
          if (res.status === 402 && said) { err.plain = said; }
          throw err;
        });
      }
      if (type.indexOf("text/event-stream") !== -1 && res.body && res.body.getReader) {
        return pumpStream(res, sink);
      }
      return res.json().then(function (data) {
        const msg = readJsonAnswer(data);
        sink.replace(msg.body.join("\n\n"));
        sink.meta(msg);
        return msg;
      });
    });
  }

  /* ---------- model answer with a live, streaming card --------------------- */
  function modelAnswer(question, opts) {
    opts = opts || {};
    const card = streamingCard();
    card.card.classList.add("ga-live");
    const state = { text: "", meta: null };
    const controller = typeof AbortController === "function" ? new AbortController() : null;

    const paint = function () {
      renderMarkdown(card.body, state.text);
      if (!UI.panel.hidden) { UI.log.scrollTop = UI.log.scrollHeight; }
    };
    const sink = {
      delta: function (piece) { state.text += piece; paint(); },
      replace: function (full) { state.text = full; paint(); },
      meta: function (evt) { state.meta = evt; }
    };

    if (controller) {
      card.stop.addEventListener("click", function () {
        card.stop.textContent = "Stopping\u2026";
        controller.abort();
      });
    } else {
      card.stop.style.display = "none";
    }

    return askModel(question, sink, controller ? controller.signal : undefined, { detail: opts.detail === true })
      .then(function () {
        const text = String(state.text || "").trim();
        if (!text) { throw new Error("empty answer"); }
        const meta = state.meta || {};
        const msg = {
          role: "bot", title: "Answer", body: [text], md: true,
          src: meta.sources && meta.sources.length
            ? meta.sources.join(" \u00b7 ") : "Retrieved from this guide",
          see: Array.isArray(meta.see) ? meta.see : [],
          chips: Array.isArray(meta.chips) ? meta.chips : []
        };
        finishStream(card, msg);
        answerExtras(card, question, meta, opts);
        ctx.history.push({ role: "assistant", content: text });
        MESSAGES.push(msg);
        persist();
        return msg;
      })
      .catch(function (err) {
        if (card.wrap.parentNode) { card.wrap.parentNode.removeChild(card.wrap); }
        const aborted = err && err.name === "AbortError";
        /* Only a confident curated match is a fair stand-in; a loose keyword hit
           answered a budget question with the motor-direction card. */
        const local = curatedAnswer(question) || {
          role: "bot", title: "The AI did not answer",
          body: ["Nothing was answered for that question. Ask again, or split a long question into shorter ones."],
          steps: [], note: "", src: ""
        };
        local.note = (local.note ? local.note + " " : "") + (aborted
          ? "(Stopped, so this answer came from the offline guide instead.)"
          : err && err.plain
            ? "(" + err.plain + ")"
            : "(The AI service did not answer: " + plainError(err) + ". So this came from the offline guide instead.)");
        ctx.history.push({ role: "assistant", content: historyText(local) });
        return push(local);
      });
  }

  /* With a model connected, every message goes to it, greetings included: a
     canned intro card for "hello" reads as a script, and keyword matching sent
     real questions to the wrong curated card. The model still receives the
     curated entry as its first passage and the `curated` hint for cheap-tier
     routing.
     Without a model, curatedAnswer/answerLocal remain the whole engine.
     opts.forceModel exists for the test hook and for askAI(), which spend on
     purpose. */
  /* C1 (chat audit): never show raw JSON or a stack message to a beginner. Map the provider's failure to one
     plain sentence; the raw text goes to the browser console for debugging. */
  function plainError(err) {
    const raw = String((err && err.message) || err || "");
    if (typeof console !== "undefined" && raw) { console.warn("AI error:", raw.slice(0, 300)); }
    if (/\b40[13]\b|incorrect api key|invalid[^a-z]{0,3}(api[^a-z]?)?key|unauthori[sz]ed|forbidden/i.test(raw)) {
      return "your key was rejected. Open ⚙ Settings, paste the key again and press Save key";
    }
    if (/\b429\b|rate limit|quota|insufficient/i.test(raw)) {
      return "the AI service is busy or the account has reached its limit. Wait a minute and ask again";
    }
    if (/fetch failed|failed to fetch|networkerror|econnrefused|enotfound|etimedout|timed? ?out|network/i.test(raw)) {
      return "it could not be reached. Check the internet connection, and that the local server is running";
    }
    if (/\b5\d\d\b/.test(raw)) { return "the AI service had a problem on its side. Try again in a few minutes"; }
    return "it returned an error";
  }

  /* ======================================================================
     ACTING — the chat asking for a change, not just answering
     ====================================================================== */

  /* "add 3 harder detect questions" is a request to DO something, not a question.
     The server has the real parser; this only decides which door to knock on. */
  /* The write token (decision 14's gate 3, client side): kept in this browser
     only, sent with every write request, never echoed back by the server. */
  function writeTokenHeaders(extra) {
    const h = Object.assign({}, extra || {});
    try {
      const t = window.localStorage ? (localStorage.getItem("ga-write-token") || "") : "";
      if (t) { h["x-write-token"] = t; }
      /* job 8: a paired phone proves itself with its device token on every request to the laptop */
      const d = window.localStorage ? (localStorage.getItem(DEVICE_KEY) || "") : "";
      if (d) { h["x-device-token"] = d; }
    } catch (e) { /* storage unavailable */ }
    return h;
  }

  function acceptSuggestion(msg, accept, reject, status) {
    const s = msg.suggestion;
    if (!s || s.status !== "ready") { return Promise.resolve(); }
    s.status = "accepting";
    s.error = "";
    accept.disabled = true;
    reject.disabled = true;
    status.textContent = "Creating a proposal through the normal review loop…";
    return fetch("/api/propose", {
      method: "POST",
      headers: writeTokenHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ op: s.op })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { throw new Error((j && j.error) || ("HTTP " + r.status)); }
        if (!j.ok || !j.proposal || !j.proposal.slug) {
          throw new Error((j && j.error) || "the proposal was not created");
        }
        return j;
      });
    }).then(function (j) {
      s.status = "accepted";
      s.proposal = j.proposal.slug;
      status.textContent = suggestionStatusText(s);
      persist();
    }).catch(function (e) {
      s.status = "ready";
      s.error = "Could not create a proposal: " + String(e.message || e);
      accept.disabled = false;
      reject.disabled = false;
      status.textContent = suggestionStatusText(s);
      persist();
    });
  }

  function looksLikeEdit(text) {
    const t = String(text || "").toLowerCase();
    if (/^\s*(correction|correct|remember|wrong)\s*[:\-]/.test(t)) { return true; }
    if (!/^\s*(add|create|write|draft|make|give me)\b/.test(t)) { return false; }
    return /\b(questions?|quizzes|quiz|exam)\b/.test(t);
  }

  function proposeChange(sentence) {
    return fetch("/api/propose", {
      method: "POST",
      headers: writeTokenHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ sentence: sentence })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { throw new Error((j && j.error) || ("HTTP " + r.status)); }
        return j;
      });
    }).then(function (j) {
      if (!j.ok) {
        /* The server refused, and it says why. Do not dress that up as success. */
        const why = (j.rejected && j.rejected.length)
          ? j.rejected.map(function (r) { return "\u201c" + r.question.slice(0, 55) + "\u201d \u2014 " + r.reasons[0]; })
          : [];
        return push({
          role: "bot",
          title: "Nothing was drafted",
          body: [j.error || "the drafter produced nothing usable"],
          steps: why,
          src: "",
          chips: ["Open the gear and add a key", "Try a different request"]
        });
      }
      const refused = (j.rejected || []).length;
      return push({
        role: "bot",
        title: "Proposal ready: " + j.proposal.slug,
        body: [
          "I drafted " + j.drafted + " question" + (j.drafted === 1 ? "" : "s") + " for the " +
            j.job.target + " quiz" + (refused ? " and refused " + refused + " of my own drafts." : "."),
          "Your real guide has not changed. The work is on a branch, waiting for you to accept or reject it."
        ],
        steps: (j.rejected || []).map(function (r) {
          return "refused \u201c" + r.question.slice(0, 55) + "\u201d \u2014 " + r.reasons[0];
        }),
        src: "every kept question must be provable from a cited passage",
        chips: ["Review it: node server/ops/accept.js " + j.proposal.slug]
      });
    }).catch(function (e) {
      return push({
        role: "bot",
        title: "Could not propose that",
        body: [String(e.message || e)],
        steps: [],
        src: ""
      });
    });
  }

  function currentSection() {
    const panels = document.querySelectorAll("[role='tabpanel'][id^='p-']");
    for (let i = 0; i < panels.length; i += 1) {
      if (!panels[i].hidden) { return panels[i].id; }
    }
    return "p-" + buildPosition().tab;
  }

  function suggestEdit(text) {
    const t = String(text == null ? "" : text).trim();
    if (!t || UI.busy) { return Promise.resolve(null); }
    if (UI.panel.hidden) { setOpen(true); }
    push({ role: "user", text: t });
    ctx.history.push({ role: "user", content: t });
    UI.busy = true;

    if (!settingsAvailable()) {
      UI.busy = false;
      return Promise.resolve(push({
        role: "bot",
        title: "Local server required",
        body: ["Suggestions need the local guide server. Offline question answering and the guide are still available; no suggestion request was sent."],
        steps: [], src: ""
      }));
    }

    return fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sentence: t, section: currentSection() })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { throw new Error((j && j.error) || ("HTTP " + r.status)); }
        return j;
      });
    }).then(function (j) {
      UI.busy = false;
      if (!j.ok) {
        return push({
          role: "bot", title: "Suggestion refused",
          body: [j.error || "The candidate did not pass the suggestion checks."],
          steps: [], src: ""
        });
      }
      return push({
        role: "bot",
        title: "Suggested edit — review the evidence",
        body: ["This is only a candidate. Accepting it creates a proposal branch; it does not change or publish the real guide."],
        suggestion: { op: j.op, report: j.report, status: "ready", proposal: "", error: "" },
        steps: [],
        src: "every judgement claim cites exact corpus text"
      });
    }).catch(function (e) {
      UI.busy = false;
      return push({
        role: "bot", title: "Could not suggest an edit",
        body: [String(e.message || e)], steps: [], src: ""
      });
    });
  }

  /* ---------- 3D views ------------------------------------------------------
     The server asks the AI for a scene plan and has Blender build it from the
     guide's own part models; the page only shows the finished file. */
  function lastAnswerText() {
    for (let i = MESSAGES.length - 1; i >= 0; i--) {
      const m = MESSAGES[i];
      if (m.role === "bot" && m.md) { return [m.title].concat(m.body || [], m.steps || []).join("\n"); }
    }
    return "";
  }

  function make3d(request, context) {
    const t = String(request == null ? "" : request).trim();
    if (!t || UI.busy) { return Promise.resolve(null); }
    if (UI.panel.hidden) { setOpen(true); }
    push({ role: "user", text: "3D view: " + t });
    UI.busy = true;
    if (!settingsAvailable()) {
      UI.busy = false;
      return Promise.resolve(push({
        role: "bot", title: "Local server required",
        body: ["3D views are built on this computer by the guide server. " + START_HINT],
        steps: [], src: ""
      }));
    }
    const wait = streamingCard();
    wait.title.textContent = "Making a 3D view\u2026";
    wait.body.appendChild(el("p", "ga-body", "The AI is planning the scene, then Blender builds it from the guide's part models. This takes about 20 to 60 seconds."));
    wait.stop.parentNode.removeChild(wait.stop);
    wait.card.classList.add("ga-live");
    function done() {
      UI.busy = false;
      if (wait.wrap.parentNode) { wait.wrap.parentNode.removeChild(wait.wrap); }
    }
    return fetch("/api/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request: t, context: context == null ? lastAnswerText() : context })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { throw new Error((j && j.error) || ("HTTP " + r.status)); }
        return j;
      });
    }).then(function (j) {
      done();
      return push({
        role: "bot", title: j.title || "3D view", body: [], steps: [],
        view3d: { url: j.url, title: j.title || "3D view", explain: j.explain || "", fresh: true },
        src: "a 3D view built from the guide's own part models"
      });
    }).catch(function (e) {
      done();
      return push({ role: "bot", title: "Could not make a 3D view", body: [String(e.message || e)], steps: [], src: "" });
    });
  }

  function mountView3d(root) {
    if (window.BuildGuideViewer) { window.BuildGuideViewer.mount(root); return; }
    root.querySelector(".viewer3d-status").textContent = "The 3D viewer did not load on this page.";
  }

  function renderView3d(card, v) {
    if (v.explain) { card.appendChild(el("p", "ga-body", v.explain)); }
    const root = el("div", "viewer3d ga-viewer");
    root.setAttribute("data-model", v.url);
    root.setAttribute("data-title", v.title);
    const canvas = el("div", "viewer3d-canvas");
    canvas.appendChild(el("div", "viewer3d-labels"));
    canvas.appendChild(el("span", "viewer3d-status", "Loading 3D\u2026"));
    root.appendChild(canvas);
    root.appendChild(el("p", "viewer3d-nogl", "This view needs WebGL, which this browser has turned off."));
    const bar = el("div", "viewer3d-bar");
    bar.appendChild(el("span", "viewer3d-hint", "Drag to rotate \u00b7 scroll to zoom"));
    [["reset", "Reset view"], ["labels", "Labels"], ["fullscreen", "Full screen"]].forEach(function (b) {
      const btn = el("button", null, b[1]);
      btn.type = "button";
      btn.setAttribute("data-action", b[0]);
      if (b[0] === "labels") { btn.setAttribute("aria-pressed", "true"); }
      bar.appendChild(btn);
    });
    root.appendChild(bar);
    card.appendChild(root);
    /* A browser only allows a handful of live 3D views, so views restored from
       history wait for a click instead of all starting at once. */
    if (v.fresh) {
      delete v.fresh;
      setTimeout(function () { mountView3d(root); }, 0);
    } else {
      const status = canvas.querySelector(".viewer3d-status");
      status.textContent = "";
      const open = el("button", "ga-link", "Open 3D view");
      open.type = "button";
      open.addEventListener("click", function () { status.textContent = "Loading 3D\u2026"; mountView3d(root); });
      status.appendChild(open);
    }
  }

  function show3dButton(msg) {
    const b = el("button", "ga-link ga-3d-btn", "Show this in 3D");
    b.type = "button";
    b.title = "Make a 3D view of what this answer describes (about 20 to 60 seconds)";
    b.addEventListener("click", function () {
      make3d("Show what this answer describes, so I can see where each part goes.",
        [msg.title].concat(msg.body || [], msg.steps || []).join("\n"));
    });
    return b;
  }

  function curatedAnswer(text) {
    const q = norm(text);
    if (!q) { return null; }
    if (anyStarts(q, GREETING) || anyStarts(q, THANKS)) { return answerLocal(text); }
    const hit = matchEntry(q);
    return hit && hit.confident ? answerLocal(text) : null;
  }
  function ask(text, opts) {
    const t = String(text == null ? "" : text).trim();
    if (!t || UI.busy) { return Promise.resolve(null); }
    if (UI.panel.hidden) { setOpen(true); }
    push({ role: "user", text: t });
    ctx.history.push({ role: "user", content: t });
    UI.busy = true;

    if (!ENDPOINT) {
      const local = answerLocal(t);
      ctx.history.push({ role: "assistant", content: historyText(local) });
      UI.busy = false;
      return Promise.resolve(push(local));
    }

    if (!(opts && opts.forceModel)) {
      if (settingsAvailable() && looksLikeEdit(t)) {
        return proposeChange(t).then(function (msg) { UI.busy = false; return msg; });
      }
    }

    return modelAnswer(t, { detail: !!(opts && opts.detail) }).then(function (msg) {
      UI.busy = false;
      return msg;
    }, function () {
      const local = answerLocal(t);
      ctx.history.push({ role: "assistant", content: historyText(local) });
      UI.busy = false;
      return push(local);
    });
  }


  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.messages)) { return false; }
    ctx.lastId = typeof data.lastId === "string" ? data.lastId : "";
    if (Array.isArray(data.history)) {
      ctx.history = data.history
        .filter(function (m) { return m && (m.role === "user" || m.role === "assistant"); })
        .slice(-12);
    }
    data.messages.slice(-MAX_TURNS).forEach(function (m) {
      if (!m || (m.role !== "user" && m.role !== "bot")) { return; }
      MESSAGES.push(m);
      UI.log.appendChild(renderMessage(m));
    });
    restoreBuild(data.build);
    UI.log.scrollTop = UI.log.scrollHeight;
    return MESSAGES.length > 0;
  }

  /* ======================================================================
     SELF-TEST — same spirit as the guide's own browser checks
     ====================================================================== */
  function selfTest() {
    const out = [];
    const add = function (name, ok, info) {
      out.push({ name: name, ok: !!ok, info: String(info == null ? "" : info) });
    };

    /* 1. knowledge base integrity */
    const ids = {}, titles = {};
    let dup = "", thin = "", badSee = "";
    KB.forEach(function (e) {
      if (ids[e.id]) { dup = e.id; }
      ids[e.id] = 1;
      if (titles[e.title]) { dup = dup || "title:" + e.title; }
      titles[e.title] = 1;
      if (e.steps.length < 2 || e.tags.length < 3) { thin = thin || e.id; }
      (e.see || []).forEach(function (s) {
        if (!TABS[s[1]]) { badSee = badSee || e.id + "->" + s[1]; }
        if (s[2] != null && (s[2] < 1 || s[2] > 8)) { badSee = badSee || e.id + "->step" + s[2]; }
      });
      if (e.next && !KB.some(function (x) { return x.id === e.next; })) { badSee = badSee || e.id + "->next:" + e.next; }
    });
    add("kb ids are unique (" + KB.length + " entries)", !dup, dup || "no duplicates");
    add("kb entries have tags, steps and valid links", !thin && !badSee, thin || badSee || "all valid");

    /* 2. retrieval index covers the real page */
    const stepPassages = PASSAGES.filter(function (p) { return p.tab === "steps" && p.step; });
    add("page passages indexed", PASSAGES.length >= 10, PASSAGES.length + " passages");
    const stepNums = stepPassages.map(function (p) { return p.step; }).filter(function (n, i, a) { return a.indexOf(n) === i; });
    add("all 8 assembly steps indexed", stepNums.length === 8 && stepPassages.length >= 8,
      stepNums.length + "/8 steps, " + stepPassages.length + " passages");

    /* 3. answering behaviour */
    const cases = [
      ["thermal image is noisy at 8 hz", "thermal-noise"],
      ["the mlx90640 is jumpy and speckled", "thermal-noise"],
      ["receiver wont bind", "rx-wont-bind"],
      ["sticks do nothing in betaflight", "no-channels"],
      ["no picture on the monitor", "no-video"],
      ["my pi keeps rebooting", "pi-power"],
      ["i2cdetect shows nothing at 0x33", "i2c-detect"],
      ["gps never gets a fix", "gps-no-fix"],
      ["how much does it cost", "budget"],
      ["do i need a licence", "certification"],
      ["the lipo is puffy", "lipo-swollen"],
      ["props on or off", "props-on"],
      ["can it fly itself", "autonomy"],
      ["hotspots are finding everything", "hotspot-threshold"],
      ["what should i do next", "what-next"],
      ["i put 5v on the sensors", "sensor-5v"],
      ["can i fly near a wildfire", "wildfire-law"],
      ["how close can i fly to people", "people-30m"],
      ["smoke came out on first power", "first-power-smoke"]
    ];
    let pass = 0;
    const fails = [];
    cases.forEach(function (c) {
      ctx.lastId = "";
      const msg = answerLocal(c[0]);
      const want = entryById(c[1]);
      if (want && msg.title === want.title) { pass += 1; } else { fails.push(c[0] + " -> " + msg.title); }
    });
    add("routed questions hit the right entry (" + pass + "/" + cases.length + ")",
      pass === cases.length, fails.join(" | ") || "all routed");

    /* 4. honesty: an unrelated question must not produce a fabricated answer */
    ctx.lastId = "";
    const odd = answerLocal("what is the airspeed velocity of an unladen swallow");
    add("unrelated question is refused, not invented",
      /outside this guide|Closest thing/i.test(odd.title), odd.title);

    /* 5. follow-ups work inside a conversation */
    ctx.lastId = "";
    answerLocal("receiver wont bind");
    const why = answerLocal("why");
    add("follow-up 'why' explains the previous answer",
      /Why that is the answer/.test(why.title), why.title);
    const more = answerLocal("what else");
    add("follow-up 'what else' advances the checklist",
      !!more.title && more.title !== why.title, more.title);

    /* 6. navigation actually opens the page */
    const jumped = jump("steps", 3);
    const step3 = document.querySelector(".asm-step[data-step='3']");
    add("deep link opens assembly step 3",
      !!(jumped && step3 && !document.getElementById("p-steps").hidden),
      jumped ? "visible" : "jump failed");
    jump("why", null);

    /* 7. storage must not collide with the guide's own key */
    add("chat storage key is separate from the guide's",
      STORE !== "shad-drone-guide-v1", STORE);

    /* 8. the panel is present and closed by default */
    add("panel mounted and closed by default",
      !!document.getElementById("ga-panel") && document.getElementById("ga-panel").hidden, "ok");

    /* 9. Layer 0 of the cost plan: a confident curated entry must be answered
       locally, so the panel never pays a model to reword a paragraph it already
       has. The second case is the guard against that being too eager. */
    const freeHit = curatedAnswer("what does this cost");
    add("a confident curated question is answered for free",
      !!freeHit && freeHit.role === "bot" && (freeHit.steps || []).length > 0,
      freeHit ? freeHit.title : "no local answer");
    add("an unanswerable question is not answered for free",
      curatedAnswer("what is the airspeed of an unladen swallow") === null, "not answered locally");

    /* 10. the domain pack must be indexed AND retrievable. Loading the file
       without it reaching BM25 would look fine in every other check. */
    const domainHits = searchPassages("thermal contrast sensitivity", 5);
    add("domain pack is indexed and searchable",
      PASSAGES.some(function (p) { return /^Domain/.test(p.label || ""); }) &&
      domainHits.some(function (h) { return /^Domain/.test(h.p.label || ""); }),
      PASSAGES.length + " passages, " + domainHits.length + " hits");

    /* 11. the settings drawer exists, starts closed, and never offers a key
       field when there is no local server to keep one. */
    const gearBtn = document.getElementById("ga-settings-btn");
    const drawer = document.getElementById("ga-settings");
    add("settings drawer present and closed by default",
      !!gearBtn && !!drawer && drawer.hidden === true, "ok");

    /* Opening the drawer with no local server must disable the key field rather
       than offer a box whose value has nowhere safe to go. */
    let keyDisabled = null;
    if (UI.showSettings) {
      UI.showSettings(true);
      const keyEl = document.getElementById("ga-key");
      keyDisabled = !!keyEl && keyEl.disabled;
      UI.showSettings(false);
    }
    add("no local server means the key field is disabled",
      ENDPOINT === "/api/ask" ? keyDisabled === false : keyDisabled === true,
      "endpoint=" + (ENDPOINT || "none") + " disabled=" + keyDisabled);

    /* A disabled field is a dead end. When there is no local server, the drawer
       must offer the way to the working copy; when served, it must not nag. */
    let openBtnShown = null;
    if (UI.showSettings) {
      UI.showSettings(true);
      const openBtn = document.getElementById("ga-open-server");
      openBtnShown = openBtn ? !openBtn.hidden : null;
      UI.showSettings(false);
    }
    add("the offline drawer routes to the working copy",
      ENDPOINT === "/api/ask" ? openBtnShown === false : openBtnShown === true,
      "endpoint=" + (ENDPOINT || "none") + " shown=" + openBtnShown);

    /* The write token field (decision 14's gate 3, client side). */
    if (UI.showSettings) { UI.showSettings(true); }
    add("the drawer offers a write token field",
      !!document.getElementById("ga-write-token") &&
      !!document.getElementById("ga-write-token-save"), "ok");
    if (UI.showSettings) { UI.showSettings(false); }

    /* Conversation memory: the history surface exists, and every browser holds
       a stable thread id its conversations sync under. */
    add("the history button and panel exist",
      !!document.getElementById("ga-history-btn") &&
      !!document.getElementById("ga-history") &&
      !!document.getElementById("ga-history-new"), "ok");
    add("each browser keeps a stable thread id",
      /^t-/.test(threadId()) && threadId() === threadId(), threadId().slice(0, 14));

    /* When there is no AI, the panel has to SAY so in words. Behaving differently
       in silence is what made the offline copy look broken. */
    const offNote = document.getElementById("ga-offline-note");
    add("the panel explains how to get AI when there is none",
      !!offNote && (ENDPOINT ? offNote.hidden === true
        : (offNote.hidden === false && /assistant-server/.test(offNote.textContent))),
      ENDPOINT ? "AI is on, note hidden" : (offNote ? offNote.textContent.slice(0, 45) : "missing"));

    /* Corrections memory (decisions 4, 11, 12): a correction is labelled at
       every surface, and offline answers carry the note. */
    add("correction passages are labelled as corrections",
      domainLabel({ heading: "Correction \u2014 battery note", correction: true }) ===
        "Correction on file \u00b7 battery note" &&
      domainLabel({ heading: "Airframes" }) === "Domain \u00b7 Airframes",
      domainLabel({ heading: "Correction \u2014 battery note", correction: true }));

    addPassage("", null, "Correction on file \u00b7 note test", null,
      "Note test correction text for the self-test. Source: self-test (verified 2026-11-01).");
    const noted = answerLocal("what does the correction note look like");
    add("offline answers carry the correction note",
      (noted.body || []).length === 2 && /Correction on file/.test((noted.body || []).join(" ")),
      (noted.body || []).length + " body lines");

    return out;
  }

  function formatResults(results) {
    const failed = results.filter(function (r) { return !r.ok; });
    return "Guide Assistant self-test: " + (results.length - failed.length) + "/" +
      results.length + " passed\n" + results.map(function (r) {
        return (r.ok ? "PASS " : "FAIL ") + r.name + (r.ok ? "" : "  [" + r.info + "]");
      }).join("\n");
  }

  function writeSelfTest() {
    const results = selfTest();
    const pre = document.createElement("pre");
    pre.id = "ga-selftest";
    pre.textContent = formatResults(results);
    document.body.appendChild(pre);

    /* a real round-trip through the UI, not just the dispatcher */
    return ask("thermal image is noisy at 8 Hz").then(function () {
      const log = document.getElementById("ga-log");
      const cards = log.querySelectorAll(".ga-card").length;
      const steps = log.querySelectorAll(".ga-steps li").length;
      const sources = log.querySelectorAll(".ga-src").length;
      const ok = cards >= 2 && steps >= 3 && sources >= 1;
      results.push({
        name: "live UI round-trip renders an answer with steps and a source",
        ok: ok,
        info: ok ? "" : "cards=" + cards + " steps=" + steps + " sources=" + sources
      });
      pre.textContent = formatResults(results);
      return results;
    });
  }

  /* ======================================================================
     DRAWER PROBE — ?ga-drawer-test

     Types a key into the settings drawer, clicks Save, drags the slider, and
     writes the outcome to a <pre> so a command-line test can assert on it. This
     exists because the settings API was tested 23/23 while the *clicking* was
     never exercised at all — and an unproven UI path on shipped code is a
     liability, not a feature.
     ====================================================================== */
  function runDrawerProbe() {
    const lines = [];
    const add = function (name, ok, info) {
      lines.push((ok ? "PASS " : "FAIL ") + name + (info ? "  [" + info + "]" : ""));
      return ok;
    };
    const pageErrors = [];
    window.addEventListener("error", function (e) { pageErrors.push(String(e.message || e)); });

    function finish() {
      add("no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | ").slice(0, 200));
      const pre = document.createElement("pre");
      pre.id = "ga-drawer-test";
      pre.textContent = lines.join("\n");
      document.body.appendChild(pre);
      /* Also post the result to the test server. Polling that is far more
         reliable than --dump-dom against an async probe, because virtual time
         and pending fetches interact badly. */
      try {
        fetch("/api/probe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ drawer: lines })
        }).catch(function () { /* test server not enabled: harmless */ });
      } catch (e) { /* ignore */ }
      return lines;
    }

    const waitFor = function (test, ms) {
      const until = Date.now() + (ms || 5000);
      return new Promise(function (resolve) {
        const tick = function () {
          let ok = false;
          try { ok = !!test(); } catch (e) { ok = false; }
          if (ok) { resolve(true); return; }
          if (Date.now() > until) { resolve(false); return; }
          setTimeout(tick, 80);
        };
        tick();
      });
    };

    /* Every tab must render real content, not an empty shell. This is also the
       smoke test a JS edit has to pass, so it lives here rather than in a
       second harness. */
    const tabs = document.querySelectorAll("main section[role='tabpanel']");
    let rendered = 0;
    Array.prototype.forEach.call(tabs, function (t) {
      if (String(t.textContent || "").trim().length > 200) { rendered += 1; }
    });
    /* 10 pages since the five-places layout: Home, Build, Buy, Fly safely + the six Learn pages */
    add("every tab panel renders content", tabs.length >= 10 && rendered === tabs.length,
      rendered + "/" + tabs.length);

    /* Fable Part 2, S1: the "Before you start" boxes in the step headers sat white on cream. Every one must have
       readable text: contrast of its computed text colour against its own background of at least 4.5:1 (WCAG AA). */
    const lum = function (css) {
      const v = (String(css).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(function (n) {
        const c = Number(n) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const notes = Array.prototype.slice.call(document.querySelectorAll(".asm-note-top"));
    const ratios = notes.map(function (n) {
      const cs = getComputedStyle(n), a = lum(cs.color), b = lum(cs.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    const lowest = ratios.length ? Math.min.apply(null, ratios) : 0;
    add("the step prerequisite boxes have readable text (contrast 4.5:1 or more)", notes.length >= 2 && lowest >= 4.5,
      notes.length + " boxes, lowest contrast " + lowest.toFixed(1) + ":1");

    if (!settingsAvailable()) {
      add("a local server is present", false, "endpoint=" + (ENDPOINT || "none"));
      finish();
      return Promise.resolve(lines);
    }
    add("a local server is present", true, ENDPOINT);

    UI.showSettings(true);
    const drawer = document.getElementById("ga-settings");
    add("the drawer opens", !!drawer && drawer.hidden === false);

    const input = document.getElementById("ga-key");
    const save = document.getElementById("ga-key-save");
    const budget = document.getElementById("ga-budget");
    const state = document.getElementById("ga-key-state");
    const budgetVal = document.getElementById("ga-budget-val");
    add("the drawer has a key field, a save button and a slider",
      !!input && !!save && !!budget, "ok");

    const KEY = "sk-drawer-probe-0000wxyz";
    input.value = KEY;
    save.click();

    return waitFor(function () { return /ending \u2026wxyz/.test(state.textContent); })
      .then(function (saved) {
        /* The server prefixes the hint with a real ellipsis character, so the
           pattern has to include it — the earlier version of this assertion
           looked for "ending wxyz" and could never match, which cost 5s of
           timeout and one misleading FAIL. */
        add("saving from the drawer reaches the server", saved, state.textContent);
        add("the key field is cleared after saving", input.value === "", "len=" + input.value.length);
        add("the key is not echoed anywhere in the panel",
          UI.panel.textContent.indexOf(KEY) === -1, "searched " + UI.panel.textContent.length + " chars");
        budget.value = "0.55";
        budget.dispatchEvent(new Event("change", { bubbles: true }));
        return waitFor(function () { return /0\.55/.test(budgetVal.textContent); });
      })
      .then(function () {
        add("the slider updates its label", /0\.55/.test(budgetVal.textContent), budgetVal.textContent);
        return fetch("/api/settings", { cache: "no-store" }).then(function (r) { return r.json(); });
      })
      .then(function (srv) {
        add("the slider value reached the server", Number(srv.dailyUsdMax) === 0.55, "$" + srv.dailyUsdMax);
        add("the server still will not return the key", JSON.stringify(srv).indexOf(KEY) === -1);
        UI.showSettings(false);
        return finish();
      });
  }

  /* ======================================================================
     QUIZ PROBE — ?ga-quiz-test

     Proves decision R12 in a real browser: a pass earned at 4/5 must survive the
     quiz growing to 6 questions. It also asserts the negative — a *fresh* 4/6
     must NOT pass — so the rule cannot be satisfied by making everything pass.
     ====================================================================== */
  function runQuizProbe() {
    const lines = [];
    const add = function (name, ok, info) {
      lines.push((ok ? "PASS " : "FAIL ") + name + (info ? "  [" + info + "]" : ""));
    };
    function finish() {
      const pre = document.createElement("pre");
      pre.id = "ga-quiz-test";
      pre.textContent = lines.join("\n");
      document.body.appendChild(pre);
      try {
        fetch("/api/probe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quiz: lines })
        }).catch(function () { /* test server not enabled: harmless */ });
      } catch (e) { /* ignore */ }
      return lines;
    }

    const Q = window.GuideQuiz;
    if (!Q) {
      add("the quiz hooks are exposed", false, "window.GuideQuiz is missing");
      return Promise.resolve(finish());
    }
    add("the quiz hooks are exposed", true);

    /* 1. an old bare-number save. The migration has to run while the bank is
          still the size it was played at, which is what the page does on load.
          Everything here is derived, because hardcoding "of 5" made this test go
          red the moment a real question was accepted. */
    const before = Q.length("detect");
    const needBefore = Math.ceil(before * 0.75);
    Q.clearBest("detect");
    Q.setBest("detect", needBefore); /* a bare number, exactly on the pass mark */
    const didMigrate = Q.migrate();
    add("a legacy bare score is migrated to {score, of, passed}",
      didMigrate === true && Q.best("detect").of === before, JSON.stringify(Q.best("detect")));
    add("and it still counts as a pass at " + needBefore + "/" + before,
      Q.best("detect").passed === true, JSON.stringify(Q.best("detect")));

    /* 2. grow the bank in memory */
    Q.grow("detect");
    const grown = Q.length("detect");
    add("the bank grew for the test", grown === before + 1, before + " -> " + grown);

    /* 3. the earned pass survives, and the counter still credits it */
    add("the earned pass survives the bank growing", Q.best("detect").passed === true,
      JSON.stringify(Q.best("detect")));
    add("the pass count still credits detect", Q.passCount() >= 1, "passes=" + Q.passCount());

    /* 4. the rule is not blanket-true: one mark short of the NEW bar must fail */
    const needGrown = Math.ceil(grown * 0.75);
    Q.setBest("detect", { score: needGrown - 1, of: grown, passed: false });
    add("a fresh score one short of the new bar is not a pass",
      Q.best("detect").passed === false, JSON.stringify(Q.best("detect")));

    /* 5. leave the page as we found it */
    Q.shrink("detect");
    Q.clearBest("detect");
    add("the in-memory bank is restored", Q.length("detect") === before, "len=" + Q.length("detect"));
    add("the saved state is clean again", Q.best("detect").score === 0,
      JSON.stringify(Q.best("detect")));

    return Promise.resolve(finish());
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  /* ======================================================================
     JOB 8 (2026-11-03): step awareness, memory, phone pairing, the month's spend.
     The memory and the synced ticks live on the laptop's server (server/.memory); this page only shows them.
     ====================================================================== */

  /* The step he is on: the assembly walker's current step, or else the first step not ticked. */
  function stepContext() {
    const out = { step: null, context: null, passage: null };
    try {
      const ticks = (typeof saved !== "undefined" && saved && saved.ticks) ? saved.ticks : {};
      const done = [];
      for (let n = 1; n <= 8; n += 1) { if (ticks["asm-" + n]) { done.push(n); } }
      /* the step the walker shows, unless that one is already ticked: then the first step not ticked */
      const dot = document.querySelector("[data-asm-dot][aria-current='step']");
      let step = dot ? Number(dot.getAttribute("data-asm-dot")) : NaN;
      if (!(step >= 1 && step <= 8) || done.indexOf(step) !== -1) {
        let first = 1;
        while (first < 8 && done.indexOf(first) !== -1) { first += 1; }
        if (!(step >= 1 && step <= 8) || done.indexOf(first) === -1) { step = first; }
      }
      const d = document.querySelector('[data-asm-dot="' + step + '"]');
      const title = d ? String(d.getAttribute("title") || "").replace(/^Step\s*\d+\s*:\s*/i, "").slice(0, 120) : "";
      const sec = document.querySelectorAll(".asm-step")[step - 1];
      const next = sec ? Array.prototype.slice.call(sec.querySelectorAll("ol li")).slice(0, 2)
        .map(function (li) { return clip(plain(li), 160); }).filter(Boolean) : [];
      out.step = step;
      out.context = { step: step, stepTitle: title, done: done, next: done.indexOf(step) === -1 ? next : [] };
      const text = sec ? clip(plain(sec), 1300) : "";
      if (text.length > 40) { out.passage = { label: "Your step " + step + (title ? ": " + title : ""), tab: "steps", step: step, text: text }; }
    } catch (e) { /* no walker on this page: no step context */ }
    return out;
  }

  function forgetFact(id) {
    return fetch("/api/memory/" + encodeURIComponent(id), { method: "DELETE", headers: writeTokenHeaders() })
      .then(function (r) { return r.ok; }, function () { return false; });
  }

  /* Under an AI answer: what it remembered (with Forget), "More detail", and the month's spend. */
  function answerExtras(card, question, meta, opts) {
    if (meta && meta.month) { if (HEALTH) { HEALTH.month = meta.month; } updateStatus(); }
    (meta && Array.isArray(meta.remembered) ? meta.remembered : []).forEach(function (f) {
      const row = el("p", "ga-remembered");
      row.appendChild(document.createTextNode("Remembered: " + f.text + " "));
      const b = el("button", "ga-link", "Forget");
      b.type = "button";
      b.addEventListener("click", function () { forgetFact(f.id).then(function (ok) { if (ok) { row.textContent = "Forgotten."; } }); });
      row.appendChild(b);
      card.foot.appendChild(row);
    });
    if (!(opts && opts.detail)) {
      const more = el("button", "ga-link ga-more", "More detail");
      more.type = "button";
      more.addEventListener("click", function () {
        if (UI.busy) { return; }
        more.disabled = true;
        ask("More detail: " + question, { detail: true, forceModel: true });
      });
      card.foot.appendChild(more);
    }
  }

  /* Where the questions go, in plain words (shown in Settings). */
  function sendsToText(h) {
    h = h || {};
    const host = String(h.sendsTo || ""), model = String(h.cheapModel || h.model || "");
    if (!host) { return ""; }
    if (/^(127\.0\.0\.1|localhost)$/.test(host)) { return "Questions are answered by a model on this laptop (" + model + "): nothing is sent out."; }
    const via = /openrouter/.test(host)
      ? "OpenRouter (" + host + "), which passes them on to a company that runs the model " + model
      : host + " (model " + model + ")";
    return "Where your questions go: your question, the step you are on and the facts it remembers are sent to " + via +
      " to be answered. The memory and your ticks stay on this laptop.";
  }

  function updateStatus() {
    const s = document.getElementById("ga-status");
    if (!s) { return; }
    if (!HEALTH || !ENDPOINT) { s.hidden = true; return; }
    const sc = stepContext(), m = HEALTH.month || {};
    s.textContent = (sc.step ? "Step " + sc.step + " \u00b7 " : "") + "AI on (" + (HEALTH.cheapModel || HEALTH.model || "model") + ")" +
      (m.cap ? " \u00b7 US$" + Number(m.usd || 0).toFixed(2) + " of US$" + Number(m.cap).toFixed(2) + " this month" : "");
    s.hidden = false;
  }

  /* An unpaired phone: type the laptop's 6-digit code. */
  function buildPairCard() {
    const box = el("div", "ga-pair");
    box.id = "ga-pair";
    box.hidden = true;
    box.appendChild(el("p", null, "Pair this phone with the laptop: in the laptop's chat open \u2699 Settings, turn Phone access on, press Pair a phone, then type the 6 digits here."));
    const row = el("div", "ga-row");
    const inp = el("input", "ga-pair-code");
    inp.id = "ga-pair-code"; inp.inputMode = "numeric"; inp.maxLength = 6; inp.autocomplete = "one-time-code";
    inp.setAttribute("aria-label", "The 6-digit code from the laptop");
    const go = el("button", "ga-chip", "Pair");
    go.type = "button"; go.id = "ga-pair-go";
    const msg = el("p", "ga-src");
    msg.id = "ga-pair-msg";
    go.addEventListener("click", function () {
      fetch("/api/pair", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: inp.value, name: "Phone" }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j || {} }; }); })
        .then(function (x) {
          if (x.ok && x.j.token) {
            try { localStorage.setItem(DEVICE_KEY, x.j.token); } catch (e) { /* private mode: pairing lasts this visit */ }
            msg.textContent = "Paired. This phone now uses the laptop's AI, memory and ticks.";
            PAIR_NEEDED = false; ENDPOINT = ""; probeEndpoint();
          } else {
            msg.textContent = x.j.error === "locked"
              ? "Too many wrong codes: wait " + Math.ceil((x.j.retryInS || 600) / 60) + " minutes, then make a new code on the laptop."
              : "That did not work: " + (x.j.error || "error") + (x.j.triesLeft ? " (" + x.j.triesLeft + " tries left)." : ".");
          }
        }, function () { msg.textContent = "The laptop could not be reached: is it on, with Phone access on?"; });
    });
    row.appendChild(inp); row.appendChild(go);
    box.appendChild(row); box.appendChild(msg);
    return box;
  }
  function showPairCard(on) {
    const c = document.getElementById("ga-pair");
    if (c) { c.hidden = !on; }
  }

  /* "What I remember": every fact, with Delete, and Forget everything (two taps). */
  function buildMemoryPanel() {
    const node = el("div", "ga-memory");
    node.id = "ga-memory";
    node.hidden = true;
    node.appendChild(el("h4", "ga-title", "What I remember"));
    node.appendChild(el("p", "ga-src", "Kept on the laptop only. Each question takes along the facts that match it. Delete anything you do not want kept."));
    const list = el("ul", "ga-memory-list");
    list.id = "ga-memory-list";
    const forgetAll = el("button", "ga-chip", "Forget everything");
    forgetAll.type = "button"; forgetAll.id = "ga-forget-all";
    let armed = false;
    forgetAll.addEventListener("click", function () {
      if (!armed) {
        armed = true; forgetAll.textContent = "Tap again to forget everything";
        setTimeout(function () { armed = false; forgetAll.textContent = "Forget everything"; }, 5000);
        return;
      }
      armed = false; forgetAll.textContent = "Forget everything";
      fetch("/api/memory?all=1", { method: "DELETE", headers: writeTokenHeaders() }).then(refresh, refresh);
    });
    node.appendChild(list);
    node.appendChild(forgetAll);
    function refresh() {
      return fetch("/api/memory", { cache: "no-store", headers: writeTokenHeaders() })
        .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
        .then(function (j) {
          list.textContent = "";
          const facts = j && Array.isArray(j.facts) ? j.facts : [];
          if (!facts.length) {
            list.appendChild(el("li", "ga-empty", j ? "Nothing yet. Tell it things like \u201cmy batteries arrived\u201d and it will remember them."
              : "The laptop's server is not reachable here, so there is no memory to show."));
          }
          facts.forEach(function (f) {
            const li = el("li");
            li.appendChild(el("span", null, f.text));
            li.appendChild(el("small", null, "told on the " + (f.from === "phone" ? "phone" : "laptop") + ", " + new Date(f.at).toLocaleDateString()));
            const del = el("button", "ga-link", "Delete");
            del.type = "button";
            del.addEventListener("click", function () { forgetFact(f.id).then(refresh); });
            li.appendChild(del);
            list.appendChild(li);
          });
          forgetAll.hidden = !facts.length;
        });
    }
    return { node: node, refresh: refresh };
  }

  /* Settings, job 8 part: where questions go, the monthly cap, phone access and paired phones (laptop only). */
  function buildJob8Settings() {
    const node = el("div", "ga-job8");
    node.id = "ga-job8";
    const where = el("p", "ga-where");
    where.id = "ga-sends-to";
    node.appendChild(where);
    const laptopOnly = el("div");
    node.appendChild(laptopOnly);
    const capLabel = el("label", "ga-src", "Monthly AI budget in US$ (a hard limit kept on the laptop; at the limit the chat uses the written answers): ");
    capLabel.setAttribute("for", "ga-month-cap");
    const cap = el("input", "ga-month-cap");
    cap.id = "ga-month-cap"; cap.type = "number"; cap.min = "0.5"; cap.max = "20"; cap.step = "0.5";
    const capSave = el("button", "ga-chip", "Save budget");
    capSave.type = "button"; capSave.id = "ga-month-save";
    const capMsg = el("p", "ga-src");
    capMsg.id = "ga-month-msg";
    capSave.addEventListener("click", function () {
      fetch("/api/settings", { method: "POST", headers: writeTokenHeaders({ "content-type": "application/json" }), body: JSON.stringify({ monthlyUsdMax: Number(cap.value) }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.monthlyUsdMax != null) {
            cap.value = j.monthlyUsdMax;
            capMsg.textContent = "Saved: US$" + Number(j.monthlyUsdMax).toFixed(2) + " a month. Spent so far this month: US$" + Number((j.month || {}).usd || 0).toFixed(2) + ".";
            if (HEALTH && j.month) { HEALTH.month = j.month; updateStatus(); }
          } else { capMsg.textContent = (j && j.error) || "Not saved."; }
        }, function () { capMsg.textContent = "Not saved: the laptop's server did not answer."; });
    });
    const capRow = el("div", "ga-row");
    capRow.appendChild(cap); capRow.appendChild(capSave);
    laptopOnly.appendChild(capLabel); laptopOnly.appendChild(capRow); laptopOnly.appendChild(capMsg);

    laptopOnly.appendChild(el("h4", "ga-title", "Phone access (home Wi-Fi)"));
    const phoneBtn = el("button", "ga-chip", "Phone access: off");
    phoneBtn.type = "button"; phoneBtn.id = "ga-phone-toggle";
    const pairBtn = el("button", "ga-chip", "Pair a phone");
    pairBtn.type = "button"; pairBtn.id = "ga-pair-start";
    const phoneRow = el("div", "ga-row");
    phoneRow.appendChild(phoneBtn); phoneRow.appendChild(pairBtn);
    const phoneInfo = el("p", "ga-src");
    phoneInfo.id = "ga-phone-info";
    const codeShow = el("p", "ga-pair-codeshow");
    codeShow.id = "ga-pair-codeshow";
    const devices = el("ul", "ga-devices");
    devices.id = "ga-devices";
    laptopOnly.appendChild(phoneRow); laptopOnly.appendChild(phoneInfo); laptopOnly.appendChild(codeShow); laptopOnly.appendChild(devices);
    let phoneOn = false;
    function paintPhone(j) {
      phoneOn = !!(j && j.on);
      phoneBtn.textContent = phoneOn ? "Phone access: on" : "Phone access: off";
      phoneBtn.setAttribute("aria-pressed", String(phoneOn));
      pairBtn.disabled = !phoneOn;
      phoneInfo.textContent = j && j.error ? j.error
        : phoneOn ? "On. On your phone, on the same home Wi-Fi, open " + j.url + " . The first time, Windows may ask to allow Node.js on private networks: click Allow. Use it on home Wi-Fi only, not public Wi-Fi."
          : "Off: nothing on the home network can reach the guide.";
      if (!phoneOn) { codeShow.textContent = ""; }
      devices.textContent = "";
      ((j && j.devices) || []).forEach(function (d) {
        const li = el("li");
        li.appendChild(el("span", null, d.name));
        li.appendChild(el("small", null, "paired " + new Date(d.at).toLocaleDateString() + ", last used " + new Date(d.lastSeen).toLocaleString()));
        const rm = el("button", "ga-link", "Remove");
        rm.type = "button";
        rm.addEventListener("click", function () {
          fetch("/api/devices/" + encodeURIComponent(d.id), { method: "DELETE", headers: writeTokenHeaders() }).then(refreshPhone, refreshPhone);
        });
        li.appendChild(rm);
        devices.appendChild(li);
      });
    }
    function refreshPhone() {
      return fetch("/api/phone", { cache: "no-store", headers: writeTokenHeaders() })
        .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
        .then(function (j) { if (j) { paintPhone(j); } });
    }
    phoneBtn.addEventListener("click", function () {
      phoneBtn.disabled = true;
      fetch("/api/phone", { method: "POST", headers: writeTokenHeaders({ "content-type": "application/json" }), body: JSON.stringify({ on: !phoneOn }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { phoneBtn.disabled = false; paintPhone(j); }, function () { phoneBtn.disabled = false; });
    });
    pairBtn.addEventListener("click", function () {
      fetch("/api/pair/start", { method: "POST", headers: writeTokenHeaders({ "content-type": "application/json" }), body: "{}" })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          codeShow.textContent = j && j.code ? j.code : "";
          phoneInfo.textContent = j && j.code ? "Type this code on the phone within 5 minutes. It works once." : ((j && j.error) || "No code.");
        });
    });
    function refresh() {
      const isLaptop = LOCAL_HOST && !PAIR_NEEDED;
      laptopOnly.hidden = !isLaptop;
      where.textContent = sendsToText(HEALTH);
      where.hidden = !where.textContent;
      if (!isLaptop) { return Promise.resolve(); }
      fetch("/api/settings", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
        .then(function (j) {
          if (!j) { return; }
          cap.value = j.monthlyUsdMax != null ? j.monthlyUsdMax : 2;
          const m = j.month || {};
          capMsg.textContent = "Spent this month: US$" + Number(m.usd || 0).toFixed(2) + " of US$" + Number(j.monthlyUsdMax || 2).toFixed(2) + ".";
          if (!where.textContent) { where.textContent = sendsToText(j); where.hidden = !where.textContent; }
        });
      return refreshPhone();
    }
    return { node: node, refresh: refresh };
  }

  /* Ticks from every device: send this browser's changes to the laptop, and take the laptop's newer ones.
     A tick is applied by setting its box and firing "change", so the page's own code saves it as usual. */
  let progressSync = null;
  function startProgressSync() {
    if (progressSync || typeof saved === "undefined" || !saved || !saved.ticks) { return; }
    const AT_KEY = "ga-progress-at";
    let at = {};
    try { at = JSON.parse(localStorage.getItem(AT_KEY)) || {}; } catch (e) { at = {}; }
    let last = JSON.stringify(saved.ticks);
    const storeAt = function () { try { localStorage.setItem(AT_KEY, JSON.stringify(at)); } catch (e) { /* private mode */ } };
    const send = function (changes) {
      if (!Object.keys(changes).length) { return Promise.resolve(); }
      return fetch("/api/progress", { method: "POST", headers: writeTokenHeaders({ "content-type": "application/json" }), body: JSON.stringify({ changes: changes }) })
        .catch(function () { /* the next change retries */ });
    };
    function applyRemote(ticks) {
      Object.keys(ticks || {}).forEach(function (k) {
        const r = ticks[k];
        if (!r || (at[k] && at[k] >= r.at)) { return; }
        at[k] = r.at;
        if (!!saved.ticks[k] === r.v) { return; }
        const box = document.querySelector('input[type="checkbox"][data-key="' + k.replace(/["\\]/g, "") + '"]') ||
          (/^asm-\d$/.test(k) ? document.querySelector('input[type="checkbox"][data-asm="' + k.slice(4) + '"]') : null);
        if (box) { box.checked = r.v; box.dispatchEvent(new Event("change", { bubbles: true })); }
        else { saved.ticks[k] = r.v; if (typeof save === "function") { save(); } }
      });
      storeAt();
      last = JSON.stringify(saved.ticks);
    }
    function pull(first) {
      return fetch("/api/progress", { cache: "no-store", headers: writeTokenHeaders() })
        .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
        .then(function (j) {
          if (!j || !j.ticks) { return; }
          applyRemote(j.ticks);
          if (first) {
            /* ticks made before syncing existed: send the ones the laptop does not have, as old changes */
            const seed = {};
            Object.keys(saved.ticks).forEach(function (k) { if (saved.ticks[k] && !j.ticks[k]) { seed[k] = { v: true, at: 1 }; at[k] = 1; } });
            storeAt();
            send(seed);
          }
        });
    }
    function push() {
      const now = JSON.stringify(saved.ticks);
      if (now === last) { return; }
      const prev = JSON.parse(last), cur = saved.ticks, changes = {}, t = Date.now();
      Object.keys(Object.assign({}, prev, cur)).forEach(function (k) {
        if (!!prev[k] !== !!cur[k]) { changes[k] = { v: !!cur[k], at: t }; at[k] = t; }
      });
      last = now;
      storeAt();
      send(changes);
    }
    progressSync = setInterval(function () { push(); updateStatus(); }, 3000);
    /* a tick changes the step he is on: show it at once, not at the next sync */
    document.addEventListener("change", function (e) {
      const t = e.target;
      if (t && t.matches && t.matches('input[type="checkbox"][data-asm], input[type="checkbox"][data-key]')) { updateStatus(); }
    });
    window.addEventListener("focus", function () { pull(false); });   // back on this tab: pick up the other device's ticks
    window.GuideAssistant.syncProgress = function () { push(); return pull(false); };
    pull(true);
  }

  function init() {
    buildIndex();
    mount();
    if (!restore()) { push(introMessage()); }
    watchBuildPosition();
    const flags = String(location.hash) + String(location.search);
    if (/ga-open/.test(flags)) {
      setOpen(true);
      const l = document.getElementById("ga-launcher");
      if (l) { l.setAttribute("aria-expanded", "true"); }
    }
    probeEndpoint();
    setMode();
    /* ?ga-ask=<question> asks one question and writes the outcome to a <pre>,
       so the whole model path can be regression-tested from the command line. */
    const askFlag = String(location.search).match(/[?&]ga-ask=([^&#]+)/);
    if (/ga-drawer-test/.test(flags)) {
      /* Drives the settings drawer for real. See runDrawerProbe. */
      probeEndpoint().then(function () { return runDrawerProbe(); });
    } else if (/ga-build-sync-test/.test(flags)) {
      probeEndpoint().then(function () { return runBuildSyncProbe(); });
    } else if (/ga-quiz-test/.test(flags)) {
      /* Proves an earned quiz pass survives the bank growing. See runQuizProbe. */
      runQuizProbe();
    } else if (askFlag) {
      const question = decodeURIComponent(askFlag[1].replace(/\+/g, " "));
      probeEndpoint().then(function () { return runAskProbe(question); });
    } else {
      probeEndpoint();
    }
    setMode();
    if (/ga-selftest/.test(flags)) { writeSelfTest(); }
  }

  window.GuideAssistant = {
    ask: ask,
    /* Force the paid path for one question, even when the curated entry could
       answer it for free:  GuideAssistant.askAI("how much does this cost") */
    askAI: function (text) { return ask(text, { forceModel: true }); },
    answer: answerLocal,
    jump: jump,
    match: matchEntry,
    search: searchPassages,
    context: buildContext,
    selfTest: selfTest,
    writeSelfTest: writeSelfTest,
    kb: KB,
    passages: PASSAGES,
    intro: introMessage,
    setEndpoint: function (u) { ENDPOINT = u || ""; setMode(); },
    getEndpoint: function () { return ENDPOINT; },
    history: function () { return ctx.history.slice(); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
