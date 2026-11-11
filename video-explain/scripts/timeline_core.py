"""Topic-neutral chapter and anchor protocol. Times come only from recorded words."""
import hashlib
import json
import math
from pathlib import Path
from captions import build_cues, normalize


def write_changed(path, value):
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8')


def build_timeline(project, cfg, state, scene):
    duration = state['duration']
    if scene.get('schema') != 'explain-v1':
        raise ValueError('未知时间线协议；新主题使用 explain-v1')
    definitions = scene.get('anchors', {})
    anchors, resolving = {}, set()
    segments = {s['id']: s for s in state['segments']}

    def number(value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('时间偏移必须是有限数字')
        return value

    def resolve(ref):
        if not isinstance(ref, dict):
            raise ValueError('时间引用必须是对象，不能填写估算秒数')
        modes = [key for key in ('anchor', 'audio_start', 'audio_end', 'segment') if key in ref]
        if len(modes) != 1:
            raise ValueError(f'时间引用须且仅须一个来源：{ref}')
        mode = modes[0]
        if mode == 'anchor':
            key = ref['anchor']
            if key not in definitions or key in resolving:
                raise ValueError(f'缺失或循环锚点：{key}')
            if key not in anchors:
                resolving.add(key)
                anchors[key] = resolve(definitions[key])
                resolving.remove(key)
            value = anchors[key]
        elif mode in ('audio_start', 'audio_end'):
            if ref[mode] is not True:
                raise ValueError('音轨边界引用必须为 true')
            value = 0 if mode == 'audio_start' else duration
        else:
            if ref['segment'] not in segments:
                raise ValueError(f'缺少配音分段：{ref["segment"]}')
            seg = segments[ref['segment']]
            edge = ref.get('edge', 'start')
            if edge not in ('start', 'end'):
                raise ValueError('edge只能为start或end')
            if 'phrase' not in ref:
                value = seg[edge]
            else:
                chars = [(c, w) for w in seg['words'] for c in normalize(w['字'])]
                full = ''.join(c for c, _ in chars)
                phrase = normalize(ref['phrase'])
                starts = [i for i in range(len(full)) if phrase and full.startswith(phrase, i)]
                occurrence = ref.get('occurrence')
                if occurrence is None and len(starts) != 1:
                    raise ValueError(f'词组须唯一，或明确 occurrence（从1起）：{ref}')
                occurrence = 1 if occurrence is None else occurrence
                if isinstance(occurrence, bool) or not isinstance(occurrence, int) or not 1 <= occurrence <= len(starts):
                    raise ValueError(f'无效词组或 occurrence：{ref}')
                start = starts[occurrence - 1]
                word = chars[start if edge == 'start' else start + len(phrase) - 1][1]
                value = word['开始' if edge == 'start' else '结束']
        value = number(value) + number(ref.get('offset', 0))
        if not -.000001 <= value <= duration + .000001:
            raise ValueError(f'时间锚点超出音轨：{ref}')
        return round(max(0, min(duration, value)), 6)

    for key in definitions:
        resolve({'anchor': key})
    chapters, ids = [], set()
    for chapter in scene.get('chapters', []):
        key = chapter['id']
        if not isinstance(key, str) or not key or key in ids:
            raise ValueError('章节ID必须是非空且唯一的字符串')
        ids.add(key)
        a, b = resolve(chapter['start']), resolve(chapter['end'])
        if b <= a or abs(a - (chapters[-1]['end'] if chapters else 0)) > .000002:
            raise ValueError('章节必须按顺序连续覆盖音轨，无空隙或重叠')
        chapters.append({'id': key, 'title': chapter.get('title', ''), 'start': a, 'end': b})
    if not chapters or abs(chapters[-1]['end'] - duration) > .000002:
        raise ValueError('章节必须覆盖完整音轨；最后使用 audio_end')
    checks = []
    for rule in scene.get('constraints', []):
        before, after = resolve(rule['before']), resolve(rule['after'])
        gap = number(rule.get('min_gap', 0))
        if gap < 0 or after + .000001 < before + gap:
            raise ValueError(f'因果先后不满足：{rule.get("id", rule)}')
        checks.append({'id': rule.get('id', ''), 'before': before, 'after': after, 'min_gap': gap})
    cues = build_cues(state, cfg.get('caption_max_chars', 28))
    hashes = {name: hashlib.sha256((project / name).read_bytes()).hexdigest()
              for name in ('voice.json', 'audio-state.json', 'scene.json')}
    result = {'schema': 'explain-v1', 'recipe': state['recipe'], 'duration': duration,
              'audio': state['audio'], 'anchors': anchors, 'chapters': chapters,
              'constraints': checks, 'cues': cues, 'input_hashes': hashes}
    write_changed(project / 'timeline.json', result)
    write_changed(project / '字幕.json', {'audio': state['audio'], 'duration': duration, 'cues': cues})

    def stamp(t):
        n = round(t * 1000)
        return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
    write_changed(project / '字幕.srt', '\n\n'.join(
        f'{i}\n{stamp(a)} --> {stamp(b)}\n{text}' for i, (a, b, text) in enumerate(cues, 1)) + '\n')
    return result
