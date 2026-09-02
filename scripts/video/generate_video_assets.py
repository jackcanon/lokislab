#!/usr/bin/env python3
"""
V3 Tutorial Video Generator
Coordinates voice-over generation via ElevenLabs and caption generation
"""

import os
import json
import subprocess
from pathlib import Path
from datetime import timedelta

class VideoSection:
    def __init__(self, name, duration_seconds, voiceover_text, start_time=0):
        self.name = name
        self.duration = duration_seconds
        self.voiceover = voiceover_text
        self.start_time = start_time
        self.end_time = start_time + duration_seconds
    
    def __repr__(self):
        return f"{self.name} ({self.duration}s, {self.format_time(self.start_time)} - {self.format_time(self.end_time)})"
    
    @staticmethod
    def format_time(seconds):
        """Format seconds as MM:SS"""
        mins, secs = divmod(int(seconds), 60)
        return f"{mins:02d}:{secs:02d}"

def load_script(script_path):
    """Parse the video script into sections"""
    with open(script_path) as f:
        content = f.read()
    
    sections = []
    current_time = 0
    
    # Extract sections from script (SECTION X: name format)
    import re
    section_pattern = r'## SECTION (\d+): ([^\(]+)\(([^)]+)\)'
    voiceover_pattern = r'\*\*VOICEOVER:\*\*\n\n"([^"]+)"'
    
    for match in re.finditer(section_pattern, content):
        section_num = int(match.group(1))
        section_name = match.group(2).strip()
        duration_str = match.group(3).strip()
        
        # Parse duration like "30 seconds" or "1 minute"
        duration = parse_duration(duration_str)
        
        # Find voiceover for this section
        section_start = match.end()
        next_section = re.search(r'## SECTION \d+:', content[section_start:])
        section_end = section_start + next_section.start() if next_section else len(content)
        section_content = content[section_start:section_end]
        
        voiceover_match = re.search(voiceover_pattern, section_content, re.DOTALL)
        voiceover = voiceover_match.group(1) if voiceover_match else ""
        
        sections.append(VideoSection(
            name=f"{section_num}: {section_name}",
            duration_seconds=duration,
            voiceover_text=voiceover,
            start_time=current_time
        ))
        current_time += duration
    
    return sections

def parse_duration(duration_str):
    """Parse duration strings like '30 seconds' or '1 minute' or '1.5 minutes'"""
    import re
    match = re.match(r'([\d.]+)\s+(second|minute)', duration_str.lower())
    if match:
        value = float(match.group(1))
        unit = match.group(2)
        return int(value * 60) if unit == 'minute' else int(value)
    return 0

def generate_vtt_captions(sections):
    """Generate WebVTT caption file from sections"""
    vtt_lines = ["WEBVTT", "", "Kind: captions", "Language: en", ""]
    
    for section in sections:
        # Add section header as caption
        start_time = format_vtt_time(section.start_time)
        end_time = format_vtt_time(section.start_time + 2)  # Brief header
        vtt_lines.append(f"{start_time} --> {end_time}")
        vtt_lines.append(f"<v Narrator> {section.name}")
        vtt_lines.append("")
        
        # Add voiceover as captions (chunked into readable lines)
        voiceover_lines = chunk_text_for_captions(section.voiceover, max_chars=80)
        
        # Distribute voiceover lines across the section duration
        line_duration = section.duration / max(len(voiceover_lines), 1)
        
        for i, line in enumerate(voiceover_lines):
            line_start = section.start_time + (i * line_duration)
            line_end = section.start_time + ((i + 1) * line_duration)
            
            vtt_start = format_vtt_time(line_start)
            vtt_end = format_vtt_time(line_end)
            
            vtt_lines.append(f"{vtt_start} --> {vtt_end}")
            vtt_lines.append(line)
            vtt_lines.append("")
    
    return "\n".join(vtt_lines)

