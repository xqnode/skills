"""Build readable captions from source text and real service timing; never interpolate."""
import re

TAIL = '。，！？；：、,.!?;:…'


def normalize(text):
    return ''.join(c.upper() for c in text if c.isalnum())


def pieces(text, limit):
    # 「」用来标出引用的原话，保留（句尾的 」 也保留）；只去掉装饰性的中文弯引号
    text = ' '.join(text.translate(str.maketrans('', '', '“”')).split())
    # Consume closing quotation marks with their sentence, never as a discarded
    # punctuation-only fragment (e.g. 他说「不要引入新依赖。」).
    sentences = re.findall(r'.+?(?:[。！？；]+[」』）)]*[。！？；]*|$)', text)
    for sentence in sentences:
        sentence = sentence.strip()
        while len(sentence) > limit:
            stops = [i + 1 for i, c in enumerate(sentence[:limit]) if c in '，：、 ' and i >= 6]
            cut = stops[-1] if stops else limit
            if len(sentence) - cut < 6:
                earlier = [n for n in stops if len(sentence) - n >= 6]
                cut = earlier[-1] if earlier else min(limit, max(8, len(sentence) // 2))
            while cut > 1 and sentence[cut - 1].isascii() and sentence[cut].isascii() and sentence[cut - 1].isalnum() and sentence[cut].isalnum():
                cut -= 1
            if cut <= 1:
                raise ValueError('字幕含超长英文词或代码，需单独设计显示方式')
            while cut > 1 and not normalize(sentence[cut:]):
                cut -= 1
            while cut > 1 and sentence[cut] in '」』）)':
                cut -= 1
            yield sentence[:cut]
            sentence = sentence[cut:].strip()
        if sentence:
            yield sentence


def build_cues(state, limit=28):
    if not isinstance(limit, int) or not 12 <= limit <= 40:
        raise ValueError('字幕字符上限应为12～40；仍需检查实际像素宽度')
    cues = []
    for segment in state['segments']:
        chars = [(c, w) for w in segment['words'] for c in normalize(w['字'])]
        if ''.join(c for c, _ in chars) != normalize(segment['text']):
            raise ValueError(f'{segment["id"]} 时间文字与正文不一致')
        position = 0
        for text in pieces(segment['text'], limit):
            count = len(normalize(text))
            if not count:
                continue
            records = chars[position:position + count]
            position += count
            start, end = records[0][1]['开始'], records[-1][1]['结束']
            text = text.rstrip(TAIL).strip()
            text = re.sub('[' + re.escape(TAIL) + r']+(?=[」』）)]*$)', '', text)
            # If a service token straddles a proposed cut, retain its real full span.
            if cues and start < cues[-1][1] - .000001:
                cues[-1][1] = max(end, cues[-1][1])
                cues[-1][2] += '，' + text
            else:
                cues.append([start, end, text])
    if normalize(''.join(c[2] for c in cues)) != normalize(''.join(s['text'] for s in state['segments'])):
        raise ValueError('字幕没有完整覆盖正文')
    if not cues or any(not 0 <= a < b <= state['duration'] + .000001 for a, b, _ in cues):
        raise ValueError('字幕时间缺失或超出音轨')
    if any(len(text) > limit for _, _, text in cues):
        raise ValueError('真实时间粒度不足以生成适宽字幕，需调整分段或显示设计，不均分时间')
    return cues
