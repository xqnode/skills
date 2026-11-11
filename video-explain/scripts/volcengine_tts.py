"""调用火山现有复刻音色，保存实际音频和服务端时间，不上传克隆素材。"""

import argparse
import base64
import json
import os
import re
from pathlib import Path
import urllib.error
import urllib.request
import uuid
import wave


def get_key():
    key = os.environ.get("DOUBAO_VOINCE_API_KEY")
    if key:
        return key
    # 用户新配置的环境变量未必被当前桌面进程继承，限定读取该指定键。
    if os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as registry:
                return winreg.QueryValueEx(registry, "DOUBAO_VOINCE_API_KEY")[0]
        except FileNotFoundError:
            pass
    raise RuntimeError("未找到 DOUBAO_VOINCE_API_KEY")


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def synthesize(args):
    key = get_key()
    text = args.text.read_text(encoding="utf-8").strip()
    params = {
        "text": text,
        "speaker": args.speaker,
        "audio_params": {"format": "pcm", "sample_rate": 24000, "enable_subtitle": True},
    }
    if args.model:
        params["model"] = args.model
    if args.speech_rate is not None:
        params["audio_params"]["speech_rate"] = args.speech_rate
    additions = {}
    if args.tone_fidelity:
        additions["tone_fidelity"] = True
    if args.context:
        if args.model:
            raise RuntimeError("context_texts 不能与显式 model 同时使用")
        additions["context_texts"] = [args.context]
    if args.tagged_text:
        if args.model != "seed-tts-2.0-expressive":
            raise RuntimeError("语气标签要求表现力增强版模型")
        additions["use_tag_parser"] = True
    if additions:
        params["additions"] = json.dumps(additions)
    payload = {"user": {"uid": "ai-video-test"}, "req_params": params}
    args.output.mkdir(parents=True, exist_ok=True)
    write_json(args.output / "合成参数.json", {"resource_id": args.resource, "payload": payload})
    request = urllib.request.Request(
        "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "X-Api-Key": key,
            "X-Api-Resource-Id": args.resource,
            "X-Api-Request-Id": str(uuid.uuid4()),
            "Content-Type": "application/json",
        },
    )
    audio = bytearray()
    events = []
    finished = False
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            logid = response.headers.get("X-Tt-Logid")
            for raw in response:
                line = raw.decode("utf-8").strip()
                if not line:
                    continue
                event = json.loads(line)
                code = event.get("code", 0)
                if code not in (0, 20000000):
                    raise RuntimeError(f"火山错误 {code}: {event.get('message', '')}")
                if event.get("data"):
                    audio.extend(base64.b64decode(event["data"], validate=True))
                # 保存时间、文本与用量，不保存大段Base64或认证头。
                events.append({k: v for k, v in event.items() if k != "data"})
                if code == 20000000:
                    finished = True
    except urllib.error.HTTPError as error:
        try:
            body = json.loads(error.read())
        except ValueError:
            body = {}
        write_json(args.output / "接口错误.json", {"http_status": error.code, "response": body})
        detail = body.get("header") or body
        raise RuntimeError(f"HTTP {error.code}: {detail.get('code', '')} {detail.get('message', '参见接口错误.json')}") from None
    write_json(args.output / "时间戳原始记录.json", {"logid": logid, "events": events})
    if not finished or not audio:
        raise RuntimeError("未收到完整结束事件或音频为空，未导出试听")
    with wave.open(str(args.output / "配音.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24000)
        output.writeframes(audio)
    duration = len(audio) / 48000
    words = []
    seen = set()
    for event in events:
        sentence = event.get("sentence") or {}
        for word in sentence.get("words", []):
            record = {"字": word["word"], "开始": word["startTime"], "结束": word["endTime"]}
            identity = (record["字"], record["开始"], record["结束"])
            if identity not in seen:
                words.append(record)
                seen.add(identity)
    # 只有真实时间覆盖全文且范围有效时才标记为可用，不能拿缺失记录凑字幕。
    normalize = lambda s: "".join(c for c in s if c.isalnum()).upper()
    issues = []
    if not words:
        issues.append("未返回文字时间")
    spoken_text = re.sub(r"</?cot\b[^>]*>", "", text) if args.tagged_text else text
    if normalize("".join(w["字"] for w in words)) != normalize(spoken_text):
        issues.append("文字时间未覆盖全文")
    if any(not 0 <= w["开始"] <= w["结束"] <= duration for w in words):
        issues.append("部分时间不在音频范围内")
    if any(a["开始"] > b["开始"] for a, b in zip(words, words[1:])):
        issues.append("开始时间顺序异常")
    write_json(args.output / "时间.json", {"音色ID": args.speaker, "资源ID": args.resource, "总时长": round(duration, 6), "时间单位": "秒", "时间来源": "火山API原始返回，保留服务端粒度", "可用于对齐": not issues, "校验问题": issues, "逐字": words})
    print(json.dumps({"音色": args.speaker, "时长": round(duration, 3), "时间条目": len(words), "对齐校验": issues or "通过", "文件": str(args.output / "配音.wav")}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--speaker", default="S_Z08nOIxj2")
    parser.add_argument("--resource", default="seed-icl-2.0")
    parser.add_argument("--model")
    parser.add_argument("--speech-rate", type=int, choices=range(-50, 101), metavar="[-50,100]")
    parser.add_argument("--context", help="TTS 2.0 语音指令，不混入朗读正文")
    parser.add_argument("--tone-fidelity", action="store_true")
    parser.add_argument("--tagged-text", action="store_true", help="解析表现力增强版的cot语气标签")
    args = parser.parse_args()
    try:
        synthesize(args)
    except (RuntimeError, urllib.error.URLError) as error:
        raise SystemExit(str(error)) from None
