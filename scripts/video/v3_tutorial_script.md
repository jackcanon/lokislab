# Loki's Lab V3 Test Harness — Video Tutorial Script

**Duration:** 5-10 minutes
**Tone:** Friendly and conversational
**Target:** Complete beginners who want to test their local AI model

---

## SECTION 1: Introduction (30 seconds)

**VISUAL:** Title card with Loki's Lab logo, upbeat music fades in
**VOICEOVER:**

"Hey! Welcome to Loki's Lab. I'm here to show you how to run the V3 test harness — it's a simple way to benchmark your local AI model and see how it stacks up on the leaderboard.

The whole process takes just a few minutes to set up, and then you kick off the tests and grab a coffee while they run. Let's get started!"

---

## SECTION 2: What You Need (1 minute)

**VISUAL:** Split screen or checklist appears on screen
- Show system requirements
- Minimum 16GB RAM
- Ollama app
- Python 3.8+
- ~50GB disk space

**VOICEOVER:**

"Here's what you'll need:

First, a machine with at least 16 gigabytes of RAM. The bigger models we test need a little breathing room, so 16 is the minimum, but 32 or more is even better.

Second, Ollama — that's the app that runs local AI models. It's totally free and works on Mac, Linux, and Windows with WSL2.

You'll also need Python 3.8 or newer — most of you probably already have this, but we'll show you how to check.

And finally, about 50 gigabytes of free disk space. That's mostly for the model itself, which is around 22 gigs.

If you're not sure about any of this, don't worry — the how-to guide has step-by-step instructions for everything."

---

## SECTION 3: Install Ollama (1.5 minutes)

**VISUAL:** Screen recording of Ollama.ai website, download, installation process
- Visit ollama.ai
- Click Download
- Show macOS/Linux/Windows options
- Double-click installer
- Show Ollama launching

**VOICEOVER:**

"Let's start by installing Ollama. Head over to ollama.ai and click the Download button.

Pick your operating system — we've got macOS, Linux, and Windows with WSL2.

Download the installer, double-click it, and let it do its thing. On Mac, you'll drag Ollama into your Applications folder. On Linux, it's a one-command install.

Give it a minute to finish, and then launch Ollama. You'll see it pop up in your menu bar on Mac, or as a background service on Linux.

That's it! Ollama is now running and ready to download models."

---

## SECTION 4: Download the Test Harness (1 minute)

**VISUAL:** Terminal window, step-by-step commands typed out
- Create directory: `mkdir -p ~/loki-v3-test`
- Change directory: `cd ~/loki-v3-test`
- Download harness
- Make executable

**VOICEOVER:**

"Alright, now let's get the test harness. Open up your Terminal — that's the command-line app on your machine.

First, we'll create a folder to work in. Type this:

mkdir -p ~/loki-v3-test

Then change into that folder:

cd ~/loki-v3-test

Now, download the test harness:

curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o v3_test_harness.sh

And make it executable:

chmod +x v3_test_harness.sh

Done! You now have the test harness ready to go."

---

## SECTION 5: Pre-Cache the Model (1 minute)

**VISUAL:** Terminal window showing ollama pull command running
- Show: `ollama pull qwen3.6:latest`
- Show progress bar
- Show completion

**VOICEOVER:**

"Before we run the tests, let's pre-download the model. This usually takes 10 to 30 minutes on first run, depending on your internet speed.

In the same Terminal, type:

ollama pull qwen3.6:latest

You'll see a progress bar as it downloads the 22-gigabyte model. Go grab a coffee, check your email — whatever you need to do while this downloads.

If your download is slow, the how-to guide has some tips for troubleshooting. But for most people, this just works."

---

## SECTION 6: Run the Tests (2 minutes)

**VISUAL:** Terminal showing test harness execution
- Show: `./v3_test_harness.sh`
- Show tests running with progress output
- Show quality scores appearing
- Show timing for each test

**VOICEOVER:**

"Once the model finishes downloading, you're ready to run the tests. Just type:

./v3_test_harness.sh

And hit Enter. The script will do a quick check to make sure everything is set up correctly, then start running through the 18 tests.

You'll see output like this as each test completes — it shows the test name, how long it took, and quality scores from 1 to 5.

These tests cover everything: web design, writing, graphics, coding, math, vision, and more. Each one usually takes 30 seconds to a few minutes depending on your hardware.

The whole suite typically takes 2 to 4 hours. So yeah, this is a good time to take a break! The tests run in the background, so you can close your Terminal and come back later."

---

## SECTION 7: Check Your Results (1 minute)

