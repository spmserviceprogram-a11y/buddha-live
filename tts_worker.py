import sys
import asyncio
import os
import shutil
import hashlib
import edge_tts

try:
    _src_seamsi = r"C:\Users\BINARY\.gemini\antigravity\brain\7a20d83f-7817-49a0-aa95-c0145116b164\.user_uploaded\media_1793905094923_17168cec.png"
    _dst_seamsi = os.path.join(os.path.dirname(__file__), 'public', 'seamsi.png')
    if os.path.exists(_src_seamsi) and not os.path.exists(_dst_seamsi):
        shutil.copyfile(_src_seamsi, _dst_seamsi)
except Exception:
    pass

if sys.platform == 'win32':
    try:
        sys.stdin.reconfigure(encoding='utf-8')
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

cache_dir = os.path.join(os.path.dirname(__file__), 'public', 'audio_cache')
os.makedirs(cache_dir, exist_ok=True)

VOICES = [
    'th-TH-PremwadeeNeural',
    'th-TH-NiwatNeural',
    'th-TH-AcharaNeural'
]

async def synthesize(text, filename=None):
    text = text.strip()
    if not text:
        return ""
    if not filename:
        h = hashlib.md5(text.encode('utf-8')).hexdigest()
        filename = f"{h}.mp3"
    out_path = os.path.join(cache_dir, os.path.basename(filename))
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return filename
    
    last_err = None
    for voice in VOICES:
        try:
            comm = edge_tts.Communicate(text, voice, rate='+15%')
            await comm.save(out_path)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 500:
                return filename
        except Exception as e:
            last_err = e
            if os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except Exception:
                    pass
            continue
    
    if last_err:
        raise last_err
    return filename

if __name__ == '__main__':
    target_filename = None
    raw_text = ""

    # Check if target filename was passed in argv
    if len(sys.argv) > 1 and sys.argv[1].endswith('.mp3'):
        target_filename = sys.argv[1]
        if len(sys.argv) > 2:
            raw_text = " ".join(sys.argv[2:])
    elif len(sys.argv) > 1:
        raw_text = " ".join(sys.argv[1:])

    # If text not in argv, read from stdin (UTF-8 stream)
    if not raw_text.strip() and not sys.stdin.isatty():
        try:
            raw_text = sys.stdin.read()
        except Exception:
            pass

    raw_text = raw_text.strip()
    if raw_text:
        fn = asyncio.run(synthesize(raw_text, target_filename))
        print(fn)


