#!/usr/bin/env python3
"""
Generate wordmap.json from WLASL dataset
Maps words (glosses) to local video file paths
"""

import json
import os
from pathlib import Path

# Paths
DATASET_PATH = "/home/8231k/Downloads/archive (1)"
WLASL_JSON = os.path.join(DATASET_PATH, "WLASL_v0.3.json")
VIDEOS_DIR = os.path.join(DATASET_PATH, "videos")
OUTPUT_FILE = "/home/8231k/Desktop/extension/data/wordmap.json"

def generate_wordmap():
    """Generate wordmap from WLASL dataset"""
    
    # Load WLASL data
    print(f"Loading {WLASL_JSON}...")
    with open(WLASL_JSON, 'r') as f:
        wlasl_data = json.load(f)
    
    # Get available video files
    print(f"Scanning videos directory...")
    available_videos = set()
    for video_file in os.listdir(VIDEOS_DIR):
        if video_file.endswith('.mp4'):
            video_id = video_file.replace('.mp4', '')
            available_videos.add(video_id)
    
    print(f"Found {len(available_videos)} video files")
    
    # Build wordmap
    wordmap = {
        "_fallback": f"file://{VIDEOS_DIR}/00335.mp4",
        "_comment": "The _fallback video is shown when a word is not found in the dictionary"
    }
    
    matched_count = 0
    for entry in wlasl_data:
        gloss = entry.get('gloss', '').lower().strip()
        if not gloss:
            continue
        
        # Find first available video instance for this gloss
        instances = entry.get('instances', [])
        for instance in instances:
            video_id = instance.get('video_id', '')
            if video_id in available_videos:
                # Use local file path
                video_path = f"file://{VIDEOS_DIR}/{video_id}.mp4"
                wordmap[gloss] = video_path
                matched_count += 1
                break
    
    print(f"Matched {matched_count} words to videos")
    
    # Write output
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(wordmap, f, indent=2)
    
    print("Done!")
    print(f"Total entries in wordmap: {len(wordmap) - 2}")  # Exclude _fallback and _comment

if __name__ == '__main__':
    generate_wordmap()