**VISUAL:** File explorer showing results directory
- Show: `ls -la results/`
- Show JSON result files
- Show a sample result file opened and pretty-printed

**VOICEOVER:**

"When the tests finish, all your results get saved to a results folder. You can check them anytime by typing:

ls -la results/

Each test gets its own JSON file with all the details — whether it passed, the quality score, how fast it ran, and the model's actual response.

You can peek at any result file to see exactly what your model did. But you don't need to understand the JSON — that's just so we can aggregate everything for the leaderboard."

---

## SECTION 8: Submit Your Results (1 minute)

**VISUAL:** Browser showing lokislab.org/test/results
- Show the results page
- Show "Submit a benchmark result" button
- Show upload flow
- Show results appearing on leaderboard

**VOICEOVER:**

"Now for the fun part: submitting your results to the Loki's Lab leaderboard!

Head over to lokislab.org/test/results. You'll see other people's results, ranked by hardware and model.

Click the 'Submit a benchmark result' button, upload your JSON files, and boom — your machine is on the leaderboard!

You can see how your hardware compares to others. Did your MacBook M1 beat a fancy Linux box? Did that old laptop surprise everyone? The leaderboard shows it all.

Your results are public, but completely anonymous unless you add your name. So submit with confidence!"

---

## SECTION 9: Outro (30 seconds)

**VISUAL:** Loki's Lab website home page, happy music
**VOICEOVER:**

"That's it! You've just benchmarked your local AI model and joined the Loki's Lab community.

If you run into any issues, the full how-to guide is at lokislab.org/docs/V3-TEST-HOWTO.md — it's got detailed troubleshooting for everything.

Thanks for testing with us, and we can't wait to see what your machine can do. Happy benchmarking!"

**VISUAL:** Credits roll, social links appear on screen
- GitHub: https://github.com/jackcanon/lokislab
- Website: https://lokislab.org
- How-To: https://lokislab.org/docs/V3-TEST-HOWTO.md

---

## Notes for Video Production

### Screen Recording Specs
- Resolution: 1920x1080 (1080p) or higher
- macOS: Use QuickTime or ScreenFlow
- Linux: Use OBS or SimpleScreenRecorder
- Windows/WSL2: Use OBS or Windows built-in Xbox app

### Timing Guide
- Section 1: 0:00-0:30
- Section 2: 0:30-1:30
- Section 3: 1:30-3:00
- Section 4: 3:00-4:00
- Section 5: 4:00-5:00
- Section 6: 5:00-7:00
- Section 7: 7:00-8:00
- Section 8: 8:00-9:00
- Section 9: 9:00-9:30

### Visual Elements
- Title card at start
- Lower-third graphics with section labels
- Mouse cursor highlighting/arrows for emphasis
- Fade to black between sections (optional)
- Upbeat background music (royalty-free)
- Credits roll at end with links

### Voice-Over Notes
- Use friendly, conversational tone (not robotic)
- Pause between sections for visual transitions
- Emphasize key steps: "type this:", "click here:", etc.
- Be encouraging: "don't worry", "this just works", "you got this"
- Keep energy consistent throughout

### ElevenLabs Settings
- Voice: Choose a friendly, approachable voice
- Speed: Slightly slower than normal (0.9x) for clarity
- Stability: Medium (balance between natural and consistent)
- Clarity: High (technical terms need to be clear)

---

## Script Variations

### For Advanced Users (Optional Shorter Version)
Skip sections 2-3, start with "Download the Test Harness"
Duration: 3-5 minutes

### For Troubleshooting Video (Optional Companion)
Create a separate 5-10 minute video covering:
- Disk space issues
- Slow downloads
- Ollama not responding
- Tests failing or timing out
- How to use the how-to guide

---

## File Deliverables

1. **v3_tutorial_final.mp4** (9-10 minutes, 1080p)
2. **v3_tutorial_script.md** (this file, for reference)
3. **v3_tutorial_voiceover.mp3** (ElevenLabs audio export)
4. **v3_tutorial_captions.vtt** (WebVTT captions for accessibility)

---

## Accessibility Requirements

- Include **synchronized captions** (WebVTT or SRT format)
- Captions must appear reliably as reliably as audio
- Describe visual elements in voiceover where important
- Provide full transcript on website
- Audio description track optional but recommended

---

## Hosting & Integration

1. Upload MP4 to: `/Users/jack/lokislab-publish/public/videos/`
2. Create `/app/test/video` page to embed player
3. Link from `/app/test/page.tsx`
4. Include captions via HTML5 video element
5. Fallback: Link to YouTube or Vimeo if direct hosting fails