def format_vtt_time(seconds):
    """Format time for WebVTT (HH:MM:SS.mmm)"""
    hours, remainder = divmod(int(seconds), 3600)
    minutes, secs = divmod(remainder, 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def chunk_text_for_captions(text, max_chars=80):
    """Split text into readable caption lines"""
    lines = text.split('\n')
    chunked = []
    
    for line in lines:
        if len(line) <= max_chars:
            chunked.append(line)
        else:
            # Split on sentences or words
            words = line.split()
            current_chunk = []
            
            for word in words:
                if len(' '.join(current_chunk + [word])) <= max_chars:
                    current_chunk.append(word)
                else:
                    if current_chunk:
                        chunked.append(' '.join(current_chunk))
                    current_chunk = [word]
            
            if current_chunk:
                chunked.append(' '.join(current_chunk))
    
    return chunked

def generate_elevenlabs_script(sections, output_file):
    """Generate JSON for ElevenLabs batch processing"""
    tasks = []
    
    for section in sections:
        # Clean up voiceover text (remove quotes, markdown)
        clean_text = section.voiceover.strip('"').replace('**', '').replace('`', '')
        
        tasks.append({
            "text": clean_text,
            "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel (friendly, clear) — customize as needed
            "model_id": "eleven_monolingual_v1",
            "output_format": "mp3_22050_32",
            "speed": 0.9,  # Slightly slower for clarity
            "stability": 0.5,  # Medium stability
            "similarity_boost": 0.75,  # Natural sounding
            "speaker_boost": True
        })
    
    with open(output_file, 'w') as f:
        json.dump({"tasks": tasks}, f, indent=2)
    
    print(f"✓ ElevenLabs batch script saved to {output_file}")
    print(f"  {len(tasks)} sections ready for voice generation")
    print(f"\n  Upload to ElevenLabs API or use CLI:")
    print(f"    elevenlabs --input {output_file} --output-dir ./voiceovers/")

def generate_timing_guide(sections, output_file):
    """Generate a timing guide for video editors"""
    guide_lines = ["# V3 Tutorial — Video Timing Guide\n"]
    total_time = sections[-1].end_time if sections else 0
    
    guide_lines.append(f"Total Duration: {VideoSection.format_time(total_time)}\n")
    guide_lines.append("## Section Timing\n")
    
    for section in sections:
        guide_lines.append(f"- {section.name}")
        guide_lines.append(f"  Start: {VideoSection.format_time(section.start_time)}")
        guide_lines.append(f"  End: {VideoSection.format_time(section.end_time)}")
        guide_lines.append(f"  Duration: {section.duration}s\n")
    
    with open(output_file, 'w') as f:
        f.writelines(guide_lines)
    
    print(f"✓ Timing guide saved to {output_file}")

def main():
    script_dir = Path(__file__).parent
    script_file = script_dir / "v3_tutorial_script.md"
    
    if not script_file.exists():
        print(f"❌ Script file not found: {script_file}")
        return 1
    
    print("📹 V3 Tutorial Video Generator")
    print("=" * 50)
    
    # Load and parse script
    print(f"\n📖 Loading script: {script_file}")
    sections = load_script(str(script_file))
    
    print(f"✓ Found {len(sections)} sections:")
    for section in sections:
        print(f"  {section}")
    
    # Generate outputs
    output_dir = script_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # WebVTT captions
    print(f"\n📝 Generating captions...")
    vtt_file = output_dir / "v3_tutorial_captions.vtt"
    vtt_content = generate_vtt_captions(sections)
    with open(vtt_file, 'w') as f:
        f.write(vtt_content)
    print(f"✓ Captions saved to {vtt_file}")
    
    # ElevenLabs batch
    print(f"\n🎙️  Generating ElevenLabs batch script...")
    elevenlabs_file = output_dir / "v3_tutorial_elevenlabs_batch.json"
    generate_elevenlabs_script(sections, str(elevenlabs_file))
    
    # Timing guide
    print(f"\n⏱️  Generating timing guide...")
    timing_file = output_dir / "v3_tutorial_timing.md"
    generate_timing_guide(sections, str(timing_file))
    
    # Summary
    total_duration = sections[-1].end_time if sections else 0
    print(f"\n✨ Video Generation Complete")
    print(f"   Total Duration: {VideoSection.format_time(total_duration)}")
    print(f"   Sections: {len(sections)}")
    print(f"\n📊 Next Steps:")
    print(f"   1. Use ElevenLabs API to generate voiceovers from {elevenlabs_file.name}")
    print(f"   2. Record screen video using the timing guide in {timing_file.name}")
    print(f"   3. Merge voiceover + screen video in editor (ffmpeg, DaVinci, etc)")
    print(f"   4. Add captions from {vtt_file.name}")
    print(f"   5. Export MP4 and host on lokislab.org/test/video")
    
    return 0

if __name__ == '__main__':
    exit(main())
