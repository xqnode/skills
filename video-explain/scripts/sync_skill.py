"""Compare or synchronize a canonical skill to explicit installation directories."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import shutil
import sys

EXCLUDED = {'.git', 'node_modules', '__pycache__', '.video-explain-sync.json'}


def inventory(root):
    result = {}
    for f in root.rglob('*'):
        relative = f.relative_to(root)
        if any(p in EXCLUDED for p in relative.parts) or f.suffix == '.pyc':
            continue
        if f.is_symlink():
            raise ValueError(f'不自动同步符号链接：{f}')
        if f.is_file():
            result[relative.as_posix()] = hashlib.sha256(f.read_bytes()).hexdigest()
    return result


def synchronize(source, target, apply=False, backup=None):
    source, target = source.resolve(), target.resolve()
    if source == target or source.is_relative_to(target) or target.is_relative_to(source):
        raise ValueError('源与目标目录不能相同或互相包含')
    if not (source / 'SKILL.md').is_file():
        raise ValueError('源目录缺少SKILL.md')
    expected, actual = inventory(source), inventory(target)
    changed = [r for r, h in expected.items() if actual.get(r) != h]
    extras = sorted(set(actual) - set(expected))
    result = {'source': str(source), 'target': str(target), 'changed': changed,
              'target_only': extras, 'mode': 'apply' if apply else 'check'}
    if apply and changed:
        if backup is None:
            raise ValueError('--apply须指定--backup，先保存目标独有改动')
        backup = backup.resolve()
        if backup.is_relative_to(source) or backup.is_relative_to(target):
            raise ValueError('备份目录不能放在源或目标内部')
        if backup.exists():
            raise ValueError('备份目录已存在，换新目录，不能覆盖回退记录')
        backup.mkdir(parents=True)
        for r in changed:
            dst = target / r
            if dst.exists():
                if not dst.is_file():
                    raise ValueError(f'目标路径不是文件，未开始同步：{dst}')
                saved = backup / 'files' / r
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(dst, saved)
        (backup / 'restore.json').write_text(json.dumps(
            {**result, 'previous_hashes': actual, 'new_hashes': expected,
             'restore': 'files内原有文件按相对路径复制回target；新增文件由changed中不在previous_hashes的项识别，回退时先检查再处理；不自动删除target_only'},
            ensure_ascii=False, indent=2), encoding='utf-8')
        # Finish every backup and its recovery manifest before changing targets.
        # A later I/O failure still leaves a usable restore record.
        for r in changed:
            src, dst = source / r, target / r
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        (target / '.video-explain-sync.json').write_text(json.dumps(
            {'source': str(source), 'files': expected,
             'synced_at': datetime.datetime.now(datetime.timezone.utc).isoformat()},
            ensure_ascii=False, indent=2), encoding='utf-8')
    final = inventory(target)
    result['content_matches'] = all(final.get(r) == h for r, h in expected.items())
    result['clean'] = result['content_matches'] and not extras
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--target', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    try:
        result = synchronize(args.source, args.target, args.apply, args.backup)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if result['clean'] else 2)
    except (ValueError, OSError) as exc:
        raise SystemExit(f'停止：{exc}') from None
