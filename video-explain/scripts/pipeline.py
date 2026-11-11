"""Initialize a video, synthesize reusable voice segments, and align its storyboard."""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import shutil
import subprocess
import sys
import wave
from captions import build_cues
from timeline_core import build_timeline

SKILL = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:20]


def normalize(text):
    return ''.join(c.upper() for c in text if c.isalnum())


def config(project):
    for name in ['稿子.txt', '读法规则.md', '配音设置.md', '画面要求.md']:
        if not (project/name).is_file():
            raise ValueError(f'缺少 {name}')
    cfg = read(project/'voice.json')
    provider = cfg.get('provider', 'doubao' if 'resource' in cfg else 'minimax')
    if provider not in ('doubao','minimax'):
        raise ValueError('不支持的语音平台，尚未调用接口')
    if provider == 'doubao':
        if not isinstance(cfg.get('context'), str) or not cfg['context'].strip():
            raise ValueError('先把读法设计落实到 voice.json 的 context')
        if isinstance(cfg.get('speech_rate'), bool) or not isinstance(cfg.get('speech_rate'), int) or not -50 <= cfg['speech_rate'] <= 100:
            raise ValueError('豆包 speech_rate 必须为-50～100整数')
    else:
        if 'context' in cfg or any('context' in s for s in cfg['segments']):
            raise ValueError('MiniMax未实现独立context指导；请在读法文件记录设计，以已支持的参数执行')
        speed = cfg.get('speed',1)
        if isinstance(speed,bool) or not isinstance(speed,(int,float)) or not math.isfinite(speed) or not .5 <= speed <= 2:
            raise ValueError('MiniMax speed必须为0.5～2，正常为1')
        if not cfg.get('voice_id') or not cfg.get('model'):
            raise ValueError('MiniMax缺少voice_id或model')
    if isinstance(cfg.get('gain_db'), bool) or not isinstance(cfg.get('gain_db'), (float, int)) or not math.isfinite(cfg['gain_db']):
        raise ValueError('gain_db 必须为有限数值')
    limit = cfg.get('caption_max_chars',28)
    if isinstance(limit,bool) or not isinstance(limit,int) or not 12 <= limit <= 40:
        raise ValueError('caption_max_chars必须为12～40整数，先修订配置')
    segments = cfg['segments']
    if not segments or len({s['id'] for s in segments}) != len(segments):
        raise ValueError('分段不能为空，id 必须唯一')
    for s in segments:
        if not re.fullmatch(r'[A-Za-z0-9_-]+', s['id']):
            raise ValueError('分段id只使用字母、数字、下划线或连字符')
        if not s['text'].strip() or not isinstance(s['pause_after'], (int, float)) or not math.isfinite(s['pause_after']) or not 0 <= s['pause_after'] <= 3:
            raise ValueError('分段正文为空或额外停顿超出 0～3 秒；先修订配置')
    compact = lambda text: re.sub(r'\s+', '', text)
    if compact((project/'稿子.txt').read_text(encoding='utf-8-sig')) != compact(''.join(s['text'] for s in segments)):
        raise ValueError('稿子.txt 与 voice.json 正文不一致，尚未调用接口')
    return cfg


def initialize(project, demo):
    project = project.resolve()
    if project.exists():
        raise ValueError('目标目录已存在，不覆盖已有视频；指定新的目录')
    if not demo:
        shutil.copytree(SKILL/'assets/explain-project', project)
        shutil.copyfile(SKILL/'assets/explain-kit/explain-kit.js', project/'explain-kit.js')
        shutil.copyfile(SKILL/'assets/explain-kit/自审模板.md', project/'自审.md')
        shutil.copytree(SKILL/'assets/handdrawn-project/assets/fonts', project/'assets/fonts')
        print(f'已创建 {project}；先确认文稿、填写voice.json，再按已审分镜实现scenes.js')
        return
    shutil.copytree(SKILL/'assets/handdrawn-project', project)
    shutil.copyfile(project/'assets/demo/voice.json',project/'voice.json')
    print(f'已创建 {project}；包含历史示例音频，仅作兼容研究')


