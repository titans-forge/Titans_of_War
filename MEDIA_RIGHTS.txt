# Titans of War Media Rights

> Licensing checkpoint, September 30, 2026: the current project policy is
> [Forge Game Hosting License 1.0](LICENSE); see [LICENSING.md](LICENSING.md).
> All earlier MIT grants and separately licensed media terms recorded below
> remain available. References below to MIT describe the preserved grants, not
> a blanket grant for newly authored Forge-covered material. The original MIT
> notice is retained in [LICENSE-LEGACY-MIT.txt](LICENSE-LEGACY-MIT.txt).

This document separates the MIT-licensed application code from the images and
audio distributed with Titans of War. It is a release record, not legal advice.

## Project Media

Project-authored battlefield photographs and project-created images are
offered under the [Creative Commons Attribution 4.0 International
license](https://creativecommons.org/licenses/by/4.0/) to the extent Titans
Forge holds transferable rights in them.

Suggested attribution:

> Titans of War media by Titans Forge, CC BY 4.0.

Some project-created images were produced with generative tools. Provider-
specific attribution is recorded in `src/game/mediaCatalog.js` where known.
The project also acknowledges OpenAI, xAI/Grok Imagine, and Google image
generation tools globally. Provider names do not imply sponsorship or
endorsement.

AI-generated output may not qualify for copyright protection in every
jurisdiction. The CC BY 4.0 offer therefore applies only to rights the project
author can license, and no exclusivity is claimed.

## Provider Terms Reviewed

The release review used the provider terms available on June 9, 2026:

- [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/): as between
  the user and OpenAI, the user owns output and OpenAI assigns any rights it
  may have in that output.
- [xAI Consumer Terms](https://x.ai/legal/terms-of-service) and
  [xAI Legal FAQ](https://x.ai/legal/faq): users retain rights in their
  content and may use generated images commercially; xAI asks users to follow
  its attribution guidance.
- [Google Terms of Service](https://policies.google.com/terms): Google does
  not claim ownership over original content generated in its services.
- [Black Forest Labs FLUX output terms](https://bfl.ai/legal/terms-of-service)
  state that BFL does not claim ownership of outputs. However, local
  FLUX.2 Klein 9B use is governed by the
  [FLUX Non-Commercial License](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/blob/main/LICENSE.md)
  unless a separate commercial license applies.

Because Titans of War also promotes a commercial company, the two experimental
local FLUX.2 Klein 9B outputs are excluded from the public repository and
release build:

- `shiloh_pittsburg_landing_theater_flux2.jpg`
- `richmond_evacuation_theater_flux2.jpg`

The game uses other cleared images for those scenarios.

## Historical Media And Audio

Historical paintings, prints, maps, photographs, and recordings retain the
rights status shown in:

- `src/game/mediaCatalog.js`
- `src/game/audioCatalog.js`
- `src/game/historicalAssetManifest.js`

Public-domain works are not placed under CC BY 4.0. Third-party works retain
their stated licenses and required credits.

Each shipped audio recording is tied to its audited source download by a
SHA-256 hash in `src/game/historicalAssetManifest.js`. Run
`npm run validate-assets` to verify the local release files.

The `dixie_instrumental.mp3` recording is included as separately licensed
CC BY-SA 4.0 Wikimedia Commons media; it is not relicensed under the project's
MIT code license. `lorena_instrumental.mp3` is included again using a trimmed
Library of Congress Citizen DJ source file whose item page states that the
recording is free to use and reuse, including commercial use. Optional recordings
and maps marked
`recording-needed` or `needs-review` are also excluded until their exact source
and redistribution status are verified.

## Copyrightability Note

The U.S. Copyright Office states that copyright protects human-authored
expression, while purely AI-generated material or material controlled only by
prompts may not be protected. See its
[Copyright and Artificial Intelligence initiative](https://www.copyright.gov/ai/)
and Part 2 report on copyrightability. Human-authored selection, arrangement,
editing, captions, software, and game design remain separate works.

## No Warranty

Media is provided without warranty. Downstream users are responsible for
checking the law and provider terms that apply to their jurisdiction and use.
