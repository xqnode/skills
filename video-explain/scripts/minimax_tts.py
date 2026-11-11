"""MiniMax non-streaming synthesis, retaining original word timings and audio."""
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import wave
from captions import normalize

ENDPOINT = 'https://api.minimax.cn/v1/t2a_v2'


def get_key(name):
    value = os.environ.get(name)
    if not value and os.name == 'nt':
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as registry:
                value = winreg.QueryValueEx(registry, name)[0]
        except FileNotFoundError:
            pass
    if not value or not value.strip():
        raise ValueError(f'未找到指定凭据变量 {name}，未切换其他付费凭据')
    return value.strip()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_words(subtitles, text, duration):
    # Official T2ASubtitleWord times are milliseconds relative to this synthesis.
    if not isinstance(subtitles, list):
        raise ValueError('MiniMax字幕文件结构不是分段数组，保留原始文件后核实协议')
    words = []
    for sentence in subtitles:
        if not isinstance(sentence, dict) or not isinstance(sentence.get('timestamped_words'), list):
            raise ValueError('未返回词时间，不能用句时间均分补齐')
        for word in sentence['timestamped_words']:
            start, end = word['time_begin']/1000, word['time_end']/1000
            if not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end <= duration+.001:
                raise ValueError('MiniMax词时间超出实际音频或范围无效')
            words.append({'字':word['word'], '开始':start, '结束':end})
    if not words or normalize(''.join(w['字'] for w in words)) != normalize(text):
        raise ValueError('MiniMax词时间未覆盖显示正文，需要核对发音归一化或显式映射')
    if any(a['开始'] > b['开始'] for a,b in zip(words,words[1:])):
        raise ValueError('MiniMax词时间顺序异常')
    return words


def synthesize(request, display_text, output, key_env):
    key = get_key(key_env)
    output.mkdir(parents=True, exist_ok=True)
    save(output/'合成参数.json', {'endpoint':ENDPOINT, 'payload':request, 'credential_env':key_env})
    req = urllib.request.Request(ENDPOINT, data=json.dumps(request).encode(),
        headers={'Authorization':'Bearer '+key, 'Content-Type':'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        save(output/'接口错误.json', {'http_status':error.code})
        raise ValueError(f'MiniMax HTTP {error.code}，停止，不自动重试') from None
    data = result.get('data') or {}
    encoded = data.pop('audio', None)
    save(output/'时间戳原始记录.json', result)
    status = result.get('base_resp') or {}
    if status.get('status_code') != 0 or not encoded:
        raise ValueError(f'MiniMax合成失败，业务状态 {status.get("status_code")}；参见原始记录，不自动重试')
    # WAV avoids lossy codec priming in the alignment source; standardize explicitly.
    (output/'原始音频.wav').write_bytes(bytes.fromhex(encoded))
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(output/'原始音频.wav'),
        '-ac','1','-ar','24000','-c:a','pcm_s16le',str(output/'配音.wav')],check=True)
    with wave.open(str(output/'配音.wav'), 'rb') as wav:
        duration = wav.getnframes()/wav.getframerate()
    words, issues = [], []
    try:
        url = data.get('subtitle_file')
        if not url or urllib.parse.urlparse(url).scheme != 'https':
            raise ValueError('未返回HTTPS字幕链接')
        with urllib.request.urlopen(url,timeout=30) as response:
            subtitles = json.load(response)
        save(output/'字幕原始记录.json',subtitles)
        words = parse_words(subtitles,display_text,duration)
    except (ValueError,KeyError,TypeError,OSError) as error:
        # Do not regenerate paid audio just because subtitle retrieval/validation failed.
        issues = [str(error) if isinstance(error,ValueError) else type(error).__name__]
    save(output/'时间.json', {'时间单位':'秒','时间来源':'MiniMax服务端词时间（毫秒转换为秒，保留完整词跨度）',
        '总时长':duration,'可用于对齐':not issues,'校验问题':issues,'逐字':words})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request',type=Path,required=True)
    parser.add_argument('--text',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--key-env',default='MINIMAX_TOKEN_PLAN')
    args = parser.parse_args()
    try:
        synthesize(json.loads(args.request.read_text(encoding='utf-8-sig')),
            args.text.read_text(encoding='utf-8-sig').strip(),args.output,args.key_env)
    except (ValueError,urllib.error.URLError) as error:
        raise SystemExit(str(error)) from None
