# V3 Tutorial Video Production Guide

## Overview

You now have all the assets needed to produce a professional video tutorial with ElevenLabs voice-over and synchronized captions.

**Files created:**
- `v3_tutorial_script.md` — Full video script with section timings
- `v3_tutorial_captions.vtt` — WebVTT captions for accessibility
- `v3_tutorial_elevenlabs_batch.json` — Voice-over generation batch
- `v3_tutorial_timing.md` — Editor timing guide
- `generate_video_assets.py` — Script generator (for future updates)

**Total Duration:** 9 minutes 30 seconds

---

## Step 1: Generate Voice-Over with ElevenLabs

### Option A: ElevenLabs Web UI (Easiest)

1. Go to https://elevenlabs.io and log in
2. Navigate to **Text to Speech** → **Batch Processing**
3. Upload `v3_tutorial_elevenlabs_batch.json`
4. Select voice: **"Rachel"** (friendly, clear, conversational)
5. Click "Generate"
6. Download the generated MP3 files as a ZIP

**Voice Settings to Use:**
- Voice: Rachel (ID: 21m00Tcm4TlvDq8ikWAM)
- Model: Multilingual v1
- Speed: 0.9 (slightly slower for clarity)
- Stability: Medium (natural with consistency)
- Clarity: High
- Speaker Boost: On

### Option B: ElevenLabs API / CLI

```bash
# Install ElevenLabs CLI
pip install elevenlabs

# Generate voice-overs
elevenlabs generate-from-json \
  --input v3_tutorial_elevenlabs_batch.json \
  --output-dir ./voiceovers/ \
  --voice-id 21m00Tcm4TlvDq8ikWAM
```

### Output

You'll get 9 MP3 files (one per section):
- `section_1_introduction.mp3` (30 seconds)
- `section_2_what_you_need.mp3` (60 seconds)
- ... etc

**Total audio:** ~9.5 minutes

---

## Step 2: Record Screen Video

Use the **timing guide** (`v3_tutorial_timing.md`) to know exactly what to show during each section.

### On macOS (Recommended for Quality)

