# Gettysburg v7 preload budget review

Read-only file/registry audit on October 1, 2026. The [machine-readable budget](../manifests/gettysburg-v7-preload-budget.json) records each selected atlas, native/public/dist hashes, PNG/JSON bytes, clips, dimensions, input hashes and validation evidence. Only these two report files were written; assets and code were unchanged.

**Exact historical Gettysburg v7 selects ten unique candidate atlases and twenty clips: four retained v6 atlases plus six new sheets. All ten native/public/dist PNG triples are byte-identical by SHA-256; all ten public/dist JSON pairs match.** Each PNG is native 1254×1254 RGBA with four complete, untrimmed 627×627 cells.

| Candidate selection | Atlases / clips | PNG bytes | JSON bytes | Combined file bytes | Nominal single-image RGBA bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| v6 retained baseline | 4 / 8 | 2,491,364 | 15,265 | 2,506,629 | 25,160,256 |
| v7 total | 10 / 20 | 5,643,666 | 38,494 | 5,682,160 | 62,900,640 |
| Added beyond v6 | 6 / 12 | 3,152,302 | 23,229 | 3,175,531 | 37,740,384 |

Nominal RGBA is strictly `width × height × 4`, approximately 24/60/36 MiB for the rows above. It is not measured runtime, GPU, CPU, duplicate-texture or peak memory. Local PNG/JSON file lengths are not observed HTTP transferred bytes, and this candidate-only table excludes terrain, accepted fallback art, audio, JavaScript/CSS, embedded registry metadata and total application payload.

An independent bounded VM probe executed the actual scene `preload()` method for v6/v7 at `/` and `/nested-game/`: four/ten unique atlas PNG+JSON pairs respectively, retaining every normal preload request. Seven normal/nonmatching controls request zero v3–v7 candidate atlases: ordinary Gettysburg, malformed/other query parameters, Gettysburg Jackson/Meade, First Manassas and Shiloh. The current strict test log separately records **44 passed, zero failed, zero skipped**, including the v6/v7 actual-preload tests. This audit inspected that log and ran its own bounded probe; it did not rerun the full suite or measure a browser/network session. Candidate JSON registries are statically imported, so zero candidate texture/JSON URL requests does not imply zero candidate metadata in JavaScript bundles.

The saved Vite build log records completion and warns that some minified JavaScript chunks exceed 500 kB. The copied dist files match this audit's public files. The warning concerns bundle size; this audit neither attributes it to candidate images nor establishes startup latency, FPS, frame time, cache behavior or ordinary-device performance. Source previews remain opt-in; production/full-family and independent human/historical validation remain false.
