"""Lossless PNG repacking; preserve all non-IDAT chunks byte for byte.
Requires Pillow. No resizing, quantization, palette conversion or metadata stripping.
An existing report is never overwritten. Use --apply in an isolated copy; omit it for a dry run.
"""
import argparse, hashlib, io, json, os, struct
from pathlib import Path
from PIL import Image

SIGNATURE = b'\x89PNG\r\n\x1a\n'
def chunks(data):
    if not data.startswith(SIGNATURE): raise ValueError('Not a PNG')
    pos = 8
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        end = pos + length + 12
        if end > len(data): raise ValueError('Truncated PNG chunk')
        yield data[pos+4:pos+8], data[pos:end]
        pos = end
    if pos != len(data): raise ValueError('Invalid PNG boundary')

def optimize(data):
    old = list(chunks(data))
    if any(kind == b'acTL' for kind, _ in old): return data, 'animated PNG retained'
    image = Image.open(io.BytesIO(data)); image.load()
    encoded = io.BytesIO(); image.save(encoded, format='PNG', optimize=True, compress_level=9)
    new = list(chunks(encoded.getvalue()))
    if old[0] != new[0]: return data, 'different IHDR retained'
    if image.mode not in ('RGB', 'RGBA'): return data, 'non-RGB format retained'
    # Preserve original color/alpha interpretation and every ancillary chunk.
    output = [SIGNATURE]; inserted = False
    for kind, raw in old:
        if kind == b'IDAT':
            if not inserted: output.extend(raw for kind, raw in new if kind == b'IDAT'); inserted = True
        else: output.append(raw)
    candidate = b''.join(output)
    check = Image.open(io.BytesIO(candidate)); check.load()
    if (check.mode, check.size, check.tobytes()) != (image.mode, image.size, image.tobytes()):
        raise ValueError('Decoded pixels changed')
    if [(k,r) for k,r in chunks(candidate) if k != b'IDAT'] != [(k,r) for k,r in old if k != b'IDAT']:
        raise ValueError('Non-IDAT chunks changed')
    return (candidate, 'lossless repack') if len(candidate) < len(data) else (data, 'original smaller')

def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args.add_argument('--report', type=Path, required=True)
    args.add_argument('--apply', action='store_true')
    options = args.parse_args()
    if options.report.exists(): raise SystemExit('Report already exists; choose a new path')
    rows=[]
    for directory in ['battles','units']:
        for path in sorted((options.root/'public/images'/directory).rglob('*.png')):
            before = path.read_bytes(); after, reason = optimize(before)
            image = Image.open(io.BytesIO(before)); image.load()
            rows.append(dict(file=str(path.relative_to(options.root)), beforeBytes=len(before), afterBytes=len(after),
                beforeSha256=hashlib.sha256(before).hexdigest(), afterSha256=hashlib.sha256(after).hexdigest(),
                pixelSha256=hashlib.sha256(image.tobytes()).hexdigest(),
                nonIdatSha256=hashlib.sha256(b''.join(raw for kind,raw in chunks(before) if kind != b'IDAT')).hexdigest(),
                mode=image.mode, size=image.size, reason=reason))
            if options.apply and after != before:
                temporary=path.with_suffix('.png.repack'); temporary.write_bytes(after); os.replace(temporary,path)
    metadata_updates=[]
    if options.apply:
        by_hash={row['beforeSha256']:row for row in rows if row['beforeSha256'] != row['afterSha256']}
        for path in (options.root/'public/images').rglob('*.json'):
            data=json.loads(path.read_text()); meta=data.get('meta',{})
            row=by_hash.get(meta.get('sha256'))
            if row:
                meta.setdefault('originalFileSha256',row['beforeSha256'])
                meta.update(sha256=row['afterSha256'],pixelSha256=row['pixelSha256'],
                    encoding='Lossless PNG repack; original decoded pixels and non-IDAT chunks preserved')
                path.write_text(json.dumps(data,indent=2)+'\n')
                metadata_updates.append(str(path.relative_to(options.root)))
    if options.apply:
        art_manifest=options.root/'docs/field-art-v3-manifest.json'
        if art_manifest.exists():
            records=json.loads(art_manifest.read_text()); changed=False
            for art in records:
                row=by_hash.get(art.get('sha256'))
                if row and art.get('file') == row['file']:
                    art.setdefault('originalFileSha256',row['beforeSha256'])
                    art.update(sha256=row['afterSha256'],bytes=row['afterBytes'],pixelSha256=row['pixelSha256'])
                    art['scope']=art['scope'].replace('Original generated PNG preserved.','Original generated pixels and PNG metadata preserved through lossless repacking.')
                    changed=True
            if changed:
                art_manifest.write_text(json.dumps(records,indent=2)+'\n')
                metadata_updates.append(str(art_manifest.relative_to(options.root)))
    report=dict(metadataUpdates=metadata_updates,applied=options.apply, invariant='Decoded native pixel bytes and all non-IDAT PNG chunks identical',
        beforeBytes=sum(r['beforeBytes'] for r in rows), afterBytes=sum(r['afterBytes'] for r in rows), files=rows)
    options.report.parent.mkdir(parents=True,exist_ok=True)
    with options.report.open('x') as handle: json.dump(report,handle,indent=2);handle.write('\n')
    print(json.dumps({k:v for k,v in report.items() if k!='files'}))
if __name__=='__main__': main()
