# Private JPEG and report runtimes

`wrangler.jsonc` deploys `jpeg-worker.mjs`. It preserves the existing HTTP URLs
and exports two SQLite-backed Durable Object classes:

- `JPEG_DECODER` / `JpegValidation`: bounded, in-memory JPEG decoding only.
- `REPORT_RUNTIME` / `ReportRuntime`: existing Gmail, mail archive and mail detail
  handlers with their original Origin, session, role and runner authorization.

Each namespace uses one fixed object ID. Neither class writes images or report
content to Durable Object storage. Neither class has a public HTTP endpoint.
JPEG validation runs only after the upload handler's authorization and structural
validation. The private response is 204 for a clean full decode, 400 for invalid
data, or a service error. The upload handler maps an unavailable service to 503,
preserving the client's pending photograph for retry. Four simultaneous JPEG
request buffers are allowed per object and excess requests receive a retryable
503. Each photograph is limited to 1,200,000 bytes, 2048 pixels per edge and
4,194,304 pixels before native decoding starts.

The exact pinned decoder, source provenance, integrity and licenses are in
`vendor/jpeg/`. Keep this directory, including the WASM binary, with the server
when copying the deployment source. Node tests compile the same WASM binary and
inject the same validator. No network codec service or runtime download is used.

## Why decoding uses a Durable Object

The regular Workers Free CPU allowance is too small to reliably decode full
1280-pixel photos. The current jSquash decoder always produces full RGBA output
and exposes no scaled-IDCT option. A free SQLite-backed Durable Object has a
default 30-second CPU allowance per request. No paid plan, CPU limit override or
storage write is needed.

Cloudflare's documented free account allocations are 100,000 Durable Object
requests and 13,000 GB-seconds per day. Usage is shared across the account and
exhaustion causes operations to fail on the Free plan. At 10,000 photo requests
averaging 50ms, the JPEG runtime itself accounts for approximately 64 GB-seconds
(10,000 × 0.05s × 0.128GB), plus report requests and their active duration.

Official references:
https://developers.cloudflare.com/durable-objects/platform/limits/
https://developers.cloudflare.com/durable-objects/platform/pricing/

## Local validation, 2026-11-12

These numbers are local measurements, not a production CPU guarantee. With the
same vendored binary in Node, full decode median wall times were:

| Dimensions | Resized fixture | Deterministic RGB noise, quality 75 |
|---|---:|---:|
| 1280 × 960 | 7.22ms | 18.53ms |
| 1600 × 1200 | 11.18ms | 28.83ms |

Cold first decodes measured 15.6–33.9ms. Decoding is therefore deliberately kept
outside the regular HTTP Worker's 10ms CPU allowance.

Actual local workerd with SQLite Durable Objects returned 204 for a valid photo,
400 for structurally valid invalid-Huffman data, then 204 for a good photo after
the fatal decoder error. Thirty consecutive 2048 × 2048 fixture decodes all
returned 204, with median local HTTP round trip 46.9ms and p95 59.4ms. This
includes local HTTP and Durable Object dispatch rather than measuring CPU alone.

A separate Node stress run of 100 maximum-dimension decodes stabilized at about
96MiB total process RSS, including Node itself, after collection. The codec's
linear WASM memory reached 19.375MiB at this dimension. Normal 1280/1600-pixel
images used 16.125MiB of codec linear memory. Decoded pixel arrays and bounded
input buffers are additional transient memory. The local workerd stress run
completed within its runtime memory limit without a reset.

Regression command:
`node --test tests/jpeg-validation.test.mjs tests/independent-worker.test.mjs tests/photo-capacity.test.mjs`

The tests cover exact binary integrity, successful decode, invalid Huffman data
that passes structural checks, recovery after fatal decoder errors, concurrent
queue recovery, service error handling and original report authorization.