def synthesis_request(cfg, segment):
    provider = cfg.get('provider', 'doubao' if 'resource' in cfg else 'minimax')
    if provider == 'doubao':
        request = {key:cfg[key] for key in ['speaker','resource','speech_rate']}
        request.update(text=segment['text'],context=segment.get('context',cfg['context']))
        return provider, request
    text = segment.get('synthesis_text',segment['text'])
    for mark in re.finditer(r'<#(\d+(?:\.\d{1,2})?)#>',text):
        if not .01 <= float(mark[1]) <= 99.99 or not normalize(text[:mark.start()]) or not normalize(text[mark.end():]):
            raise ValueError('MiniMax停顿须在可发音文本之间，范围0.01～99.99秒')
    if re.search(r'#>\s*<#',text):
        raise ValueError('不能连续使用MiniMax停顿标记')
    stripped = re.sub(r'<#(?:\d+(?:\.\d{1,2})?)#>', '', text)
    if re.sub(r'\s+','',stripped) != re.sub(r'\s+','',segment['text']):
        raise ValueError('synthesis_text只允许增加停顿标记，不可混入指导或擅改正文')
    speed = segment.get('speed',cfg.get('speed',1))
    if isinstance(speed,bool) or not isinstance(speed,(int,float)) or not math.isfinite(speed) or not .5 <= speed <= 2:
        raise ValueError('MiniMax分段speed必须为0.5～2')
    voice = {'voice_id':cfg['voice_id'],'speed':speed,'vol':1,'pitch':0}
    emotion = segment.get('emotion',cfg.get('emotion'))
    if emotion:
        if emotion not in ['happy','sad','angry','fearful','disgusted','surprised','calm']:
            raise ValueError('当前MiniMax适配不支持此情绪，不编造技术讲解标签')
        voice['emotion'] = emotion
    request = {'model':cfg['model'],'text':text,'stream':False,'voice_setting':voice,
        'audio_setting':{'sample_rate':32000,'format':'wav','channel':1},
        'subtitle_enable':True,'subtitle_type':'word','output_format':'hex'}
    if cfg.get('pronunciation_dict'):
        request['pronunciation_dict'] = cfg['pronunciation_dict']
    return provider, request


