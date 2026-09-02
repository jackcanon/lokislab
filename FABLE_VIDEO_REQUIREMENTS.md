# V3 Test Harness — 90-Second Video Series for Fable Agent

**Goal:** Create three separate 90-second presentation videos for new users covering Prerequisites, Running the Test, and What to Do After.

**Total series:** 3 videos × 90 seconds = 4.5 minutes
**Format:** Presentation slides (Fable agent creates visuals), 11Labs narrator (we add voiceover)
**Audience:** Non-technical users wanting to benchmark their local AI model

---

## VIDEO 1: PREREQUISITES (90 seconds)

### Video Title
"V3 Test Harness: What You Need to Get Started"

### Key Points to Cover

**Hardware Requirements**
- Minimum 16GB RAM
- Works on macOS (M1+), Linux, or Windows/WSL2
- ~50GB free disk space
- Note: More RAM = faster tests

**What to Install (3 things)**
1. **Ollama** (free, from ollama.ai)
   - The app that runs local AI models
   - Available for all major platforms
   - Simple one-click installer

2. **Python 3.8+** (usually already installed)
   - Quick check: Open terminal, type `python3 --version`
   - If you don't have it, free download from python.org

3. **The Test Harness** (download from lokislab.org)
   - One shell script file (~5KB)
   - Runs all 18 tests automatically
   - No coding required

**Visual Elements for Fable**
- System requirements checklist (RAM, disk space, OS)
- Ollama logo/interface mockup
- Python terminal window showing version check
- Download button/link visual
- Timeline: "Installation takes 5-10 minutes"

**Voiceover Script (90 seconds)**
"Welcome! Before you can run the V3 test harness, you'll need just a few things.

First, your machine needs at least 16 gigabytes of RAM. More is better — if you have 32GB or more, the tests will run faster. You'll also need about 50 gigabytes of free disk space for the model itself.

The test works on macOS with an M1 or newer, any Linux distribution, or Windows with WSL2.

Now for the software. You need three things.

First, install Ollama — that's the app that runs AI models locally. Head to ollama.ai, download it, and run the installer. Takes about a minute.

Second, you need Python 3.8 or newer. Most of you probably have this already. Just open your terminal and type 'python3 --version' to check. If you don't have it, it's a free download from python.org.

Finally, download the V3 test harness from lokislab.org. It's one small script file — no installation needed, just download and you're ready to go.

That's it! You're all set. Once you have these three things installed, you can run the full test battery. Next, we'll show you how."

---

## VIDEO 2: RUNNING THE TEST (90 seconds)

### Video Title
"V3 Test Harness: How to Run the Tests"

### Key Points to Cover

**Pre-Test Setup (2 minutes)**
1. Open Terminal
2. Create a working folder: `mkdir -p ~/loki-v3-test && cd ~/loki-v3-test`
3. Download the script: `curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o v3_test_harness.sh`
4. Make it executable: `chmod +x v3_test_harness.sh`
5. Pre-cache the model (optional but recommended): `ollama pull qwen3.6:latest`

**Running the Tests (2-4 hours)**
1. Start tests: `./v3_test_harness.sh`
2. Script runs pre-flight checks automatically
3. Tests run in the background — you can close terminal and come back
4. Shows progress for each test with timing and quality scores

**What Happens During Tests**
- 18 different tests total (web design, writing, graphics, coding, etc.)
- Each test takes 30 seconds to 5 minutes depending on hardware
- Quality scores appear on screen (1-5 scale)
- Results save automatically to a `results/` folder
- Full suite typically takes 2-4 hours

**Visual Elements for Fable**
- Terminal window showing each command step-by-step
- Command line with cursor, text appearing as you type
- Progress bar animation (ollama pull)
- Test output with colored results (PASS/FAIL, quality scores)
- Timer showing "Running... 45 minutes elapsed"
- Calendar/clock showing total time estimate (2-4 hours)
- File folder with results directory highlighted

**Voiceover Script (90 seconds)**
"Now let's run the tests. Open your Terminal — that's the command-line app on your computer.

