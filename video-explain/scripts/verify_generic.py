"""Offline invariants for generic timelines and safe synchronization; no network."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import shutil
import wave
import pipeline
from timeline_core import build_timeline
from sync_skill import synchronize


class GenericTests(unittest.TestCase):
    def fixture(self, root):
        project = Path(root) / 'video'
        with contextlib.redirect_stdout(io.StringIO()):
            pipeline.initialize(project, False)
        cfg = pipeline.config(project)
        cfg['draft'] = False
        cfg['segments'] = [{'id': 'a', 'text': '先检查「限制」，再检查结果。', 'pause_after': 0}]
        (project/'稿子.txt').write_text(cfg['segments'][0]['text'], encoding='utf-8')
        pipeline.save(project/'voice.json', cfg)
        chars = [c for c in cfg['segments'][0]['text'] if pipeline.normalize(c)]
        words = [{'字': c, '开始': i*.2, '结束': (i+1)*.2} for i,c in enumerate(chars)]
        duration = len(chars)*.2
        state = {'recipe': pipeline.digest(cfg), 'audio': 'audio.wav', 'duration': duration,
                 'segments': [{**cfg['segments'][0], 'start': 0, 'end': duration, 'words': words}]}
        pipeline.save(project/'audio-state.json', state)
        with wave.open(str(project/'audio.wav'),'wb') as w:
            w.setparams((1,2,24000,0,'NONE','not compressed'));w.writeframes(bytes(round(duration*24000)*2))
        scene = {'schema':'explain-v1','anchors':{'limit':{'segment':'a','phrase':'限制'},'result':{'segment':'a','phrase':'结果'}},
                 'chapters':[{'id':'a','start':{'audio_start':True},'end':{'audio_end':True}}],
                 'constraints':[{'before':{'anchor':'limit'},'after':{'anchor':'result'}}]}
        pipeline.save(project/'scene.json',scene)
        return project,cfg,state,scene

    def test_real_anchor_quotes_and_idempotence(self):
        with tempfile.TemporaryDirectory() as root:
            p,c,s,scene=self.fixture(root)
            result=build_timeline(p,c,s,scene)
            self.assertEqual(result['anchors']['limit'],.6)
            self.assertIn('「限制」',''.join(x[2] for x in result['cues']))
            before=(p/'timeline.json').stat().st_mtime_ns
            build_timeline(p,c,s,scene)
            self.assertEqual(before,(p/'timeline.json').stat().st_mtime_ns)

    def test_ambiguous_phrase_and_reversed_causality(self):
        with tempfile.TemporaryDirectory() as root:
            p,c,s,scene=self.fixture(root)
            scene['anchors']['twice']={'segment':'a','phrase':'检查'}
            with self.assertRaises(ValueError):build_timeline(p,c,s,scene)
            scene['anchors']['twice']['occurrence']=2
            self.assertGreater(build_timeline(p,c,s,scene)['anchors']['twice'],1)
            scene['constraints'][0]={'before':{'anchor':'result'},'after':{'anchor':'limit'}}
            with self.assertRaises(ValueError):build_timeline(p,c,s,scene)

    def test_stale_audio_and_missing_coverage(self):
        with tempfile.TemporaryDirectory() as root:
            p,c,s,scene=self.fixture(root)
            c['speed']=1.1;pipeline.save(p/'voice.json',c)
            with self.assertRaises(ValueError):pipeline.timeline(p)
            scene['chapters'][0]['start']={'segment':'a','phrase':'限制'}
            with self.assertRaises(ValueError):build_timeline(p,c,s,scene)

    def test_sync_detect_backup_preserve_extra(self):
        with tempfile.TemporaryDirectory() as root:
            root=Path(root);a=root/'src';b=root/'dst';a.mkdir();b.mkdir()
            (a/'SKILL.md').write_text('new');(b/'SKILL.md').write_text('local edit');(b/'keep.txt').write_text('keep')
            self.assertFalse(synchronize(a,b)['clean'])
            r=synchronize(a,b,True,root/'backup')
            self.assertTrue(r['content_matches']);self.assertFalse(r['clean'])
            self.assertEqual((root/'backup/files/SKILL.md').read_text(),'local edit')
            self.assertEqual((b/'keep.txt').read_text(),'keep')
            with self.assertRaises(ValueError):synchronize(a,a/'nested',True,root/'bad')

    def test_sync_failure_keeps_complete_recovery_manifest(self):
        with tempfile.TemporaryDirectory() as root:
            root=Path(root);a=root/'src';b=root/'dst';a.mkdir();b.mkdir()
            for name in ['SKILL.md','data.txt']:
                (a/name).write_text('new');(b/name).write_text('original')
            copy=shutil.copy2
            def fail_on_target(src,dst,*args,**kwargs):
                if Path(dst).resolve()==(b/'data.txt').resolve():raise OSError('simulated disk failure')
                return copy(src,dst,*args,**kwargs)
            with patch('sync_skill.shutil.copy2',side_effect=fail_on_target):
                with self.assertRaises(OSError):synchronize(a,b,True,root/'backup')
            self.assertTrue((root/'backup/restore.json').is_file())
            for name in ['SKILL.md','data.txt']:
                self.assertEqual((root/'backup/files'/name).read_text(),'original')


if __name__=='__main__':unittest.main(verbosity=2)