def audio(project, sample):
    cfg = config(project)
    if cfg.get('draft'):
        raise ValueError('初始化文稿仍是占位草稿；确认正文并将voice.json的draft设为false后再合成')
    chosen = cfg['segments']
    if sample:
        chosen = [s for s in chosen if s['id'] == sample]
        if not chosen:
            raise ValueError('试听分段 id 不存在')
    pcm, words, segments, alignment_issues = bytearray(), [], [], []
    # Validate every request before making any paid call, including sample requests.
    requests = {s['id']:synthesis_request(cfg,s) for s in cfg['segments']}
    for segment in chosen:
        provider, request = requests[segment['id']]
        cache = project/'assets/voice-cache'/digest(request)
        cached = cache/'request-signature.json'
        valid = cached.exists() and read(cached) == request and all((cache/name).is_file() for name in ['配音.wav', '时间.json', '合成参数.json', '时间戳原始记录.json'])
        if not valid:
            cache.mkdir(parents=True, exist_ok=True)
            textfile = cache/'正文.txt'
            textfile.write_text(segment['text'], encoding='utf-8')
            if provider == 'doubao':
                subprocess.run([sys.executable, str(SKILL/'scripts/volcengine_tts.py'),
                    '--text', str(textfile), '--output', str(cache), '--speaker', cfg['speaker'],
                    '--resource', cfg['resource'], '--speech-rate', str(cfg['speech_rate']),
                    '--context', request['context']], check=True)
            else:
                save(cache/'request-payload.json',request)
                subprocess.run([sys.executable,str(SKILL/'scripts/minimax_tts.py'),
                    '--request',str(cache/'request-payload.json'),'--text',str(textfile),
                    '--output',str(cache),'--key-env',cfg.get('api_key_env','MINIMAX_TOKEN_PLAN')],check=True)
            save(cached, request)
        timing = read(cache/'时间.json')
        if not timing['可用于对齐']:
            alignment_issues.append({'segment':segment['id'],'issues':timing.get('校验问题',[])})
        if not sample and (not timing['可用于对齐'] or normalize(''.join(w['字'] for w in timing['逐字'])) != normalize(segment['text'])):
            raise ValueError(f'{segment["id"]} 时间未覆盖正文，停止拼接')
        with wave.open(str(cache/'配音.wav'), 'rb') as wav:
            if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, 24000):
                raise ValueError('音频规格不匹配')
            data = wav.readframes(wav.getnframes())
        offset = len(pcm)/48000
        shifted = [{'字':w['字'], '开始':round(w['开始']+offset, 6), '结束':round(w['结束']+offset, 6)} for w in timing['逐字']]
        # 六位小数的字时间与24kHz采样位置比较时，允许一微秒舍入误差。
        if any(not offset-.000001 <= w['开始'] <= w['结束'] <= offset+len(data)/48000+.000001 for w in shifted):
            raise ValueError('时间超出对应音频')
        words.extend(shifted)
        segments.append({'id':segment['id'], 'text':segment['text'], 'start':offset,
            'end':offset+len(data)/48000, 'words':shifted, 'pause_after':segment['pause_after'],
            'cache':cache.relative_to(project).as_posix(),
            'speed':request['voice_setting']['speed'] if provider=='minimax' else None})
        pcm.extend(data)
        pcm.extend(bytes(round(segment['pause_after']*24000)*2))
    recipe = digest(cfg)
    out = project/'assets'/('samples' if sample else 'narration')/(recipe+('-'+sample if sample else ''))
    out.mkdir(parents=True, exist_ok=True)
    raw, final = out/'raw.wav', out/'audio.wav'
    with wave.open(str(raw), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000); wav.writeframes(pcm)
    effect = f'volume={float(cfg["gain_db"])}dB,alimiter=limit=0.891251:level=false:latency=true'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',effect,'-c:a','pcm_s16le',str(final)], check=True)
    with wave.open(str(final), 'rb') as wav:
        if wav.getnframes() != len(pcm)//2:
            raise ValueError('后期改变采样长度，停止发布当前音轨')
    state = {'recipe':recipe, 'audio':final.relative_to(project).as_posix(),
        'duration':len(pcm)/48000, 'segments':segments, 'words':words,
        'postprocess':effect, 'accepted':False, 'provider':provider,
        'speech_rate':cfg.get('speech_rate'), 'speed':cfg.get('speed'),
        'alignment_ready':not alignment_issues, 'alignment_issues':alignment_issues}
    save(out/'timing.json', state)
    save(out/'production.json', cfg)
    if not sample:
        save(project/'audio-state.json', state)
    print(json.dumps({'audio':str(final),'duration':state['duration'],'sample':bool(sample)},ensure_ascii=False))