First, create a folder to work in. Copy and paste this command:

mkdir -p ~/loki-v3-test && cd ~/loki-v3-test

Next, download the test harness:

curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o v3_test_harness.sh

Make it executable:

chmod +x v3_test_harness.sh

Before running tests, let's download the AI model. This usually takes 10 to 30 minutes on first run. Type:

ollama pull qwen3.6:latest

Go grab coffee — this takes a little while.

Once that's done, run the full test suite:

./v3_test_harness.sh

The script does a quick check to make sure everything is set up, then starts running all 18 tests. You'll see each test name, how long it took, and a quality score.

The whole battery takes about 2 to 4 hours depending on your hardware. But here's the good news — you don't have to watch. The tests run in the background, so close your terminal and come back later.

Your results will be saved automatically to a folder called 'results'. Next, we'll show you what to do with them."

---

## VIDEO 3: WHAT TO DO AFTER (90 seconds)

### Video Title
"V3 Test Harness: What to Do With Your Results"

### Key Points to Cover

**Understand Your Results**
- Results folder contains JSON files (one per test)
- Each file has: test name, quality score, accuracy, timing, model response
- You don't need to understand the JSON — it's just data
- Quality scores: 1-5 scale (5 is perfect)

**Check Your Results Locally**
1. Open Terminal and list results: `ls -la results/`
2. You'll see files named like: `qwen3.6_latest__yourmachine__1a.json`
3. View a result: `cat results/qwen3.6_latest__yourmachine__1a.json`

**Submit to Loki's Lab Leaderboard**
1. Go to https://lokislab.org/test/results
2. Click "Submit a benchmark result" button
3. Upload your JSON result files (or upload whole results/ folder)
4. Your hardware and model appear on the public leaderboard
5. Compare your scores against others

**What the Leaderboard Shows**
- Your machine specs (RAM, CPU type, GPU if any)
- Model tested (qwen3.6:latest, etc.)
- Average quality score
- Percentage of tests passed
- How you rank against other machines

**Visual Elements for Fable**
- File manager showing results/ folder with JSON files
- Terminal window with `ls` and `cat` commands
- Browser showing lokislab.org/test/results page
- "Submit a benchmark result" button highlighted
- Leaderboard table showing rankings
- Sample entry showing: machine specs → quality score → rank
- Celebration/achievement visual for submitting

**Voiceover Script (90 seconds)**
"Great! Your tests are done. Now what?

Your results are saved in a folder called 'results'. Open your Terminal and list them:

ls -la results/

You'll see files named like 'qwen3.6_latest__yourmachine__1a.json'. That's one test result. Each file has the test name, quality score, accuracy, how long it took, and the model's actual response.

You don't need to understand the JSON format — it's just the data we need for the leaderboard.

Now for the fun part: submit your results to the Loki's Lab leaderboard!

Go to lokislab.org/test/results. You'll see other people's results, ranked by score.

Click the button that says 'Submit a benchmark result'. Upload your results folder or just the JSON files.

Hit submit, and boom — your machine is on the leaderboard!

You'll see your hardware specs — RAM, CPU, GPU if you have one. You'll see your model and your average quality score. And you'll see exactly how your setup ranks against everyone else.

Did your MacBook beat a fancy Linux box? Did that old laptop surprise everyone? The leaderboard shows it all.

Your results are completely anonymous unless you add your name. So submit with confidence!

Thanks for testing with us. See you on the leaderboard!"

---

## PRESENTATION REQUIREMENTS FOR FABLE AGENT

### Slide Design Guidelines

