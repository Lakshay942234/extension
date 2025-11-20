# Quick Reference - Fallback System

## Summary

✅ **Fallback system is ACTIVE and configured**

## What Happens Now

### For Words in Dictionary
- Uses the specific video for that word
- Example: "hello" → hello.mp4

### For Words NOT in Dictionary
- Uses fallback video (currently "sorry" sign)
- Example: "unknownword" → sorry.mp4

### Preview Indicators
- ✅ Green/Normal URL = Word found
- ⚠️ Orange warning = Using fallback (word not found)
- ❌ Red error = No video available (only if fallback disabled)

## Current Configuration

```json
"_fallback": "https://media.signbsl.com/videos/asl/startasl/mp4/sorry.mp4"
```

**Fallback Video Status**: ✅ Working (HTTP 200)

## Quick Test

1. Open extension popup
2. Type: "hello testword"
3. Preview shows:
   - "hello" → normal URL
   - "testword" → ⚠️ fallback warning
4. Generate video → Both included

## Change Fallback

**Via Options:**
1. Right-click extension → Options
2. Edit `"_fallback"` line
3. Save

**Popular alternatives:**
- "what" sign: `/mp4/what.mp4`
- "help" sign: `/mp4/help.mp4`
- "question" mark: `/mp4/question.mp4`

## Disable Fallback

Remove `"_fallback"` line from wordmap.json

---

**Status**: ✅ All working - Ready to use!
