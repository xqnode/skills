"""Exercise initialization, MiniMax adapter, cache reuse and real demo without API calls."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

import pipeline
import minimax_tts
from captions import build_cues, normalize


class OfflineChecks(unittest.TestCase):
    def test_init_and_demo(self):
        with tempfile.TemporaryDirectory(prefix='explainer-check-') as root:
            project = (Path(root)/'fresh').resolve()
            with contextlib.redirect_stdout(io.StringIO()):
                pipeline.initialize(project,False)
            cfg = pipeline.config(project)
            self.assertEqual((cfg['provider'],cfg['voice_id'],cfg['speed']),
                ('minimax','Chinese_casual_instructor_nv1',1))
            self.assertFalse(any((project/p).exists() for p in ['字幕.srt','timeline.json','audio-state.json','assets/demo']))
            with self.assertRaises(ValueError):
                pipeline.initialize(project,False)
            # Punctuation affects speech and must not be silently ignored.
            cfg['segments'][0]['text'] = cfg['segments'][0]['text'].replace('，','。')
            pipeline.save(project/'voice.json',cfg)
            with self.assertRaises(ValueError):
                pipeline.config(project)
            demo = (Path(root)/'demo').resolve()
            with contextlib.redirect_stdout(io.StringIO()):
                pipeline.initialize(demo,True)
                pipeline.timeline(demo)
            state = pipeline.read(demo/'audio-state.json')
            self.assertEqual(state['recipe'],pipeline.digest(pipeline.config(demo)))
            self.assertEqual(pipeline.config(demo)['speaker'],'zh_male_taocheng_uranus_bigtts')
            cfg = pipeline.config(demo);cfg['gain_db'] = 7;pipeline.save(demo/'voice.json',cfg)
            with self.assertRaises(ValueError):
                pipeline.timeline(demo)

    def test_minimax_timing_protocol(self):
        words = minimax_tts.parse_words([{'timestamped_words':[
            {'word':'上下文','time_begin':100,'time_end':600},
            {'word':'窗口','time_begin':650,'time_end':900}]}],'上下文窗口',1)
        self.assertEqual(words[0],{'字':'上下文','开始':.1,'结束':.6})
        for rows,text in [([{'text':'上下文窗口','time_begin':0,'time_end':900}],'上下文窗口'),
            ([{'timestamped_words':[{'word':'错误','time_begin':0,'time_end':900}]}],'上下文窗口'),
            ([{'timestamped_words':[{'word':'上下文窗口','time_begin':0,'time_end':2000}]}],'上下文窗口')]:
            with self.assertRaises(ValueError):
                minimax_tts.parse_words(rows,text,1)

    def test_failed_business_status_and_invalid_direction(self):
        cfg={'model':'speech-2.8-hd','voice_id':'Chinese_casual_instructor_nv1','speed':1}
        for text in ['请自然讲解。上下文窗口。','上下文<#100#>窗口。','<#0.5#>上下文窗口。','上下文<#0.5#><#0.5#>窗口。']:
            with self.assertRaises(ValueError):
                pipeline.synthesis_request(cfg,{'text':'上下文窗口。','synthesis_text':text})
        provider,request=pipeline.synthesis_request(cfg,{'text':'上下文窗口。','synthesis_text':'上下文<#0.5#>窗口。'})
        self.assertEqual(provider,'minimax')
        self.assertEqual(request['voice_setting']['speed'],1)
        with tempfile.TemporaryDirectory(prefix='minimax-failure-') as root:
            with patch.object(minimax_tts,'get_key',return_value='OFFLINE_FIXTURE'), \
                 patch.object(minimax_tts.urllib.request,'urlopen',return_value=io.BytesIO(
                    json.dumps({'base_resp':{'status_code':1008},'data':None}).encode())) as call:
                with self.assertRaises(ValueError):
                    minimax_tts.synthesize(request,'上下文窗口。',Path(root),'MINIMAX_TOKEN_PLAN')
                self.assertEqual(call.call_count,1,'business errors must not auto-retry')
                self.assertFalse((Path(root)/'配音.wav').exists())

    def test_caption_coverage_and_coarse_span(self):
        text='前面说过的「不要引入新依赖」，为什么聊久了又没有遵守？需要先区分聊天记录和模型这次收到的上下文。'
        chars=[c for c in text if normalize(c)]
        state={'duration':len(chars)*.15,'segments':[{'id':'a','text':text,'words':[
            {'字':c,'开始':i*.15,'结束':(i+1)*.15} for i,c in enumerate(chars)]}]}
        cues=build_cues(state)
        self.assertGreater(len(cues),1)
        self.assertEqual(normalize(''.join(c[2] for c in cues)),normalize(text))
        self.assertTrue(all(len(c[2])<=28 for c in cues))
        # 引用原话的「」保留；句末标点去掉
        self.assertIn('「不要引入新依赖」',''.join(c[2] for c in cues))
        self.assertTrue(all(c[2][-1] not in '。，！？；：' for c in cues))
        tail={'duration':20*.15,'segments':[{'id':'b','text':'却没有保留「不要引入新依赖」。','words':[
            {'字':c,'开始':i*.15,'结束':(i+1)*.15} for i,c in enumerate(c for c in '却没有保留「不要引入新依赖」。' if normalize(c))]}]}
        self.assertEqual(build_cues(tail)[-1][2],'却没有保留「不要引入新依赖」')
        for source in ['他说「不要引入新依赖。」', '他说「不要引入新依赖！？」。然后继续。', '「一二三四五六七八九十一二」。']:
            letters=[c for c in source if normalize(c)]
            quoted={'duration':len(letters)*.15,'segments':[{'id':'q','text':source,'words':[
                {'字':c,'开始':i*.15,'结束':(i+1)*.15} for i,c in enumerate(letters)]}]}
            result=build_cues(quoted,12)
            joined=''.join(c[2] for c in result)
            self.assertEqual(joined.count('「'),1)
            self.assertEqual(joined.count('」'),1)
            self.assertNotRegex(joined,r'[。！？]」')
            self.assertEqual(normalize(joined),normalize(source))
        state['segments'][0]['words']=[{'字':text,'开始':0,'结束':state['duration']}]
        with self.assertRaises(ValueError):
            build_cues(state)

    def test_minimax_sample_and_cache_without_network(self):
        with tempfile.TemporaryDirectory(prefix='minimax-mock-') as root:
            project=(Path(root)/'sample').resolve()
            with contextlib.redirect_stdout(io.StringIO()):
                pipeline.initialize(project,False)
            cfg=pipeline.config(project)
            cfg['draft']=False;pipeline.save(project/'voice.json',cfg)
            text=cfg['segments'][0]['text']
            buf=io.BytesIO()
            with wave.open(buf,'wb') as wav:
                wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(32000)
                wav.writeframes(bytes(64000))
            rows=[{'timestamped_words':[{'word':text,'time_begin':0,'time_end':900}]}]
            requests=[]
            def urlopen(req,**kwargs):
                if isinstance(req,str):
                    self.assertEqual(req,'https://example.invalid/subtitles.json')
                    return io.BytesIO(json.dumps(rows).encode())
                body=json.loads(req.data);requests.append(body)
                self.assertEqual(body['voice_setting']['voice_id'],'Chinese_casual_instructor_nv1')
                self.assertEqual(body['audio_setting']['format'],'wav')
                self.assertTrue(body['subtitle_enable'])
                self.assertNotIn('context',body)
                return io.BytesIO(json.dumps({'base_resp':{'status_code':0},'data':{
                    'audio':buf.getvalue().hex(),'subtitle_file':'https://example.invalid/subtitles.json'}}).encode())
            run=pipeline.subprocess.run
            def local_run(cmd,**kwargs):
                if any(str(x).endswith('minimax_tts.py') for x in cmd):
                    arg=lambda flag:cmd[cmd.index(flag)+1]
                    minimax_tts.synthesize(pipeline.read(Path(arg('--request'))),
                        Path(arg('--text')).read_text(encoding='utf-8'),Path(arg('--output')),arg('--key-env'))
                    return None
                return run(cmd,**kwargs)
            with patch.object(minimax_tts,'get_key',return_value='OFFLINE_FIXTURE'), \
                 patch.object(minimax_tts.urllib.request,'urlopen',side_effect=urlopen), \
                 patch.object(pipeline.subprocess,'run',side_effect=local_run), \
                 contextlib.redirect_stdout(io.StringIO()):
                pipeline.audio(project,'intro')
                cfg['gain_db']=7;pipeline.save(project/'voice.json',cfg)
                pipeline.audio(project,'intro')
            self.assertEqual(len(requests),1,'postprocess gain change must reuse synthesized audio')
            self.assertFalse((project/'audio-state.json').exists(),'sample must not replace full track')
            for item in (project/'assets/samples').glob('*/timing.json'):
                result=pipeline.read(item)
                self.assertTrue(result['alignment_ready'])
                with wave.open(str(project/result['audio']),'rb') as wav:
                    self.assertEqual(wav.getnframes(),round(result['duration']*24000))


if __name__=='__main__':
    unittest.main(verbosity=2)