def timeline(project):
    cfg = config(project)
    state = read(project/'audio-state.json')
    if state['recipe'] != digest(cfg):
        raise ValueError('配音配置已变化，先生成新音轨；旧音轨未被重用')
    audio_path = (project/state['audio']).resolve()
    if not audio_path.is_relative_to(project):
        raise ValueError('音轨路径超出视频目录')
    with wave.open(str(audio_path), 'rb') as wav:
        duration = wav.getnframes()/wav.getframerate()
    if abs(duration-state['duration']) > .001:
        raise ValueError('当前音频长度与时间状态不一致')
    if [(s['id'], s['text']) for s in state['segments']] != [(s['id'], s['text']) for s in cfg['segments']]:
        raise ValueError('时间状态与当前分段不一致')
    for segment in state['segments']:
        records = segment['words']
        if not records or any(not segment['start']-.000001 <= w['开始'] < w['结束'] <= segment['end']+.000001 for w in records):
            raise ValueError('字时间为空或超出对应分段')
        if any(a['开始'] > b['开始'] for a, b in zip(records, records[1:])):
            raise ValueError('字时间顺序异常')
    scene = read(project/'scene.json')
    if scene.get('schema') == 'explain-v1':
        build_timeline(project, cfg, state, scene)
        print(f'已按真实词时间生成整片章节、锚点、字幕：{project/"timeline.json"}')
        return
    if 'schema' in scene:
        raise ValueError('未知scene.json协议')
    def at(ref):
        offset = ref.get('offset', 0)
        if ref.get('audio_end'):
            return state['duration'] + offset
        segment = next(s for s in state['segments'] if s['id'] == ref['segment'])
        records = segment['words']
        if ref.get('phrase'):
            chars = [(c,w) for w in records for c in normalize(w['字'])]
            full = ''.join(c for c,_ in chars)
            target = normalize(ref['phrase'])
            if not target or full.count(target) != 1:
                raise ValueError(f'词组必须唯一：{ref}')
            begin = full.index(target)
            records = [w for _,w in chars[begin:begin+len(target)]]
        return (records[-1]['结束'] if ref.get('edge') == 'end' else records[0]['开始']) + offset
    intro = at(scene['intro'])
    local = lambda ref: round(at(ref)-intro,6)
    cues = build_cues(state, cfg.get('caption_max_chars', 28))
    legs = [[local(l['start']),local(l['end']),*l['geometry']] for l in scene['legs']]
    windows = [[local(n['start']),local(n['end'])] for n in scene['notes']]
    if any(b<=a for a,b,*_ in legs) or any(b<=a for a,b in windows):
        raise ValueError('路径或批注时间范围无效')
    if any(a<c_end and c_start<b for i,(a,b) in enumerate(windows) for c_start,c_end in windows[i+1:]):
        raise ValueError('批注窗口重叠，先修订分镜')
    phases = [local(p) for p in scene['phases']]
    if phases != sorted(phases):
        raise ValueError('动作步骤发生倒序')
    events = {key:local(ref) for key,ref in scene['events'].items()}
    absolute_times = [intro] + [intro+t for t in phases] + [intro+t for a,b,*_ in legs for t in (a,b)] + [intro+t for a,b in windows for t in (a,b)] + [intro+t for t in events.values()]
    if any(not math.isfinite(t) or not -.000001 <= t <= state['duration']+.000001 for t in absolute_times):
        raise ValueError('分镜锚点超出当前音轨')
    # 网页请求模板的因果约定；新场景按自身事件协议调整。
    if events['hit'] < legs[1][1] or events['return'] < legs[2][1]:
        raise ValueError('结果早于对应查询或取数动作完成')
    update_end_ref = {**scene['events']['update'], 'edge':'end', 'offset':0}
    update_end = local(update_end_ref)
    if events['update'] < legs[3][1] or events['complete'] < update_end:
        raise ValueError('页面更新或完成标记早于前置动作')
    result = {'duration':state['duration'],'intro':intro,'cues':cues,'phases':phases,'legs':legs,
        'notes':[a for a,b in windows], 'noteWindows':windows,
        'events':events, 'checks':{'update_end':update_end}, 'audio':state['audio']}
    save(project/'timeline.json', result)
    def stamp(t):
        ms=round(t*1000);sec,ms=divmod(ms,1000);minute,sec=divmod(sec,60);hour,minute=divmod(minute,60)
        return f'{hour:02}:{minute:02}:{sec:02},{ms:03}'
    (project/'字幕.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{text}' for i,(a,b,text) in enumerate(cues,1))+'\n',encoding='utf-8')
    print(f'已按真实字时间生成 {project/"timeline.json"}')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['init','audio','timeline'])
    parser.add_argument('--project',type=Path,required=True)
    parser.add_argument('--demo',action='store_true',help='初始化时包含已验收示例音频，不调用API')
    parser.add_argument('--sample',help='仅生成指定分段试听，不替换当前完整音轨')
    args=parser.parse_args();project=args.project.resolve()
    if args.action=='init':initialize(project,args.demo)
    elif args.action=='audio':audio(project,args.sample)
    else:timeline(project)


if __name__=='__main__':
    try:main()
    except (ValueError,StopIteration,FileNotFoundError) as exc:
        raise SystemExit(f'停止：{exc}') from None
