# License matching

Metascope compares license files with compact fingerprints generated from the full SPDX license corpus. Matching runs locally and needs no model, network access, or bundled reference texts. `spdx-license-list` remains a development dependency for regeneration and tests.

## Reading results

Each `licenseFile` record retains its source path and a `data.type` discriminator:

| `data.type` | `data.match.status` | Meaning                                                                         |
| ----------- | ------------------- | ------------------------------------------------------------------------------- |
| `spdx`      | `exact`             | The normalized text equals a reference template.                                |
| `spdx`      | `reference`         | A short file explicitly points to a recognized license URL.                     |
| `modified`  | `modified`          | A close candidate was found, but the normalized text differs.                   |
| `uncertain` | `uncertain`         | The best candidate is weak, ambiguous, or supported only by a URL or GNU title. |
| `unknown`   | No match            | No candidate was identified.                                                    |

`confidence` is character-bigram Dice similarity, not a probability that the file grants the candidate license. Explicit references use a value of 1. Even a similarity of 0.99 can accompany an added restriction or a negated permission. The candidate's name, SPDX ID, URL, and OSI approval describe the reference template, including when the status is `modified` or `uncertain`.

The CodeMeta template uses a license-file candidate only when `data.type` is `spdx`. Modified and uncertain candidates remain in raw metadata. Explicit declarations from manifests and other higher-priority sources retain their existing precedence.

`exact` means equality after Metascope's normalization, which ignores case, whitespace, copyright lines, URLs, email addresses, Markdown heading markers and tables, brackets, parentheses, and leading YAML front matter. It does not implement all SPDX matching rules or establish legal equivalence. A `modified` result can reflect a typo or a substantive change; it does not distinguish them. Identical templates and shared URLs use the existing deterministic preference for modern IDs, including `-only` before `-or-later`; the license body alone may not resolve that distinction.

## Compact representation

Each reference retains metadata, a SHA-256 hash of normalized text, lossless character-bigram counts, and the 64 lowest hashes of five-word sequences. A shared bigram dictionary and variable-length integers compress the counts. The versioned binary payload is gzipped and stored as base64 in `src/lib/data/license-fingerprints.json`, then decoded lazily once per process.

Exact hashes are checked first. Fuzzy matching scores every distinct template with the existing Dice formula, then ranks the best eight candidates using both character and word-sequence overlap. This adds evidence about local word order without storing complete texts or a neural encoder. A candidate is marked `modified` when character similarity is at least 0.90, estimated word-sequence similarity is at least 0.85, and its average score leads the runner-up by at least 0.01. Other candidates above the 0.75 character threshold are `uncertain`. When there is no strong lexical match, a unique recognized URL or GNU title supplies an uncertain candidate instead, even below that threshold. This preserves useful hints from extended notices and translated files.

URL shortcuts are limited to short, explicit pointer files. A URL embedded in a full license body no longer overrides evidence that its terms changed, and conflicting recognized URLs do not select an arbitrary license.

With `spdx-license-list` 6.12.0, the artifact covers 727 entries in 663,825 bytes, including metadata and word signatures. The generator preserves every reference bigram count, so the compact representation itself does not change character similarity scores.

## Regeneration and validation

Run `pnpm generate-license-fingerprints` after updating `spdx-license-list`, then commit the generated JSON. `pnpm build` also regenerates it automatically. Tests verify deterministic generation and compare every decoded record with the full development corpus. The published package retains the source package's license notice.

Run `pnpm bench:licenses` to compare results with the frozen full-text baseline. The 61 cases cover seven common licenses, whitespace and copyright changes, front matter, typos, added restrictions, a negated grant, paragraph deletions, mixed licenses, unrelated prose, and URL pointers.

| Cases                                 | Previous matcher                                     | Compact matcher                                                 |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| 28 canonical or formatting variants   | 28 correct IDs                                       | 28 correct IDs, all exact                                       |
| 22 lightly edited texts               | 22 correct IDs, all emitted as SPDX matches          | 22 correct candidate IDs, all marked modified                   |
| 7 paragraph deletions                 | 3 original IDs retained, all emitted as SPDX matches | 3 original IDs retained, none emitted as confirmed SPDX matches |
| 3 mixed, negated, or unrelated inputs | 2 emitted as SPDX matches                            | None emitted as confirmed SPDX matches                          |
| 1 explicit URL pointer                | Correct ID                                           | Correct ID, marked reference                                    |

This small regression corpus measures specific failure cases, not accuracy across the entire SPDX catalog. Deleted paragraphs can resemble a different license, and the word signature is an approximate overlap estimate. The benchmark reports uncertain candidates and startup/warm timings so further changes can be evaluated against the same inputs.