**Overall Style**
- Clean, modern, professional but friendly
- Dark theme with accent colors (suggest: warm orange/terracotta like Loki's Lab branding)
- Large, readable text (minimum 24pt for body, 36pt+ for headers)
- Clear visual hierarchy
- Minimal text per slide (mostly visuals, let voiceover carry the story)

**Color Scheme**
- Background: Dark (near-black or dark charcoal)
- Accent color: Warm orange/terracotta (#b74627 or similar)
- Text: White or light gray
- Highlights: Orange/gold for important elements

**Typography**
- Headers: Bold, 36-48pt
- Body text: 24-28pt
- Code/terminal: Monospace, 20pt
- Clean sans-serif font (Helvetica, Inter, or system font)

**Each Video Should Have**
- Intro slide (title + animated logo)
- 4-6 content slides with visuals
- Outro slide (thank you, next steps, or link to next video)

### Animation Recommendations

**Video 1 (Prerequisites)**
- Animate checklist items appearing one-by-one
- Show software icons (Ollama, Python, text editor)
- System spec graphic grows/fills (RAM, disk space)
- Download button animates

**Video 2 (Running the Test)**
- Terminal commands appear as if being typed
- Progress bar fills during `ollama pull`
- Test results appear with colored badges (PASS/FAIL)
- Timer counts up showing 2-4 hour duration
- Folder opens to show results directory

**Video 3 (What to Do After)**
- File explorer showing results directory
- Terminal output appears
- Browser window loads lokislab.org
- Leaderboard table scrolls/animates
- User's entry highlights on leaderboard
- Celebration animation (confetti, trophy, etc.)

### Technical Specifications

**Video Output**
- Resolution: 1920×1080 (1080p) minimum
- Frame rate: 30fps or 60fps
- Format: MP4 (H.264 video, AAC audio)
- Duration: Exactly 90 seconds per video

**Captions/Subtitles**
- Provide WebVTT format captions synchronized to voiceover
- White text on dark background (high contrast)
- Positioned bottom-center, not overlapping important content

**Audio Tracks**
- Voiceover track (will add 11Labs later)
- Background music (optional): Subtle, upbeat, royalty-free
- Total audio mix: Voiceover 100%, music at 20% volume (if included)

---

## DETAILED CONTENT FOR EACH VIDEO

### VIDEO 1: PREREQUISITES — Slide-by-Slide Breakdown

**Slide 1: Title Slide**
- Title: "V3 Test Harness: What You Need"
- Subtitle: "Get your computer ready in 5 minutes"
- Animated logo (Loki's Lab)
- Timeline: "Duration: 90 seconds"

**Slide 2: System Requirements (First Half)**
- Header: "Your Computer Needs..."
- Checklist items appearing left-to-right:
  ☑ 16GB RAM (minimum)
  ☑ 50GB free disk space
  ☑ macOS M1+, Linux, or Windows/WSL2
- Visual: Computer icon with RAM/storage bars filling

**Slide 3: Hardware Visual**
- Show three computer types: MacBook, Linux desktop, Windows laptop
- Highlight hardware specs for each
- "More RAM = Faster Tests" callout

**Slide 4: Three Things to Install**
- Header: "Install These 3 Things"
- Three boxes appearing:
  1. Ollama logo + "Free AI model runner" (from ollama.ai)
  2. Python logo + "Programming language" (v3.8+)
  3. Test harness icon + "One script file" (from lokislab.org)
- Visual: Download arrows pointing down

**Slide 5: Installation Timeline**
- Timeline graphic:
  "5 min → Install Ollama"
  "2 min → Check Python"
  "1 min → Download script"
  "= Ready to test!"
- Animated progress bar

**Slide 6: Recap & Next Steps**
- Summary box: "Ready? You now have everything you need."
- Arrow pointing right: "Next: Running the Tests"
- Button/CTA: "Continue to Video 2"

---

### VIDEO 2: RUNNING THE TEST — Slide-by-Slide Breakdown

**Slide 1: Title Slide**
- Title: "Running the V3 Test"
- Subtitle: "Step-by-step walkthrough"
- Animated terminal window opening

**Slide 2: Step 1 - Create Folder**
- Terminal window showing:
  ```
  $ mkdir -p ~/loki-v3-test && cd ~/loki-v3-test
  ```
- Text types character-by-character (simulated typing)
- Folder icon appears with checkmark

**Slide 3: Step 2 - Download Harness**
- Terminal showing:
  ```
  $ curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o v3_test_harness.sh
  ```
- Download animation (progress bar)
- File icon appears with checkmark

**Slide 4: Step 3 - Make Executable**
- Terminal showing:
  ```
  $ chmod +x v3_test_harness.sh
  ```
- Small animation showing file locking/permissions change
- Checkmark

**Slide 5: Step 4 - Download Model (Pre-Cache)**
- Terminal showing:
  ```
  $ ollama pull qwen3.6:latest
  ```
- Large progress bar filling (22GB download)
- Time estimate: "10-30 minutes"
- Coffee cup emoji animation
- Checkmark when complete

**Slide 6: Step 5 - Run Tests**
- Terminal showing:
  ```
  $ ./v3_test_harness.sh
  ```
- Animated output showing:
  ```
  [✓] 1a: coding_web_design (45.8s) q=5
  [✓] 1b: coding_web_design (15.6s) q=5
  [✓] 2a: writing (29.2s) q=5
  ...
  ```
- Quality scores appear in green/orange
- Test names scroll

**Slide 7: What Happens During Tests**
- Split screen showing:
  Left: Test output with colored badges
  Right: Timer showing "2-4 hours total"
- Note: "Tests run in background — you can close terminal"
- 18 test categories listed (abbreviated):
  • Web design • Writing • Graphics
  • Infrastructure • Transcription • Business
  • Coding • Vision • Data structures
  • Long-context • Reasoning • Math

**Slide 8: Results Save Automatically**
- File folder animation showing:
  `results/` folder with JSON files appearing
- File names: `qwen3.6_latest__yourmachine__1a.json`
- Folder icon with star/checkmark
- "Ready for submission!"

**Slide 9: Recap**
- Box: "Tests running? Great!"
- "Your results are saving automatically"
- Arrow: "Next: Submit Your Results"
- Button/CTA: "Continue to Video 3"

---

### VIDEO 3: WHAT TO DO AFTER — Slide-by-Slide Breakdown

**Slide 1: Title Slide**
- Title: "What to Do With Your Results"
- Subtitle: "Show off your scores on the leaderboard"
- Celebration emoji animation

**Slide 2: Your Results Folder**
- File manager window showing:
  `results/` folder with JSON files
- Highlighted files:
  - `qwen3.6_latest__yourmachine__1a.json`
  - `qwen3.6_latest__yourmachine__1b.json`
  - etc.
- Text: "Each file = one test result"

**Slide 3: Understanding Your Results**
- JSON structure simplified (visual, not code):
  ```
  Test Name: coding_web_design
  Quality Score: 5 (out of 5)
  Accuracy: 4 (out of 5)
  Time Taken: 45.8 seconds
  Status: PASS ✓
  ```
- Callout: "You don't need to understand JSON — just upload it!"

**Slide 4: Go to Leaderboard**
- Browser window showing:
  lokislab.org/test/results
- URL highlighted
- "Submit a benchmark result" button highlighted in orange
- Arrow pointing to button

**Slide 5: Submit Your Results**
- Step-by-step visual:
  1. Click "Submit a benchmark result"
  2. Select your results files (folder icon)
  3. Click "Upload"
  4. Checkmark appears
- Timeline: "Takes 2 minutes"

**Slide 6: See Yourself on the Leaderboard**
- Leaderboard table showing (sample data):
  | Rank | Machine | Model | Quality | Score |
  |------|---------|-------|---------|-------|
  | 1 | MacBook M4 | qwen3.6:latest | 5.0 | 100% |
  | 2 | Linux RTX4070 | qwen3.6:latest | 4.8 | 95% |
  | **3** | **YOUR MACHINE** | qwen3.6:latest | 4.6 | 90% | ← Highlighted
  | 4 | Ubuntu 24GB | qwen3.6:latest | 4.2 | 85% |

- Your entry highlighted in orange
- Shows: Machine specs, model, quality, percentage passed

**Slide 7: What the Leaderboard Shows**
- Three callout boxes:
  Box 1: "Your Hardware" (RAM, CPU, GPU)
  Box 2: "Your Model" (qwen3.6:latest)
  Box 3: "Your Score" (Quality: 4.6, 90% passed)
- Bottom: "Compare yourself against others!"

**Slide 8: Final Celebration**
- Leaderboard with YOUR entry prominently featured
- Confetti animation (or trophy icon)
- Text: "You're on the leaderboard!"
- Subtext: "Results are anonymous unless you add your name"

**Slide 9: Recap & Thank You**
- Summary box:
  "1. Download & Install"
  "2. Run Tests (2-4 hours)"
  "3. Submit Results"
- Large text: "That's it!"
- Thank you message with Loki's Lab logo
- Link/CTA: "Visit lokislab.org to get started"

---

## TIMING NOTES FOR FABLE AGENT

Each video should be **exactly 90 seconds** when voiceover is added.

**Video 1 (Prerequisites):** 90 seconds
- 0:00-0:15 — Intro slide
- 0:15-0:45 — System requirements slides (3 slides)
- 0:45-1:15 — Installation requirements (3 slides)
- 1:15-1:30 — Recap & next steps

**Video 2 (Running the Test):** 90 seconds
- 0:00-0:10 — Intro slide
- 0:10-1:00 — Step-by-step terminal commands (6 slides, ~10s each)
- 1:00-1:25 — What happens during tests (2 slides)
- 1:25-1:30 — Recap

**Video 3 (What to Do After):** 90 seconds
- 0:00-0:10 — Intro slide
- 0:10-0:35 — Understanding & viewing results (3 slides)
- 0:35-1:05 — Submit to leaderboard & see results (3 slides)
- 1:05-1:30 — Celebration & recap

---

## FINAL DELIVERABLES FOR FABLE AGENT

### Input (what you're giving the agent)
1. This document (complete requirements)
2. Voiceover scripts (copy the exact text from each section)
3. Color/brand guidelines (Loki's Lab branding)
4. Slide breakdown (above)

### Output (what Fable creates)
1. **Video 1 MP4** — 1920×1080, 90 seconds (Prerequisites)
2. **Video 2 MP4** — 1920×1080, 90 seconds (Running the Test)
3. **Video 3 MP4** — 1920×1080, 90 seconds (What to Do After)
4. **WebVTT captions file** — Synchronized captions for all three videos
5. **Source files** (optional) — Figma/Keynote/PowerPoint if editable versions needed

### Post-Production (what you'll do)
1. Add 11Labs voiceover to each video
2. Add WebVTT captions
3. Host MP4s on lokislab.org/test/videos/
4. Link from test page and how-to guide
5. Deploy via git push

---

## SUMMARY FOR FABLE AGENT PROMPT

**Task:** Create three 90-second presentation videos about the V3 test harness.

**Video 1: Prerequisites (0:00-1:30)**
- Show what hardware/software you need
- Checklist style, animated items appearing
- Simple, encouraging tone

**Video 2: Running the Test (1:30-3:00)**
- Step-by-step terminal commands
- Show what happens during 2-4 hour test run
- Results folder appears at end

**Video 3: What to Do After (3:00-4:30)**
- View your results
- Submit to leaderboard
- See yourself ranked

**Style:** Clean, modern, dark theme with warm orange accents. Professional but friendly. Terminal windows, file managers, browser windows — realistic OS UI elements.

**All scripts, slide breakdowns, and visual requirements are in the document above.**

---

## NEXT STEPS

1. ✅ Create this requirements document (you're reading it)
2. → Send to Fable agent with voiceover scripts
3. → Fable creates three MP4 presentation videos (slides only, no audio)
4. → Download MP4s and WebVTT captions
5. → Generate 11Labs voiceover using provided scripts
6. → Merge audio + video in FFmpeg or DaVinci
7. → Upload to lokislab.org/test/videos/
8. → Update test page with video links
9. → Deploy!

**Questions for Fable agent?** See the "Presentation Requirements for Fable Agent" section above for design, animation, and technical specs.
