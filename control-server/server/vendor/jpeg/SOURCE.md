# Vendored JPEG decoder

The unmodified `mozjpeg_dec.js` and `mozjpeg_dec.wasm` files are from
`@jsquash/jpeg` version **1.6.0**, published by the jSquash project:
https://github.com/jamsinclair/jSquash

Package: https://registry.npmjs.org/@jsquash/jpeg/-/jpeg-1.6.0.tgz

Package npm integrity:
`sha512-zwN46Awh1VM6gXlIcALwb5WzqK5H2e6+Awcs1QP8AvS8ohsK/sbE4esvmH4jhlhW7+CgiUUww66vg0aTnlSIMA==`

Decoder WASM SHA-256:
`a7c4b12169817e779ff4af137981393ae924944e167ad1bd95747c9199162d3e`

The wrapper/glue is licensed under Apache-2.0, retained in `LICENSE`.
The codec licensing notice and BSD terms are retained in `LICENSE.codec.md`.
This software is based in part on the work of the Independent JPEG Group.

Only the decoder is included. No encoder, automatic download or runtime package
installation is used. `package.json` only declares local ESM syntax and provenance.
`server/jpeg-validation.mjs` initializes this exact WASM binary in both Node tests
and the Cloudflare Worker. Wrangler statically bundles it via `jpeg-worker.mjs`.