**Using ScreenFlow (Professional):**
1. Open ScreenFlow
2. Start recording (set to 1920x1080 minimum)
3. Follow the timing guide:
   - **0:00-0:30** — Title card (Loki's Lab logo + "V3 Test Harness Tutorial")
   - **0:30-1:30** — Show system requirements checklist
   - **1:30-3:00** — Record Ollama installation (website, download, install)
   - **3:00-4:00** — Terminal: Create directory, download harness
   - **4:00-5:00** — Terminal: Run `ollama pull qwen3.6:latest` (show progress)
   - **5:00-7:00** — Terminal: Run test harness, show tests running
   - **7:00-8:00** — File explorer: Show results directory
   - **8:00-9:00** — Browser: Show lokislab.org/test/results, submit flow
   - **9:00-9:30** — Outro (credits, links)

4. Stop recording and save as `.mov`
5. Use QuickTime or Final Cut to convert to `.mp4` if needed

**Using QuickTime (Simpler, Built-in):**
1. Command+Space → "Screen Recording"
2. Start recording
3. Follow timing guide
4. Save as `.mov`

### On Linux

**Using OBS Studio (Free, Professional):**
1. Open OBS
2. Add "Screen Capture" source (select your monitor)
3. Set resolution to 1920x1080
4. Start recording
5. Follow timing guide
6. Save as `.mp4`

### On Windows

**Using OBS Studio or Xbox Game Bar:**
1. Open OBS → Add "Display Capture" source
2. Set to 1920x1080
3. Start recording
4. Follow timing guide
5. Save as `.mp4`

### Key Tips

- **Use a clean desktop** — Close Slack, email, other notifications
- **Show the cursor** — Make it obvious what you're clicking
- **Highlight important commands** — Use terminal highlighting or zoom in
- **Smooth transitions** — Fade to black between sections (optional)
- **Background music** (optional) — Add upbeat royalty-free music at 20% volume under voiceover

**Recommended screen recording apps:**
- macOS: ScreenFlow ($30), Camtasia, or free QuickTime
- Linux: OBS Studio (free), SimpleScreenRecorder
- Windows: OBS Studio (free), Camtasia

---

## Step 3: Merge Audio + Video

### Using FFmpeg (Free, Command-Line)

```bash
# Combine video + audio
ffmpeg -i screen_recording.mp4 \
       -i merged_voiceover.mp3 \
       -c:v copy \
       -c:a aac \
       -shortest \
       v3_tutorial_with_audio.mp4

# Add captions
ffmpeg -i v3_tutorial_with_audio.mp4 \
       -vf subtitles=v3_tutorial_captions.vtt \
       v3_tutorial_final.mp4
```

### Using DaVinci Resolve (Free, Visual)

1. Import screen video
2. Import voiceover MP3 as separate audio track
3. Sync audio to video using timeline
4. Import captions (VTT format)
5. Add captions track
6. Export as MP4 (H.264, 1080p)

### Using Final Cut Pro (macOS, $300)

1. Create new project (1920x1080, ProRes)
2. Import screen recording to video track
3. Import voiceover to audio track 1
4. Sync audio to video
5. Import captions as subtitle track
6. Add color grading if desired
7. Export as ProRes or H.264 MP4

### Using Camtasia (macOS/Windows, $120)

1. Import screen recording
2. Drag voiceover MP3 to audio track
3. Sync to video
4. Add caption file
5. Export as MP4

---

## Step 4: Add Captions (If Not Done in Step 3)

### Using FFmpeg

```bash
ffmpeg -i v3_tutorial_with_audio.mp4 \
       -vf subtitles=v3_tutorial_captions.vtt \
       -c:v libx264 \
       -preset fast \
       -crf 18 \
       v3_tutorial_final_with_captions.mp4
```

### Verify Captions

Open the final MP4 in your video player and confirm:
- Captions appear in sync with audio
- Text is readable (white on dark background recommended)
- No captions are cut off at screen edges

---

## Step 5: Host the Video

### Option A: Host on Loki's Lab Website (Recommended)

1. Upload MP4 to: `/Users/jack/lokislab-publish/public/videos/v3_tutorial.mp4`
2. Create new page `/app/test/video/page.tsx`:

```typescript
export default function VideoTutorial() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1>V3 Test Harness Video Tutorial</h1>
      <video
        width="100%"
        height="auto"
        controls
        className="rounded-lg shadow-lg mb-6"
      >
        <source src="/videos/v3_tutorial.mp4" type="video/mp4" />
        <track
          kind="captions"
          src="/videos/v3_tutorial_captions.vtt"
          srcLang="en"
          label="English"
          default
        />
        Your browser does not support the video tag.
      </video>
      
      <h2>What You'll Learn</h2>
      <ul>
        <li>Install Ollama</li>
        <li>Download the test harness</li>
        <li>Run the V3 test suite</li>
        <li>Submit results to Loki's Lab</li>
      </ul>
      
      <h2>Full How-To Guide</h2>
      <p>
        For more detailed instructions, see the{' '}
        <a href="/docs/V3-TEST-HOWTO.md">complete how-to guide</a>.
      </p>
    </div>
  );
}
```

3. Add link from `/app/test/page.tsx`:

```typescript
<h2>Video Tutorial</h2>
<p>
  Prefer video? Watch the{' '}
  <Link href="/test/video" className="underline">
    step-by-step video tutorial
  </Link>{' '}
  (9.5 minutes with captions).
</p>
```

4. Commit and push:
```bash
git add public/videos/v3_tutorial.mp4
git add public/videos/v3_tutorial_captions.vtt
git add app/test/video/page.tsx
git add app/test/page.tsx
git commit -m "Add V3 video tutorial with captions"
git push origin main
```

### Option B: Host on YouTube (Alternative)

1. Upload to YouTube (unlisted or public)
2. Enable captions from `.vtt` file
3. Link from `/app/test/page.tsx`:

```typescript
<iframe
  width="100%"
  height="600"
  src="https://www.youtube.com/embed/[VIDEO_ID]"
  title="V3 Test Tutorial"
  allowFullScreen
/>
```

### Option C: Host on Vimeo (Professional)

1. Upload to Vimeo Pro
2. Add captions via Vimeo
3. Embed on website

**Recommendation:** Host on Loki's Lab directly — users don't need to leave your site.

---

## Step 6: Test & Verify

1. **Play the video** on https://lokislab.org/test/video
2. **Check captions:**
   - Appear in sync with audio
   - Readable (white text preferred)
   - No cut-offs at edges
3. **Audio quality:**
   - Clear and friendly tone
   - Good volume levels
   - No pops or distortion
4. **Screen recording:**
   - Sharp, clear
   - Commands and steps visible
   - Pacing matches voiceover

---

## File Checklist

Before you start, you should have:

- ✅ `v3_tutorial_script.md` — Full script with timings
- ✅ `v3_tutorial_elevenlabs_batch.json` — ElevenLabs batch file
- ✅ `v3_tutorial_captions.vtt` — WebVTT captions
- ✅ `v3_tutorial_timing.md` — Editor timing guide

You'll create:

- 📹 `screen_recording.mp4` (9:30, 1920x1080)
- 🎙️ `voiceover_combined.mp3` (9:30, merged from ElevenLabs sections)
- 📝 `v3_tutorial_captions.vtt` (already created)
- 🎬 `v3_tutorial_final.mp4` (video + audio + captions, ready to deploy)

---

## Troubleshooting

### Audio doesn't sync with video

1. Check the ElevenLabs batch file — sections should have correct timing
2. Use a video editor (DaVinci, Final Cut) to manually sync
3. Re-export with correct audio/video sync

### Captions appear too fast or too slow

1. The `.vtt` file was auto-generated from script timings
2. If actual voiceover is faster/slower, manually adjust timings in the `.vtt` file
3. Use a text editor to adjust the timestamps

### Video file is too large

1. Use FFmpeg to re-encode:
   ```bash
   ffmpeg -i v3_tutorial.mp4 \
          -c:v libx264 \
          -preset fast \
          -crf 23 \
          -c:a aac \
          v3_tutorial_compressed.mp4
   ```

2. Or upload to a CDN (Cloudflare, AWS S3) with streaming

### Captions don't appear in video player

1. Check that `.vtt` file is in the same directory as `.mp4`
2. Use WebVTT format (not SRT)
3. Test in HTML5 video player:
   ```html
   <video controls>
     <source src="video.mp4" type="video/mp4" />
     <track kind="captions" src="captions.vtt" />
   </video>
   ```

---

## Accessibility Checklist

✅ **Captions** — WebVTT file synchronized with audio
✅ **Audio description** — Voiceover describes visual steps
✅ **Clear pacing** — Slower speed (0.9x) for accessibility
✅ **High contrast** — Captions in light text on dark background
✅ **Keyboard navigation** — HTML5 video player supports keyboard
✅ **Transcript** — Full script available at `/docs/V3-TEST-HOWTO.md`

---

## Next Steps

1. Generate voice-overs via ElevenLabs
2. Record screen video following the timing guide
3. Merge audio + video in your editor
4. Add captions
5. Upload to `/public/videos/`
6. Create `/app/test/video/page.tsx`
7. Test playback and caption sync
8. Commit and deploy

**Questions?** See the video script (`v3_tutorial_script.md`) or full how-to guide (`/docs/V3-TEST-HOWTO.md`).

---

**Expected time to completion:** 1-2 hours (including ElevenLabs generation and video editing)
