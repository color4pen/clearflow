# Verification Result — audit-record-helper — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | failed | 140.7s | 1 |
| 2 | typecheck | skipped | — | — |
| 3 | test | skipped | — | — |
| 4 | lint | skipped | — | — |

## Phase: build

Step 'build' failed

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...

$ next build
Turbopack build encountered 77 warnings:
[next]/internal/font/google/0b1bf0e8691e359a-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.17.woff2


[next]/internal/font/google/16c0bae53859e9d2-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.15.woff2


[next]/internal/font/google/1fdece5bd1bfb380-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.68.woff2


[next]/internal/font/google/202060c3b3e7fe5d-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.55.woff2


[next]/internal/font/google/221fee9d3a53f94a-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.35.woff2


[next]/internal/font/google/23737b49e5eaf959-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.16.woff2


[next]/internal/font/google/241b10dbd85abd9e-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.87.woff2


[next]/internal/font/google/24cdcb3de221bf27-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.37.woff2


[next]/internal/font/google/259f1b412c813b10-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.57.woff2


[next]/internal/font/google/26cdd03f0e79a67c-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.108.woff2


[next]/internal/font/google/29c988d134d3e94f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.34.woff2


[next]/internal/font/google/2e3ddfa9bf768048-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.56.woff2


[next]/internal/font/google/2e8e47cc470e577d-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.30.woff2


[next]/internal/font/google/2f874fc97ef25963-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.76.woff2


[next]/internal/font/google/3193c714b945c3a1-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.50.woff2


[next]/internal/font/google/31bc8f5af7916751-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.45.woff2


[next]/internal/font/google/32673b13290a9d13-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.69.woff2


[next]/internal/font/google/376c9f4a63f8e7d2-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.14.woff2


[next]/internal/font/google/37f58264f669d8d0-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.116.woff2


[next]/internal/font/google/39be5119cc5a377c-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.23.woff2


[next]/internal/font/google/3b29bbaa749f791b-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.13.woff2


[next]/internal/font/google/401fafc67c25a330-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.7.woff2


[next]/internal/font/google/42ebe4f46951d6a8-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.11.woff2


[next]/internal/font/google/43535804f9f74d3b-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.78.woff2


[next]/internal/font/google/472bfad1ecc5179e-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFYxQgP-FVth9IU.woff2


[next]/internal/font/google/477352fa0b5ee4e2-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.31.woff2


[next]/internal/font/google/4bebc6b2128cde3f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.0.woff2


[next]/internal/font/google/4bf5e8795559cd35-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.9.woff2


[next]/internal/font/google/4e4856640726ebfe-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.21.woff2


[next]/internal/font/google/4f585ef944389036-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.112.woff2


[next]/internal/font/google/4ff87076ac5c5e71-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.82.woff2


[next]/internal/font/google/58bdc392c1e33013-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.94.woff2


[next]/internal/font/google/5fdaa22ac9bc42ea-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.43.woff2


[next]/internal/font/google/629bc517444a1e9b-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.67.woff2


[next]/internal/font/google/62d46e9a771acd10-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.65.woff2


[next]/internal/font/google/63c9179ac5d1ad4e-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFYzwgP-FVth9IU.woff2


[next]/internal/font/google/652c1dd1c138fcca-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.6.woff2


[next]/internal/font/google/65521569a5d22bc8-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.93.woff2


[next]/internal/font/google/66a4d9356be5b592-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.83.woff2


[next]/internal/font/google/6791019760a8bee3-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.102.woff2


[next]/internal/font/google/683bb10d164e88ba-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.101.woff2


[next]/internal/font/google/683c6643e5cafd9d-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.52.woff2


[next]/internal/font/google/72a1714c29144410-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.62.woff2


[next]/internal/font/google/789c311d2ee85bd0-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.38.woff2


[next]/internal/font/google/83eba018cab4930f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.71.woff2


[next]/internal/font/google/8e72fd30cdd20f2f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.58.woff2


[next]/internal/font/google/8f3be40894dcf6e0-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.8.woff2


[next]/internal/font/google/915d96c35f0c8c06-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.36.woff2


[next]/internal/font/google/93a91e419890814f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.32.woff2


[next]/internal/font/google/98a08d380367033a-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.26.woff2


[next]/internal/font/google/99fb62709cdb61a3-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.92.woff2


[next]/internal/font/google/9a90a47970b2d1ac-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.117.woff2


[next]/internal/font/google/9d85bd9105499ad1-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.113.woff2


[next]/internal/font/google/9db1f7e119a39d5b-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.91.woff2


[next]/internal/font/google/a9005bdf8d5f4213-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.20.woff2


[next]/internal/font/google/ad9c66e761fed85a-s.p.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFYwQgP-FVthw.woff2


[next]/internal/font/google/b069a83635c161dc-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.96.woff2


[next]/internal/font/google/b328eebf6b76f38b-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.90.woff2


[next]/internal/font/google/b483e900f9641fa0-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.97.woff2


[next]/internal/font/google/b7ef28f941ece0f2-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.118.woff2


[next]/internal/font/google/bae11e110ca75757-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.39.woff2


[next]/internal/font/google/bf59ec3381f0cf85-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.19.woff2


[next]/internal/font/google/c15040384d76a4f4-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.86.woff2


[next]/internal/font/google/d22c61703164f752-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.98.woff2


[next]/internal/font/google/d3dc84e857a0fc86-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.85.woff2


[next]/internal/font/google/e311b36bf605dfe1-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.10.woff2


[next]/internal/font/google/e671e66c61b394a3-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.79.woff2


[next]/internal/font/google/e74b39ad968bb614-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.1.woff2


[next]/internal/font/google/e878ccbce99b956c-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.18.woff2


[next]/internal/font/google/ea316c3d581c3929-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.88.woff2


[next]/internal/font/google/f5b0f03f6cd5576f-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.70.woff2


[next]/internal/font/google/f7f5cc2517991a78-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.40.woff2


[next]/internal/font/google/f9e2ab5c62d27a31-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.46.woff2


[next]/internal/font/google/fb0f8b39d51e9d48-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.47.woff2


[next]/internal/font/google/fd8028c2945c270c-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.103.woff2


[next]/internal/font/google/fdb65db6ab7b356d-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.41.woff2


[next]/internal/font/google/fdc28aaffeaad643-s.woff2
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/notosansjp/v56/-F62fjtqLzI2JPCgQBnw7HFowwII2lcnk-AFfrgQrvWXpdFg3KXxAMsKMbdN.22.woff2



> Build error occurred
Error: Turbopack build failed with 231 errors:
[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:6:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m4 |[0m   font-weight: [35m400[0m;
  [90m5 |[0m   font-display: swap;
[31m[1m>[0m [90m6 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gst...[0m
  [90m  |[0m        [31m[1m^[0m
  [90m7 |[0m   unicode-range: [33mU[0m+[35m25[0mee8, [33mU[0m+[35m25[0mf23, [33mU[0m+[35m25[0mf5c, [33mU[0m+[35m25[0mfd4, [33mU[0m+[35m25[0mfe0, [33mU[0m+[35m25[0mffb, [33mU[0m+[35m2600[0mc, [33mU[0m+[35m26017[0m, [33mU[0m+[35m...[0m
  [90m8 |[0m }
  [90m9 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:14:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m12 |[0m   font-weight: [35m400[0m;
  [90m13 |[0m   font-display: swap;
[31m[1m>[0m [90m14 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m15 |[0m   unicode-range: [33mU[0m+[35m1[0mf235-[35m1[0mf23b, [33mU[0m+[35m1[0mf240-[35m1[0mf248, [33mU[0m+[35m1[0mf250-[35m1[0mf251, [33mU[0m+[35m2000[0mb, [33mU[0m+[35m20089[0m-[35m2008[0ma, [33mU[0m+[35m20.[0m..
  [90m16 |[0m }
  [90m17 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:54:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m52 |[0m   font-weight: [35m400[0m;
  [90m53 |[0m   font-display: swap;
[31m[1m>[0m [90m54 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m55 |[0m   unicode-range: [33mU[0m+[35m9[0mc3e, [33mU[0m+[35m9[0mc41, [33mU[0m+[35m9[0mc43-[35m9[0mc4a, [33mU[0m+[35m9[0mc4e-[35m9[0mc50, [33mU[0m+[35m9[0mc52-[35m9[0mc54, [33mU[0m+[35m9[0mc56, [33mU[0m+[35m9[0mc58, [33mU[0m+[35m.[0m..
  [90m56 |[0m }
  [90m57 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:62:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m60 |[0m   font-weight: [35m400[0m;
  [90m61 |[0m   font-display: swap;
[31m[1m>[0m [90m62 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m63 |[0m   unicode-range: [33mU[0m+[35m9[0mae5-[35m9[0mae7, [33mU[0m+[35m9[0mae9, [33mU[0m+[35m9[0maeb-[35m9[0maec, [33mU[0m+[35m9[0maee-[35m9[0maef, [33mU[0m+[35m9[0maf1-[35m9[0maf5, [33mU[0m+[35m9[0maf7, [33mU[0m+[35m9[0maf..[35m.[0m
  [90m64 |[0m }
  [90m65 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:70:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m68 |[0m   font-weight: [35m400[0m;
  [90m69 |[0m   font-display: swap;
[31m[1m>[0m [90m70 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m71 |[0m   unicode-range: [33mU[0m+[35m98[0meb, [33mU[0m+[35m98[0med-[35m98[0mee, [33mU[0m+[35m98[0mf0-[35m98[0mf1, [33mU[0m+[35m98[0mf3, [33mU[0m+[35m98[0mf6, [33mU[0m+[35m9902[0m, [33mU[0m+[35m9907[0m-[35m9909[0m, [33mU[0m+[35m...[0m
  [90m72 |[0m }
  [90m73 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:78:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m76 |[0m   font-weight: [35m400[0m;
  [90m77 |[0m   font-display: swap;
[31m[1m>[0m [90m78 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m79 |[0m   unicode-range: [33mU[0m+[35m971[0md, [33mU[0m+[35m9721[0m-[35m9724[0m, [33mU[0m+[35m9728[0m, [33mU[0m+[35m972[0ma, [33mU[0m+[35m9730[0m-[35m9731[0m, [33mU[0m+[35m9733[0m, [33mU[0m+[35m9736[0m, [33mU[0m+[35m9738[0m-[35m...[0m
  [90m80 |[0m }
  [90m81 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:86:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m84 |[0m   font-weight: [35m400[0m;
  [90m85 |[0m   font-display: swap;
[31m[1m>[0m [90m86 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m87 |[0m   unicode-range: [33mU[0m+[35m944[0ma, [33mU[0m+[35m944[0mc, [33mU[0m+[35m9452[0m-[35m9453[0m, [33mU[0m+[35m9455[0m, [33mU[0m+[35m9459[0m-[35m945[0mc, [33mU[0m+[35m945e-9463[0m, [33mU[0m+[35m9468[0m, [33mU[0m+[35m...[0m
  [90m88 |[0m }
  [90m89 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:94:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m92 |[0m   font-weight: [35m400[0m;
  [90m93 |[0m   font-display: swap;
[31m[1m>[0m [90m94 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.gs...[0m
  [90m   |[0m        [31m[1m^[0m
  [90m95 |[0m   unicode-range: [33mU[0m+[35m92[0mbc-[35m92[0mbd, [33mU[0m+[35m92[0mbf-[35m92[0mc3, [33mU[0m+[35m92[0mc5-[35m92[0mc8, [33mU[0m+[35m92[0mcb-[35m92[0md0, [33mU[0m+[35m92[0md2-[35m92[0md3, [33mU[0m+[35m92[0md5, [33m.[0m.[35m.[0m
  [90m96 |[0m }
  [90m97 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:110:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m108 |[0m   font-weight: [35m400[0m;
  [90m109 |[0m   font-display: swap;
[31m[1m>[0m [90m110 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m111 |[0m   unicode-range: [33mU[0m+[35m8[0mf52-[35m8[0mf55, [33mU[0m+[35m8[0mf57-[35m8[0mf58, [33mU[0m+[35m8[0mf5c-[35m8[0mf5e, [33mU[0m+[35m8[0mf61-[35m8[0mf66, [33mU[0m+[35m8[0mf9c-[35m8[0mf9d, [33mU[0m+[35m8[0mf9f-[35m.[0m..
  [90m112 |[0m }
  [90m113 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:118:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m116 |[0m   font-weight: [35m400[0m;
  [90m117 |[0m   font-display: swap;
[31m[1m>[0m [90m118 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m119 |[0m   unicode-range: [33mU[0m+[35m8[0mdc0, [33mU[0m+[35m8[0mdc2, [33mU[0m+[35m8[0mdc5-[35m8[0mdc8, [33mU[0m+[35m8[0mdca-[35m8[0mdcc, [33mU[0m+[35m8[0mdce-[35m8[0mdcf, [33mU[0m+[35m8[0mdd1, [33mU[0m+[35m8[0mdd4-[35m8[0md...
  [90m120 |[0m }
  [90m121 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:126:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m124 |[0m   font-weight: [35m400[0m;
  [90m125 |[0m   font-display: swap;
[31m[1m>[0m [90m126 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m127 |[0m   unicode-range: [33mU[0m+[35m8[0mb2d, [33mU[0m+[35m8[0mb30, [33mU[0m+[35m8[0mb37, [33mU[0m+[35m8[0mb3c, [33mU[0m+[35m8[0mb3e, [33mU[0m+[35m8[0mb41-[35m8[0mb46, [33mU[0m+[35m8[0mb48-[35m8[0mb49, [33mU[0m+[35m8[0mb4c.[35m.[0m.
  [90m128 |[0m }
  [90m129 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:134:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m132 |[0m   font-weight: [35m400[0m;
  [90m133 |[0m   font-display: swap;
[31m[1m>[0m [90m134 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m135 |[0m   unicode-range: [33mU[0m+[35m8973[0m-[35m8975[0m, [33mU[0m+[35m8977[0m, [33mU[0m+[35m897[0ma-[35m897[0me, [33mU[0m+[35m8980[0m, [33mU[0m+[35m8983[0m, [33mU[0m+[35m8988[0m-[35m898[0ma, [33mU[0m+[35m898[0md, [33mU[0m.[35m..[0m
  [90m136 |[0m }
  [90m137 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:142:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m140 |[0m   font-weight: [35m400[0m;
  [90m141 |[0m   font-display: swap;
[31m[1m>[0m [90m142 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m143 |[0m   unicode-range: [33mU[0m+[35m87e2[0m-[35m87e6[0m, [33mU[0m+[35m87[0mea-[35m87[0med, [33mU[0m+[35m87[0mef, [33mU[0m+[35m87[0mf1, [33mU[0m+[35m87[0mf3, [33mU[0m+[35m87[0mf5-[35m87[0mf8, [33mU[0m+[35m87[0mfa-[35m87[0m...
  [90m144 |[0m }
  [90m145 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:150:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m148 |[0m   font-weight: [35m400[0m;
  [90m149 |[0m   font-display: swap;
[31m[1m>[0m [90m150 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m151 |[0m   unicode-range: [33mU[0m+[35m8655[0m-[35m8659[0m, [33mU[0m+[35m865[0mb, [33mU[0m+[35m865[0md-[35m8664[0m, [33mU[0m+[35m8667[0m, [33mU[0m+[35m8669[0m, [33mU[0m+[35m866[0mc, [33mU[0m+[35m866[0mf, [33mU[0m+[35m8671[0m..[33m.[0m
  [90m152 |[0m }
  [90m153 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:158:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m156 |[0m   font-weight: [35m400[0m;
  [90m157 |[0m   font-display: swap;
[31m[1m>[0m [90m158 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m159 |[0m   unicode-range: [33mU[0m+[35m84[0mb4, [33mU[0m+[35m84[0mb9-[35m84[0mbb, [33mU[0m+[35m84[0mbd-[35m84[0mc2, [33mU[0m+[35m84[0mc6-[35m84[0mca, [33mU[0m+[35m84[0mcc-[35m84[0md1, [33mU[0m+[35m84[0md3, [33mU[0m+[35m84[0m...
  [90m160 |[0m }
  [90m161 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:166:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m164 |[0m   font-weight: [35m400[0m;
  [90m165 |[0m   font-display: swap;
[31m[1m>[0m [90m166 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m167 |[0m   unicode-range: [33mU[0m+[35m82e8[0m, [33mU[0m+[35m82[0mea, [33mU[0m+[35m82[0med, [33mU[0m+[35m82[0mef, [33mU[0m+[35m82[0mf3-[35m82[0mf4, [33mU[0m+[35m82[0mf6-[35m82[0mf7, [33mU[0m+[35m82[0mf9, [33mU[0m+[35m82[0mfb..[33m.[0m
  [90m168 |[0m }
  [90m169 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:174:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m172 |[0m   font-weight: [35m400[0m;
  [90m173 |[0m   font-display: swap;
[31m[1m>[0m [90m174 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m175 |[0m   unicode-range: [33mU[0m+[35m814[0ma, [33mU[0m+[35m814[0mc, [33mU[0m+[35m8151[0m-[35m8153[0m, [33mU[0m+[35m8157[0m, [33mU[0m+[35m815[0mf-[35m8161[0m, [33mU[0m+[35m8165[0m-[35m8169[0m, [33mU[0m+[35m816[0md-[35m81.[0m..
  [90m176 |[0m }
  [90m177 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:182:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m180 |[0m   font-weight: [35m400[0m;
  [90m181 |[0m   font-display: swap;
[31m[1m>[0m [90m182 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m183 |[0m   unicode-range: [33mU[0m+[35m7[0mf77-[35m7[0mf79, [33mU[0m+[35m7[0mf7d-[35m7[0mf80, [33mU[0m+[35m7[0mf82-[35m7[0mf83, [33mU[0m+[35m7[0mf86-[35m7[0mf88, [33mU[0m+[35m7[0mf8b-[35m7[0mf8d, [33mU[0m+[35m7[0mf8f-[35m.[0m..
  [90m184 |[0m }
  [90m185 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:190:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m188 |[0m   font-weight: [35m400[0m;
  [90m189 |[0m   font-display: swap;
[31m[1m>[0m [90m190 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m191 |[0m   unicode-range: [33mU[0m+[35m7[0md57, [33mU[0m+[35m7[0md59-[35m7[0md5d, [33mU[0m+[35m7[0md63, [33mU[0m+[35m7[0md65, [33mU[0m+[35m7[0md67, [33mU[0m+[35m7[0md6a, [33mU[0m+[35m7[0md6e, [33mU[0m+[35m7[0md70, [33mU[0m+[35m7[0m...
  [90m192 |[0m }
  [90m193 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:214:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m212 |[0m   font-weight: [35m400[0m;
  [90m213 |[0m   font-display: swap;
[31m[1m>[0m [90m214 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m215 |[0m   unicode-range: [33mU[0m+[35m7851[0m-[35m7852[0m, [33mU[0m+[35m785[0mc, [33mU[0m+[35m785[0me, [33mU[0m+[35m7860[0m-[35m7861[0m, [33mU[0m+[35m7863[0m-[35m7864[0m, [33mU[0m+[35m7868[0m, [33mU[0m+[35m786[0ma, [33mU[0m.[35m..[0m
  [90m216 |[0m }
  [90m217 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:246:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m244 |[0m   font-weight: [35m400[0m;
  [90m245 |[0m   font-display: swap;
[31m[1m>[0m [90m246 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m247 |[0m   unicode-range: [33mU[0m+[35m7166[0m, [33mU[0m+[35m7168[0m, [33mU[0m+[35m716[0mc, [33mU[0m+[35m7179[0m, [33mU[0m+[35m7180[0m, [33mU[0m+[35m7184[0m-[35m7185[0m, [33mU[0m+[35m7187[0m-[35m7188[0m, [33mU[0m+[35m718[0mc..[33m.[0m
  [90m248 |[0m }
  [90m249 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:254:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m252 |[0m   font-weight: [35m400[0m;
  [90m253 |[0m   font-display: swap;
[31m[1m>[0m [90m254 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m255 |[0m   unicode-range: [33mU[0m+[35m6[0mf58-[35m6[0mf5b, [33mU[0m+[35m6[0mf5d-[35m6[0mf5e, [33mU[0m+[35m6[0mf60-[35m6[0mf62, [33mU[0m+[35m6[0mf66, [33mU[0m+[35m6[0mf68, [33mU[0m+[35m6[0mf6c-[35m6[0mf6d, [33mU[0m+[35m6[0mf...
  [90m256 |[0m }
  [90m257 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:262:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m260 |[0m   font-weight: [35m400[0m;
  [90m261 |[0m   font-display: swap;
[31m[1m>[0m [90m262 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m263 |[0m   unicode-range: [33mU[0m+[35m6[0md7c, [33mU[0m+[35m6[0md80-[35m6[0md82, [33mU[0m+[35m6[0md85, [33mU[0m+[35m6[0md87, [33mU[0m+[35m6[0md89-[35m6[0md8a, [33mU[0m+[35m6[0md8c-[35m6[0md8e, [33mU[0m+[35m6[0md91-[35m6[0md...
  [90m264 |[0m }
  [90m265 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:278:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m276 |[0m   font-weight: [35m400[0m;
  [90m277 |[0m   font-display: swap;
[31m[1m>[0m [90m278 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m279 |[0m   unicode-range: [33mU[0m+[35m69[0mdd-[35m69[0mde, [33mU[0m+[35m69e2[0m-[35m69e3[0m, [33mU[0m+[35m69e5[0m, [33mU[0m+[35m69e7[0m-[35m69[0meb, [33mU[0m+[35m69[0med-[35m69[0mef, [33mU[0m+[35m69[0mf1-[35m69[0mf6,.[33m.[0m.
  [90m280 |[0m }
  [90m281 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:286:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m284 |[0m   font-weight: [35m400[0m;
  [90m285 |[0m   font-display: swap;
[31m[1m>[0m [90m286 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m287 |[0m   unicode-range: [33mU[0m+[35m6855[0m, [33mU[0m+[35m6857[0m-[35m6859[0m, [33mU[0m+[35m685[0mb, [33mU[0m+[35m685[0md, [33mU[0m+[35m685[0mf, [33mU[0m+[35m6863[0m, [33mU[0m+[35m6867[0m, [33mU[0m+[35m686[0mb, [33mU[0m+[35m6...[0m
  [90m288 |[0m }
  [90m289 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:294:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m292 |[0m   font-weight: [35m400[0m;
  [90m293 |[0m   font-display: swap;
[31m[1m>[0m [90m294 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m295 |[0m   unicode-range: [33mU[0m+[35m667e-6680[0m, [33mU[0m+[35m6683[0m-[35m6684[0m, [33mU[0m+[35m6688[0m, [33mU[0m+[35m668[0mb-[35m668[0me, [33mU[0m+[35m6690[0m, [33mU[0m+[35m6692[0m, [33mU[0m+[35m6698[0m-[35m66.[0m..
  [90m296 |[0m }
  [90m297 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:302:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m300 |[0m   font-weight: [35m400[0m;
  [90m301 |[0m   font-display: swap;
[31m[1m>[0m [90m302 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m303 |[0m   unicode-range: [33mU[0m+[35m64[0md2, [33mU[0m+[35m64[0md4-[35m64[0md5, [33mU[0m+[35m64[0md7-[35m64[0md8, [33mU[0m+[35m64[0mda, [33mU[0m+[35m64e0[0m-[35m64e1[0m, [33mU[0m+[35m64e3[0m-[35m64e5[0m, [33mU[0m+[35m64..[0m.
  [90m304 |[0m }
  [90m305 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:310:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m308 |[0m   font-weight: [35m400[0m;
  [90m309 |[0m   font-display: swap;
[31m[1m>[0m [90m310 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m311 |[0m   unicode-range: [33mU[0m+[35m62[0mcf, [33mU[0m+[35m62[0md1, [33mU[0m+[35m62[0md4-[35m62[0md6, [33mU[0m+[35m62[0mda, [33mU[0m+[35m62[0mdc, [33mU[0m+[35m62[0mea, [33mU[0m+[35m62[0mee-[35m62[0mef, [33mU[0m+[35m62[0mf1.[35m..[0m
  [90m312 |[0m }
  [90m313 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:318:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m316 |[0m   font-weight: [35m400[0m;
  [90m317 |[0m   font-display: swap;
[31m[1m>[0m [90m318 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m319 |[0m   unicode-range: [33mU[0m+[35m6117[0m, [33mU[0m+[35m6119[0m, [33mU[0m+[35m611[0mc, [33mU[0m+[35m611[0me, [33mU[0m+[35m6120[0m-[35m6122[0m, [33mU[0m+[35m6127[0m-[35m6128[0m, [33mU[0m+[35m612[0ma-[35m612[0mc, [33mU[0m.[35m..[0m
  [90m320 |[0m }
  [90m321 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:326:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m324 |[0m   font-weight: [35m400[0m;
  [90m325 |[0m   font-display: swap;
[31m[1m>[0m [90m326 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m327 |[0m   unicode-range: [33mU[0m+[35m5[0mf6c-[35m5[0mf6d, [33mU[0m+[35m5[0mf6f, [33mU[0m+[35m5[0mf72-[35m5[0mf75, [33mU[0m+[35m5[0mf78, [33mU[0m+[35m5[0mf7a, [33mU[0m+[35m5[0mf7d-[35m5[0mf7f, [33mU[0m+[35m5[0mf82-[35m5[0mf...
  [90m328 |[0m }
  [90m329 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:334:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m332 |[0m   font-weight: [35m400[0m;
  [90m333 |[0m   font-display: swap;
[31m[1m>[0m [90m334 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m335 |[0m   unicode-range: [33mU[0m+[35m5[0md9b, [33mU[0m+[35m5[0md9d, [33mU[0m+[35m5[0md9f-[35m5[0mda0, [33mU[0m+[35m5[0mda2, [33mU[0m+[35m5[0mda4, [33mU[0m+[35m5[0mda7, [33mU[0m+[35m5[0mdab-[35m5[0mdac, [33mU[0m+[35m5[0mdae..[33m.[0m
  [90m336 |[0m }
  [90m337 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:350:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m348 |[0m   font-weight: [35m400[0m;
  [90m349 |[0m   font-display: swap;
[31m[1m>[0m [90m350 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m351 |[0m   unicode-range: [33mU[0m+[35m598[0mb-[35m598[0me, [33mU[0m+[35m5992[0m, [33mU[0m+[35m5995[0m, [33mU[0m+[35m5997[0m, [33mU[0m+[35m599[0mb, [33mU[0m+[35m599[0md, [33mU[0m+[35m599[0mf, [33mU[0m+[35m59[0ma3-[35m59[0ma4..[33m.[0m
  [90m352 |[0m }
  [90m353 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:366:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m364 |[0m   font-weight: [35m400[0m;
  [90m365 |[0m   font-display: swap;
[31m[1m>[0m [90m366 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m367 |[0m   unicode-range: [33mU[0m+[35m5616[0m-[35m5617[0m, [33mU[0m+[35m5619[0m, [33mU[0m+[35m561[0mb, [33mU[0m+[35m5620[0m, [33mU[0m+[35m5628[0m, [33mU[0m+[35m562[0mc, [33mU[0m+[35m562[0mf-[35m5639[0m, [33mU[0m+[35m563[0mb.[35m..[0m
  [90m368 |[0m }
  [90m369 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:374:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m372 |[0m   font-weight: [35m400[0m;
  [90m373 |[0m   font-display: swap;
[31m[1m>[0m [90m374 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m375 |[0m   unicode-range: [33mU[0m+[35m543[0mf-[35m5440[0m, [33mU[0m+[35m5443[0m-[35m5444[0m, [33mU[0m+[35m5447[0m, [33mU[0m+[35m544[0mc-[35m544[0mf, [33mU[0m+[35m5455[0m, [33mU[0m+[35m545[0me, [33mU[0m+[35m5462[0m, [33mU[0m.[35m..[0m
  [90m376 |[0m }
  [90m377 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:382:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m380 |[0m   font-weight: [35m400[0m;
  [90m381 |[0m   font-display: swap;
[31m[1m>[0m [90m382 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m383 |[0m   unicode-range: [33mU[0m+[35m528[0md, [33mU[0m+[35m5291[0m-[35m5298[0m, [33mU[0m+[35m529[0ma, [33mU[0m+[35m529[0mc, [33mU[0m+[35m52[0ma4-[35m52[0ma7, [33mU[0m+[35m52[0mab-[35m52[0mad, [33mU[0m+[35m52[0maf-[35m52[0m...
  [90m384 |[0m }
  [90m385 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:406:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m404 |[0m   font-weight: [35m400[0m;
  [90m405 |[0m   font-display: swap;
[31m[1m>[0m [90m406 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m407 |[0m   unicode-range: [33mU[0m+[35m4093[0m, [33mU[0m+[35m4103[0m, [33mU[0m+[35m4105[0m, [33mU[0m+[35m4148[0m, [33mU[0m+[35m414[0mf, [33mU[0m+[35m4163[0m, [33mU[0m+[35m41[0mb4, [33mU[0m+[35m41[0mbf, [33mU[0m+[35m41e6[0m, [33m.[0m.[35m.[0m
  [90m408 |[0m }
  [90m409 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:422:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m420 |[0m   font-weight: [35m400[0m;
  [90m421 |[0m   font-display: swap;
[31m[1m>[0m [90m422 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m423 |[0m   unicode-range: [33mU[0m+[35m32[0mb5-[35m332[0mb, [33mU[0m+[35m332[0md-[35m3394[0m;
  [90m424 |[0m }
  [90m425 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:446:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m444 |[0m   font-weight: [35m400[0m;
  [90m445 |[0m   font-display: swap;
[31m[1m>[0m [90m446 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m447 |[0m   unicode-range: [33mU[0m+[35m2[0mf14-[35m2[0mfd5, [33mU[0m+[35m2[0mff0-[35m2[0mffb, [33mU[0m+[35m3004[0m, [33mU[0m+[35m3013[0m, [33mU[0m+[35m3016[0m-[35m301[0mb, [33mU[0m+[35m301[0me, [33mU[0m+[35m3020[0m-[35m3027[0m;
  [90m448 |[0m }
  [90m449 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:454:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m452 |[0m   font-weight: [35m400[0m;
  [90m453 |[0m   font-display: swap;
[31m[1m>[0m [90m454 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m455 |[0m   unicode-range: [33mU[0m+[35m25e4[0m-[35m25e6[0m, [33mU[0m+[35m2601[0m-[35m2603[0m, [33mU[0m+[35m2609[0m, [33mU[0m+[35m260e-260[0mf, [33mU[0m+[35m2616[0m-[35m2617[0m, [33mU[0m+[35m261[0mc-[35m261[0mf,.[33m.[0m.
  [90m456 |[0m }
  [90m457 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:462:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m460 |[0m   font-weight: [35m400[0m;
  [90m461 |[0m   font-display: swap;
[31m[1m>[0m [90m462 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m463 |[0m   unicode-range: [33mU[0m+[35m24[0md1-[35m24[0mff, [33mU[0m+[35m2503[0m-[35m2513[0m, [33mU[0m+[35m2515[0m-[35m2516[0m, [33mU[0m+[35m2518[0m-[35m251[0mb, [33mU[0m+[35m251[0md-[35m2522[0m, [33mU[0m+[35m2524[0m-[35m...[0m
  [90m464 |[0m }
  [90m465 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:470:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m468 |[0m   font-weight: [35m400[0m;
  [90m469 |[0m   font-display: swap;
[31m[1m>[0m [90m470 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m471 |[0m   unicode-range: [33mU[0m+[35m2105[0m, [33mU[0m+[35m2109[0m-[35m210[0ma, [33mU[0m+[35m210[0mf, [33mU[0m+[35m2116[0m, [33mU[0m+[35m2121[0m, [33mU[0m+[35m2126[0m-[35m2127[0m, [33mU[0m+[35m212[0mb, [33mU[0m+[35m212[0me..[33m.[0m
  [90m472 |[0m }
  [90m473 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:502:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m500 |[0m   font-weight: [35m400[0m;
  [90m501 |[0m   font-display: swap;
[31m[1m>[0m [90m502 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m503 |[0m   unicode-range: [33mU[0m+[35m2[0md9, [33mU[0m+[35m21[0md4, [33mU[0m+[35m301[0md, [33mU[0m+[35m515[0mc, [33mU[0m+[35m52[0mfe, [33mU[0m+[35m5420[0m, [33mU[0m+[35m5750[0m, [33mU[0m+[35m5766[0m, [33mU[0m+[35m5954[0m, [33mU[0m.[35m.[0m.
  [90m504 |[0m }
  [90m505 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:526:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m524 |[0m   font-weight: [35m400[0m;
  [90m525 |[0m   font-display: swap;
[31m[1m>[0m [90m526 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m527 |[0m   unicode-range: [33mU[0m+b1, [33mU[0m+[35m309[0mb, [33mU[0m+[35m4e5[0me, [33mU[0m+[35m51[0mf1, [33mU[0m+[35m5506[0m, [33mU[0m+[35m55[0mc5, [33mU[0m+[35m58[0mcc, [33mU[0m+[35m59[0md1, [33mU[0m+[35m5[0mc51, [33mU[0m+[35m.[0m..
  [90m528 |[0m }
  [90m529 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:542:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m540 |[0m   font-weight: [35m400[0m;
  [90m541 |[0m   font-display: swap;
[31m[1m>[0m [90m542 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m543 |[0m   unicode-range: [33mU[0m+[35m2466[0m, [33mU[0m+[35m2600[0m, [33mU[0m+[35m4[0meab, [33mU[0m+[35m4[0mfe3, [33mU[0m+[35m4[0mff5, [33mU[0m+[35m51[0ma5, [33mU[0m+[35m51[0mf0, [33mU[0m+[35m536[0mf, [33mU[0m+[35m53[0md4, [33m.[0m.[35m.[0m
  [90m544 |[0m }
  [90m545 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:550:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m548 |[0m   font-weight: [35m400[0m;
  [90m549 |[0m   font-display: swap;
[31m[1m>[0m [90m550 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m551 |[0m   unicode-range: [33mU[0m+[35m251[0mc, [33mU[0m+[35m2523[0m, [33mU[0m+[35m4e14[0m, [33mU[0m+[35m545[0mf, [33mU[0m+[35m54[0mbd, [33mU[0m+[35m553[0me, [33mU[0m+[35m55[0mdc, [33mU[0m+[35m56[0mda, [33mU[0m+[35m589[0mc, [33m.[0m.[35m.[0m
  [90m552 |[0m }
  [90m553 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:558:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m556 |[0m   font-weight: [35m400[0m;
  [90m557 |[0m   font-display: swap;
[31m[1m>[0m [90m558 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m559 |[0m   unicode-range: [33mU[0m+[35m2003[0m, [33mU[0m+[35m2312[0m, [33mU[0m+[35m266[0mc, [33mU[0m+[35m4[0mf86, [33mU[0m+[35m51[0mea, [33mU[0m+[35m5243[0m, [33mU[0m+[35m5256[0m, [33mU[0m+[35m541[0mf, [33mU[0m+[35m5841[0m, [33m.[0m.[35m.[0m
  [90m560 |[0m }
  [90m561 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:566:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m564 |[0m   font-weight: [35m400[0m;
  [90m565 |[0m   font-display: swap;
[31m[1m>[0m [90m566 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m567 |[0m   unicode-range: [33mU[0m+[35m266[0mb, [33mU[0m+[35m3006[0m, [33mU[0m+[35m5176[0m, [33mU[0m+[35m5197[0m, [33mU[0m+[35m51[0ma8, [33mU[0m+[35m51[0mc6, [33mU[0m+[35m52[0mf2, [33mU[0m+[35m5614[0m, [33mU[0m+[35m5875[0m, [33m.[0m.[35m.[0m
  [90m568 |[0m }
  [90m569 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:574:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m572 |[0m   font-weight: [35m400[0m;
  [90m573 |[0m   font-display: swap;
[31m[1m>[0m [90m574 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m575 |[0m   unicode-range: [33mU[0m+af, [33mU[0m+[35m2465[0m, [33mU[0m+[35m2517[0m, [33mU[0m+[35m33[0ma1, [33mU[0m+[35m4[0mf10, [33mU[0m+[35m50[0mc5, [33mU[0m+[35m51[0mb4, [33mU[0m+[35m5384[0m, [33mU[0m+[35m5606[0m, [33mU[0m+[35m.[0m..
  [90m576 |[0m }
  [90m577 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:614:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m612 |[0m   font-weight: [35m400[0m;
  [90m613 |[0m   font-display: swap;
[31m[1m>[0m [90m614 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m615 |[0m   unicode-range: [33mU[0m+[35m2266[0m-[35m2267[0m, [33mU[0m+[35m4[0mf2f, [33mU[0m+[35m5208[0m, [33mU[0m+[35m5451[0m, [33mU[0m+[35m546[0ma, [33mU[0m+[35m5589[0m, [33mU[0m+[35m576[0ma, [33mU[0m+[35m5815[0m, [33mU[0m+[35m5[0m...
  [90m616 |[0m }
  [90m617 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:630:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m628 |[0m   font-weight: [35m400[0m;
  [90m629 |[0m   font-display: swap;
[31m[1m>[0m [90m630 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m631 |[0m   unicode-range: [33mU[0m+[35m4e32[0m, [33mU[0m+[35m51[0mdb, [33mU[0m+[35m53[0ma8, [33mU[0m+[35m53[0mea, [33mU[0m+[35m5609[0m, [33mU[0m+[35m5674[0m, [33mU[0m+[35m5[0ma92, [33mU[0m+[35m5e7[0me, [33mU[0m+[35m6115[0m, [33m.[0m.[35m.[0m
  [90m632 |[0m }
  [90m633 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:638:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m636 |[0m   font-weight: [35m400[0m;
  [90m637 |[0m   font-display: swap;
[31m[1m>[0m [90m638 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m639 |[0m   unicode-range: [33mU[0m+[35m25[0mb3, [33mU[0m+[35m30[0mf5, [33mU[0m+[35m4[0meae, [33mU[0m+[35m4[0mf46, [33mU[0m+[35m4[0mf51, [33mU[0m+[35m5203[0m, [33mU[0m+[35m52[0mff, [33mU[0m+[35m55[0ma7, [33mU[0m+[35m564[0mc, [33m.[0m.[35m.[0m
  [90m640 |[0m }
  [90m641 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:662:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m660 |[0m   font-weight: [35m400[0m;
  [90m661 |[0m   font-display: swap;
[31m[1m>[0m [90m662 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m663 |[0m   unicode-range: [33mU[0m+[35m2103[0m, [33mU[0m+[35m5049[0m, [33mU[0m+[35m52[0mb1, [33mU[0m+[35m5320[0m, [33mU[0m+[35m5553[0m, [33mU[0m+[35m572[0md, [33mU[0m+[35m58[0mc7, [33mU[0m+[35m5[0mb5d, [33mU[0m+[35m5[0mbc2, [33m.[0m.[35m.[0m
  [90m664 |[0m }
  [90m665 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:670:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m668 |[0m   font-weight: [35m400[0m;
  [90m669 |[0m   font-display: swap;
[31m[1m>[0m [90m670 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m671 |[0m   unicode-range: [33mU[0m+[35m2500[0m, [33mU[0m+[35m3008[0m-[35m3009[0m, [33mU[0m+[35m4[0mead, [33mU[0m+[35m4[0mf0f, [33mU[0m+[35m4[0mfca, [33mU[0m+[35m53[0meb, [33mU[0m+[35m543[0me, [33mU[0m+[35m57[0ma2, [33mU[0m+[35m5[0m...
  [90m672 |[0m }
  [90m673 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:686:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m684 |[0m   font-weight: [35m400[0m;
  [90m685 |[0m   font-display: swap;
[31m[1m>[0m [90m686 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m687 |[0m   unicode-range: [33mU[0m+[35m25[0mc7, [33mU[0m+[35m3007[0m, [33mU[0m+[35m504[0mf, [33mU[0m+[35m507[0md, [33mU[0m+[35m51[0ma0, [33mU[0m+[35m52[0ma3, [33mU[0m+[35m5410[0m, [33mU[0m+[35m5510[0m, [33mU[0m+[35m559[0ma, [33m.[0m.[35m.[0m
  [90m688 |[0m }
  [90m689 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:694:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m692 |[0m   font-weight: [35m400[0m;
  [90m693 |[0m   font-display: swap;
[31m[1m>[0m [90m694 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m695 |[0m   unicode-range: [33mU[0m+[35m24[0m, [33mU[0m+[35m2022[0m, [33mU[0m+[35m2212[0m, [33mU[0m+[35m221[0mf, [33mU[0m+[35m2665[0m, [33mU[0m+[35m4[0mecf, [33mU[0m+[35m5100[0m, [33mU[0m+[35m51[0mcd, [33mU[0m+[35m52[0md8, [33mU[0m+[35m...[0m
  [90m696 |[0m }
  [90m697 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:702:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m700 |[0m   font-weight: [35m400[0m;
  [90m701 |[0m   font-display: swap;
[31m[1m>[0m [90m702 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m703 |[0m   unicode-range: [33mU[0m+b0, [33mU[0m+[35m226[0ma, [33mU[0m+[35m2462[0m, [33mU[0m+[35m4e39[0m, [33mU[0m+[35m4[0mfc3, [33mU[0m+[35m4[0mfd7, [33mU[0m+[35m50[0mbe, [33mU[0m+[35m50[0mda, [33mU[0m+[35m5200[0m, [33mU[0m+[35m...[0m
  [90m704 |[0m }
  [90m705 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:710:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m708 |[0m   font-weight: [35m400[0m;
  [90m709 |[0m   font-display: swap;
[31m[1m>[0m [90m710 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m711 |[0m   unicode-range: [33mU[0m+[35m25[0mbd, [33mU[0m+[35m4e59[0m, [33mU[0m+[35m4[0mec1, [33mU[0m+[35m4[0mff3, [33mU[0m+[35m515[0ma, [33mU[0m+[35m518[0ma, [33mU[0m+[35m525[0mb, [33mU[0m+[35m5375[0m, [33mU[0m+[35m552[0mf, [33m.[0m.[35m.[0m
  [90m712 |[0m }
  [90m713 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:726:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m724 |[0m   font-weight: [35m400[0m;
  [90m725 |[0m   font-display: swap;
[31m[1m>[0m [90m726 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m727 |[0m   unicode-range: [33mU[0m+[35m4e18[0m, [33mU[0m+[35m4[0mfb5, [33mU[0m+[35m5104[0m, [33mU[0m+[35m52[0mc7, [33mU[0m+[35m5353[0m, [33mU[0m+[35m5374[0m, [33mU[0m+[35m53e5[0m, [33mU[0m+[35m587[0me, [33mU[0m+[35m594[0mf, [33m.[0m.[35m.[0m
  [90m728 |[0m }
  [90m729 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:734:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m732 |[0m   font-weight: [35m400[0m;
  [90m733 |[0m   font-display: swap;
[31m[1m>[0m [90m734 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m735 |[0m   unicode-range: [33mU[0m+[35m60[0m, [33mU[0m+[35m2200[0m, [33mU[0m+[35m226[0mb, [33mU[0m+[35m2461[0m, [33mU[0m+[35m517[0mc, [33mU[0m+[35m526[0mf, [33mU[0m+[35m5800[0m, [33mU[0m+[35m5[0mb97, [33mU[0m+[35m5[0mbf8, [33mU[0m+[35m.[0m..
  [90m736 |[0m }
  [90m737 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:742:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m740 |[0m   font-weight: [35m400[0m;
  [90m741 |[0m   font-display: swap;
[31m[1m>[0m [90m742 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m743 |[0m   unicode-range: [33mU[0m+[35m2460[0m, [33mU[0m+[35m4e5[0mf, [33mU[0m+[35m4e7[0me, [33mU[0m+[35m4[0med9, [33mU[0m+[35m501[0mf, [33mU[0m+[35m502[0mb, [33mU[0m+[35m5968[0m, [33mU[0m+[35m5974[0m, [33mU[0m+[35m5[0mac1, [33m.[0m.[35m.[0m
  [90m744 |[0m }
  [90m745 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:750:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m748 |[0m   font-weight: [35m400[0m;
  [90m749 |[0m   font-display: swap;
[31m[1m>[0m [90m750 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m751 |[0m   unicode-range: [33mU[0m+[35m21[0md2, [33mU[0m+[35m25[0mce, [33mU[0m+[35m300[0ma-[35m300[0mb, [33mU[0m+[35m4e89[0m, [33mU[0m+[35m4e9[0mc, [33mU[0m+[35m4[0mea1, [33mU[0m+[35m5263[0m, [33mU[0m+[35m53[0mcc, [33mU[0m+[35m5...[0m
  [90m752 |[0m }
  [90m753 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:758:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m756 |[0m   font-weight: [35m400[0m;
  [90m757 |[0m   font-display: swap;
[31m[1m>[0m [90m758 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m759 |[0m   unicode-range: [33mU[0m+[35m2015[0m, [33mU[0m+[35m2190[0m, [33mU[0m+[35m4e43[0m, [33mU[0m+[35m5019[0m, [33mU[0m+[35m5247[0m, [33mU[0m+[35m52e7[0m, [33mU[0m+[35m5438[0m, [33mU[0m+[35m54[0mb2, [33mU[0m+[35m55[0mab, [33m.[0m.[35m.[0m
  [90m760 |[0m }
  [90m761 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:774:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m772 |[0m   font-weight: [35m400[0m;
  [90m773 |[0m   font-display: swap;
[31m[1m>[0m [90m774 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m775 |[0m   unicode-range: [33mU[0m+[35m4e03[0m, [33mU[0m+[35m4[0mf38, [33mU[0m+[35m50[0mb7, [33mU[0m+[35m5264[0m, [33mU[0m+[35m5348[0m, [33mU[0m+[35m5371[0m, [33mU[0m+[35m585[0ma, [33mU[0m+[35m58[0mca, [33mU[0m+[35m5951[0m, [33m.[0m.[35m.[0m
  [90m776 |[0m }
  [90m777 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:782:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m780 |[0m   font-weight: [35m400[0m;
  [90m781 |[0m   font-display: swap;
[31m[1m>[0m [90m782 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m783 |[0m   unicode-range: [33mU[0m+[35m7[0me, [33mU[0m+b4, [33mU[0m+[35m25[0mc6, [33mU[0m+[35m2661[0m, [33mU[0m+[35m4e92[0m, [33mU[0m+[35m4[0meee, [33mU[0m+[35m4[0mffa, [33mU[0m+[35m5144[0m, [33mU[0m+[35m5237[0m, [33mU[0m+[35m52..[0m.
  [90m784 |[0m }
  [90m785 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:790:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m788 |[0m   font-weight: [35m400[0m;
  [90m789 |[0m   font-display: swap;
[31m[1m>[0m [90m790 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m791 |[0m   unicode-range: [33mU[0m+[35m25[0mcb, [33mU[0m+[35m4e71[0m, [33mU[0m+[35m4[0mf59, [33mU[0m+[35m50[0md5, [33mU[0m+[35m520[0ma, [33mU[0m+[35m5217[0m, [33mU[0m+[35m5230[0m, [33mU[0m+[35m523[0ma-[35m523[0mb, [33mU[0m+[35m5..[0m.
  [90m792 |[0m }
  [90m793 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:814:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m812 |[0m   font-weight: [35m400[0m;
  [90m813 |[0m   font-display: swap;
[31m[1m>[0m [90m814 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m815 |[0m   unicode-range: [33mU[0m+[35m25[0mbc, [33mU[0m+[35m3012[0m, [33mU[0m+[35m4[0mef2, [33mU[0m+[35m4[0mf0a, [33mU[0m+[35m516[0mb, [33mU[0m+[35m5373[0m, [33mU[0m+[35m539[0ma, [33mU[0m+[35m53[0mb3, [33mU[0m+[35m559[0mc, [33m.[0m.[35m.[0m
  [90m816 |[0m }
  [90m817 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:822:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m820 |[0m   font-weight: [35m400[0m;
  [90m821 |[0m   font-display: swap;
[31m[1m>[0m [90m822 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m823 |[0m   unicode-range: [33mU[0m+[35m3[0md, [33mU[0m+[35m5[0me, [33mU[0m+[35m25[0mcf, [33mU[0m+[35m4e0[0me, [33mU[0m+[35m4e5[0md, [33mU[0m+[35m4e73[0m, [33mU[0m+[35m4e94[0m, [33mU[0m+[35m4[0mf3c, [33mU[0m+[35m5009[0m, [33mU[0m+[35m51..[0m.
  [90m824 |[0m }
  [90m825 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:830:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m828 |[0m   font-weight: [35m400[0m;
  [90m829 |[0m   font-display: swap;
[31m[1m>[0m [90m830 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m831 |[0m   unicode-range: [33mU[0m+[35m500[0md, [33mU[0m+[35m5074[0m, [33mU[0m+[35m50[0mcd, [33mU[0m+[35m5175[0m, [33mU[0m+[35m52e2[0m, [33mU[0m+[35m5352[0m, [33mU[0m+[35m5354[0m, [33mU[0m+[35m53[0mf2, [33mU[0m+[35m5409[0m, [33m.[0m.[35m.[0m
  [90m832 |[0m }
  [90m833 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:870:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m868 |[0m   font-weight: [35m400[0m;
  [90m869 |[0m   font-display: swap;
[31m[1m>[0m [90m870 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m871 |[0m   unicode-range: [33mU[0m+[35m2605[0m-[35m2606[0m, [33mU[0m+[35m301[0mc, [33mU[0m+[35m4e57[0m, [33mU[0m+[35m4[0mfee, [33mU[0m+[35m5065[0m, [33mU[0m+[35m52[0mdf, [33mU[0m+[35m533[0mb, [33mU[0m+[35m5357[0m, [33mU[0m+[35m5.[0m..
  [90m872 |[0m }
  [90m873 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:902:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m900 |[0m   font-weight: [35m400[0m;
  [90m901 |[0m   font-display: swap;
[31m[1m>[0m [90m902 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m903 |[0m   unicode-range: [33mU[0m+[35m4e16[0m, [33mU[0m+[35m4e3[0mb, [33mU[0m+[35m4[0mea4, [33mU[0m+[35m4[0mee4, [33mU[0m+[35m4[0mf4d, [33mU[0m+[35m4[0mf4f, [33mU[0m+[35m4[0mf55, [33mU[0m+[35m4[0mf9b, [33mU[0m+[35m5317[0m, [33m.[0m.[35m.[0m
  [90m904 |[0m }
  [90m905 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:910:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m908 |[0m   font-weight: [35m400[0m;
  [90m909 |[0m   font-display: swap;
[31m[1m>[0m [90m910 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m911 |[0m   unicode-range: [33mU[0m+[35m26[0m, [33mU[0m+[35m5[0mf, [33mU[0m+[35m2026[0m, [33mU[0m+[35m203[0mb, [33mU[0m+[35m4e09[0m, [33mU[0m+[35m4[0meac, [33mU[0m+[35m4[0med5, [33mU[0m+[35m4[0mfa1, [33mU[0m+[35m5143[0m, [33mU[0m+[35m51..[0m.
  [90m912 |[0m }
  [90m913 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:934:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m932 |[0m   font-weight: [35m400[0m;
  [90m933 |[0m   font-display: swap;
[31m[1m>[0m [90m934 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m935 |[0m   unicode-range: [33mU[0m+a9, [33mU[0m+[35m3010[0m-[35m3011[0m, [33mU[0m+[35m30e2[0m, [33mU[0m+[35m4e0[0mb, [33mU[0m+[35m4[0meca, [33mU[0m+[35m4[0med6, [33mU[0m+[35m4[0med8, [33mU[0m+[35m4[0mf53, [33mU[0m+[35m4[0mf5...
  [90m936 |[0m }
  [90m937 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:942:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m940 |[0m   font-weight: [35m400[0m;
  [90m941 |[0m   font-display: swap;
[31m[1m>[0m [90m942 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m943 |[0m   unicode-range: [33mU[0m+[35m4[0me, [33mU[0m+a0, [33mU[0m+[35m3000[0m, [33mU[0m+[35m300[0mc-[35m300[0md, [33mU[0m+[35m4e00[0m, [33mU[0m+[35m4e0[0ma, [33mU[0m+[35m4e2[0md, [33mU[0m+[35m4e8[0mb, [33mU[0m+[35m4[0meba,.[33m.[0m.
  [90m944 |[0m }
  [90m945 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:950:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m948 |[0m   font-weight: [35m400[0m;
  [90m949 |[0m   font-display: swap;
[31m[1m>[0m [90m950 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m951 |[0m   unicode-range: [33mU[0m+[35m21[0m-[35m22[0m, [33mU[0m+[35m27[0m-[35m2[0ma, [33mU[0m+[35m2[0mc-[35m3[0mb, [33mU[0m+[35m3[0mf, [33mU[0m+[35m41[0m-[35m4[0md, [33mU[0m+[35m4[0mf-[35m5[0md, [33mU[0m+[35m61[0m-[35m7[0mb, [33mU[0m+[35m7[0md, [33mU[0m+ab, [33m.[0m..
  [90m952 |[0m }
  [90m953 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:967:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m965 |[0m   font-weight: [35m400[0m;
  [90m966 |[0m   font-display: swap;
[31m[1m>[0m [90m967 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m968 |[0m   unicode-range: [33mU[0m+[35m0301[0m, [33mU[0m+[35m0400[0m-[35m045[0m[33mF[0m, [33mU[0m+[35m0490[0m-[35m0491[0m, [33mU[0m+[35m04[0m[33mB0[0m-[35m04[0m[33mB1[0m, [33mU[0m+[35m2116[0m;
  [90m969 |[0m }
  [90m970 |[0m [90m/* vietnamese */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:985:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m983 |[0m   font-weight: [35m400[0m;
  [90m984 |[0m   font-display: swap;
[31m[1m>[0m [90m985 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m986 |[0m   unicode-range: [33mU[0m+[35m0100[0m-[35m02[0m[33mBA[0m, [33mU[0m+[35m02[0m[33mBD[0m-[35m02[0m[33mC5[0m, [33mU[0m+[35m02[0m[33mC7[0m-[35m02[0m[33mCC[0m, [33mU[0m+[35m02[0m[33mCE[0m-[35m02[0m[33mD7[0m, [33mU[0m+[35m02[0m[33mDD[0m-[35m02[0m[33mFF[0m, [33mU[0m+[35m0304[0m,.[33m.[0m.
  [90m987 |[0m }
  [90m988 |[0m [90m/* latin */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:994:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m992 |[0m   font-weight: [35m400[0m;
  [90m993 |[0m   font-display: swap;
[31m[1m>[0m [90m994 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts.g...[0m
  [90m    |[0m        [31m[1m^[0m
  [90m995 |[0m   unicode-range: [33mU[0m+[35m0000[0m-[35m00[0m[33mFF[0m, [33mU[0m+[35m0131[0m, [33mU[0m+[35m0152[0m-[35m0153[0m, [33mU[0m+[35m02[0m[33mBB[0m-[35m02[0m[33mBC[0m, [33mU[0m+[35m02[0m[33mC6[0m, [33mU[0m+[35m02[0m[33mDA[0m, [33mU[0m+[35m02[0m[33mDC[0m, [33mU[0m.[35m..[0m
  [90m996 |[0m }
  [90m997 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1002:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1000 |[0m   font-weight: [35m500[0m;
  [90m1001 |[0m   font-display: swap;
[31m[1m>[0m [90m1002 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1003 |[0m   unicode-range: [33mU[0m+[35m25[0mee8, [33mU[0m+[35m25[0mf23, [33mU[0m+[35m25[0mf5c, [33mU[0m+[35m25[0mfd4, [33mU[0m+[35m25[0mfe0, [33mU[0m+[35m25[0mffb, [33mU[0m+[35m2600[0mc, [33mU[0m+[35m26017[0m,.[33m.[0m.
  [90m1004 |[0m }
  [90m1005 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1010:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1008 |[0m   font-weight: [35m500[0m;
  [90m1009 |[0m   font-display: swap;
[31m[1m>[0m [90m1010 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1011 |[0m   unicode-range: [33mU[0m+[35m1[0mf235-[35m1[0mf23b, [33mU[0m+[35m1[0mf240-[35m1[0mf248, [33mU[0m+[35m1[0mf250-[35m1[0mf251, [33mU[0m+[35m2000[0mb, [33mU[0m+[35m20089[0m-[35m2008[0ma, [33mU[0m+[35m...[0m
  [90m1012 |[0m }
  [90m1013 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1050:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1048 |[0m   font-weight: [35m500[0m;
  [90m1049 |[0m   font-display: swap;
[31m[1m>[0m [90m1050 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1051 |[0m   unicode-range: [33mU[0m+[35m9[0mc3e, [33mU[0m+[35m9[0mc41, [33mU[0m+[35m9[0mc43-[35m9[0mc4a, [33mU[0m+[35m9[0mc4e-[35m9[0mc50, [33mU[0m+[35m9[0mc52-[35m9[0mc54, [33mU[0m+[35m9[0mc56, [33mU[0m+[35m9[0mc58, [33m.[0m.[35m.[0m
  [90m1052 |[0m }
  [90m1053 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1058:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1056 |[0m   font-weight: [35m500[0m;
  [90m1057 |[0m   font-display: swap;
[31m[1m>[0m [90m1058 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1059 |[0m   unicode-range: [33mU[0m+[35m9[0mae5-[35m9[0mae7, [33mU[0m+[35m9[0mae9, [33mU[0m+[35m9[0maeb-[35m9[0maec, [33mU[0m+[35m9[0maee-[35m9[0maef, [33mU[0m+[35m9[0maf1-[35m9[0maf5, [33mU[0m+[35m9[0maf7, [33mU[0m+[35m9[0m...
  [90m1060 |[0m }
  [90m1061 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1066:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1064 |[0m   font-weight: [35m500[0m;
  [90m1065 |[0m   font-display: swap;
[31m[1m>[0m [90m1066 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1067 |[0m   unicode-range: [33mU[0m+[35m98[0meb, [33mU[0m+[35m98[0med-[35m98[0mee, [33mU[0m+[35m98[0mf0-[35m98[0mf1, [33mU[0m+[35m98[0mf3, [33mU[0m+[35m98[0mf6, [33mU[0m+[35m9902[0m, [33mU[0m+[35m9907[0m-[35m9909[0m, [33m.[0m.[35m.[0m
  [90m1068 |[0m }
  [90m1069 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1074:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1072 |[0m   font-weight: [35m500[0m;
  [90m1073 |[0m   font-display: swap;
[31m[1m>[0m [90m1074 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1075 |[0m   unicode-range: [33mU[0m+[35m971[0md, [33mU[0m+[35m9721[0m-[35m9724[0m, [33mU[0m+[35m9728[0m, [33mU[0m+[35m972[0ma, [33mU[0m+[35m9730[0m-[35m9731[0m, [33mU[0m+[35m9733[0m, [33mU[0m+[35m9736[0m, [33mU[0m+[35m973.[0m.[35m.[0m
  [90m1076 |[0m }
  [90m1077 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1082:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1080 |[0m   font-weight: [35m500[0m;
  [90m1081 |[0m   font-display: swap;
[31m[1m>[0m [90m1082 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1083 |[0m   unicode-range: [33mU[0m+[35m944[0ma, [33mU[0m+[35m944[0mc, [33mU[0m+[35m9452[0m-[35m9453[0m, [33mU[0m+[35m9455[0m, [33mU[0m+[35m9459[0m-[35m945[0mc, [33mU[0m+[35m945e-9463[0m, [33mU[0m+[35m9468[0m, [33m.[0m.[35m.[0m
  [90m1084 |[0m }
  [90m1085 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1090:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1088 |[0m   font-weight: [35m500[0m;
  [90m1089 |[0m   font-display: swap;
[31m[1m>[0m [90m1090 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1091 |[0m   unicode-range: [33mU[0m+[35m92[0mbc-[35m92[0mbd, [33mU[0m+[35m92[0mbf-[35m92[0mc3, [33mU[0m+[35m92[0mc5-[35m92[0mc8, [33mU[0m+[35m92[0mcb-[35m92[0md0, [33mU[0m+[35m92[0md2-[35m92[0md3, [33mU[0m+[35m92[0md5..[33m.[0m
  [90m1092 |[0m }
  [90m1093 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1106:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1104 |[0m   font-weight: [35m500[0m;
  [90m1105 |[0m   font-display: swap;
[31m[1m>[0m [90m1106 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1107 |[0m   unicode-range: [33mU[0m+[35m8[0mf52-[35m8[0mf55, [33mU[0m+[35m8[0mf57-[35m8[0mf58, [33mU[0m+[35m8[0mf5c-[35m8[0mf5e, [33mU[0m+[35m8[0mf61-[35m8[0mf66, [33mU[0m+[35m8[0mf9c-[35m8[0mf9d, [33mU[0m+[35m8[0mf9f.[35m.[0m.
  [90m1108 |[0m }
  [90m1109 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1114:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1112 |[0m   font-weight: [35m500[0m;
  [90m1113 |[0m   font-display: swap;
[31m[1m>[0m [90m1114 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1115 |[0m   unicode-range: [33mU[0m+[35m8[0mdc0, [33mU[0m+[35m8[0mdc2, [33mU[0m+[35m8[0mdc5-[35m8[0mdc8, [33mU[0m+[35m8[0mdca-[35m8[0mdcc, [33mU[0m+[35m8[0mdce-[35m8[0mdcf, [33mU[0m+[35m8[0mdd1, [33mU[0m+[35m8[0mdd4-[35m8[0m...
  [90m1116 |[0m }
  [90m1117 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1122:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1120 |[0m   font-weight: [35m500[0m;
  [90m1121 |[0m   font-display: swap;
[31m[1m>[0m [90m1122 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1123 |[0m   unicode-range: [33mU[0m+[35m8[0mb2d, [33mU[0m+[35m8[0mb30, [33mU[0m+[35m8[0mb37, [33mU[0m+[35m8[0mb3c, [33mU[0m+[35m8[0mb3e, [33mU[0m+[35m8[0mb41-[35m8[0mb46, [33mU[0m+[35m8[0mb48-[35m8[0mb49, [33mU[0m+[35m8[0mb4..[35m.[0m
  [90m1124 |[0m }
  [90m1125 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1130:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1128 |[0m   font-weight: [35m500[0m;
  [90m1129 |[0m   font-display: swap;
[31m[1m>[0m [90m1130 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1131 |[0m   unicode-range: [33mU[0m+[35m8973[0m-[35m8975[0m, [33mU[0m+[35m8977[0m, [33mU[0m+[35m897[0ma-[35m897[0me, [33mU[0m+[35m8980[0m, [33mU[0m+[35m8983[0m, [33mU[0m+[35m8988[0m-[35m898[0ma, [33mU[0m+[35m898[0md, [33m.[0m.[35m.[0m
  [90m1132 |[0m }
  [90m1133 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1138:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1136 |[0m   font-weight: [35m500[0m;
  [90m1137 |[0m   font-display: swap;
[31m[1m>[0m [90m1138 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1139 |[0m   unicode-range: [33mU[0m+[35m87e2[0m-[35m87e6[0m, [33mU[0m+[35m87[0mea-[35m87[0med, [33mU[0m+[35m87[0mef, [33mU[0m+[35m87[0mf1, [33mU[0m+[35m87[0mf3, [33mU[0m+[35m87[0mf5-[35m87[0mf8, [33mU[0m+[35m87[0mfa-[35m8.[0m..
  [90m1140 |[0m }
  [90m1141 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1146:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1144 |[0m   font-weight: [35m500[0m;
  [90m1145 |[0m   font-display: swap;
[31m[1m>[0m [90m1146 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1147 |[0m   unicode-range: [33mU[0m+[35m8655[0m-[35m8659[0m, [33mU[0m+[35m865[0mb, [33mU[0m+[35m865[0md-[35m8664[0m, [33mU[0m+[35m8667[0m, [33mU[0m+[35m8669[0m, [33mU[0m+[35m866[0mc, [33mU[0m+[35m866[0mf, [33mU[0m+[35m867.[0m..
  [90m1148 |[0m }
  [90m1149 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1154:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1152 |[0m   font-weight: [35m500[0m;
  [90m1153 |[0m   font-display: swap;
[31m[1m>[0m [90m1154 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1155 |[0m   unicode-range: [33mU[0m+[35m84[0mb4, [33mU[0m+[35m84[0mb9-[35m84[0mbb, [33mU[0m+[35m84[0mbd-[35m84[0mc2, [33mU[0m+[35m84[0mc6-[35m84[0mca, [33mU[0m+[35m84[0mcc-[35m84[0md1, [33mU[0m+[35m84[0md3, [33mU[0m+[35m8.[0m..
  [90m1156 |[0m }
  [90m1157 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1162:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1160 |[0m   font-weight: [35m500[0m;
  [90m1161 |[0m   font-display: swap;
[31m[1m>[0m [90m1162 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1163 |[0m   unicode-range: [33mU[0m+[35m82e8[0m, [33mU[0m+[35m82[0mea, [33mU[0m+[35m82[0med, [33mU[0m+[35m82[0mef, [33mU[0m+[35m82[0mf3-[35m82[0mf4, [33mU[0m+[35m82[0mf6-[35m82[0mf7, [33mU[0m+[35m82[0mf9, [33mU[0m+[35m82[0mf...
  [90m1164 |[0m }
  [90m1165 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1170:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1168 |[0m   font-weight: [35m500[0m;
  [90m1169 |[0m   font-display: swap;
[31m[1m>[0m [90m1170 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1171 |[0m   unicode-range: [33mU[0m+[35m814[0ma, [33mU[0m+[35m814[0mc, [33mU[0m+[35m8151[0m-[35m8153[0m, [33mU[0m+[35m8157[0m, [33mU[0m+[35m815[0mf-[35m8161[0m, [33mU[0m+[35m8165[0m-[35m8169[0m, [33mU[0m+[35m816[0md-[35m8..[0m.
  [90m1172 |[0m }
  [90m1173 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1178:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1176 |[0m   font-weight: [35m500[0m;
  [90m1177 |[0m   font-display: swap;
[31m[1m>[0m [90m1178 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1179 |[0m   unicode-range: [33mU[0m+[35m7[0mf77-[35m7[0mf79, [33mU[0m+[35m7[0mf7d-[35m7[0mf80, [33mU[0m+[35m7[0mf82-[35m7[0mf83, [33mU[0m+[35m7[0mf86-[35m7[0mf88, [33mU[0m+[35m7[0mf8b-[35m7[0mf8d, [33mU[0m+[35m7[0mf8f.[35m.[0m.
  [90m1180 |[0m }
  [90m1181 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1186:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1184 |[0m   font-weight: [35m500[0m;
  [90m1185 |[0m   font-display: swap;
[31m[1m>[0m [90m1186 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1187 |[0m   unicode-range: [33mU[0m+[35m7[0md57, [33mU[0m+[35m7[0md59-[35m7[0md5d, [33mU[0m+[35m7[0md63, [33mU[0m+[35m7[0md65, [33mU[0m+[35m7[0md67, [33mU[0m+[35m7[0md6a, [33mU[0m+[35m7[0md6e, [33mU[0m+[35m7[0md70, [33mU[0m+[35m.[0m..
  [90m1188 |[0m }
  [90m1189 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1210:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1208 |[0m   font-weight: [35m500[0m;
  [90m1209 |[0m   font-display: swap;
[31m[1m>[0m [90m1210 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1211 |[0m   unicode-range: [33mU[0m+[35m7851[0m-[35m7852[0m, [33mU[0m+[35m785[0mc, [33mU[0m+[35m785[0me, [33mU[0m+[35m7860[0m-[35m7861[0m, [33mU[0m+[35m7863[0m-[35m7864[0m, [33mU[0m+[35m7868[0m, [33mU[0m+[35m786[0ma, [33m.[0m.[35m.[0m
  [90m1212 |[0m }
  [90m1213 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1242:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1240 |[0m   font-weight: [35m500[0m;
  [90m1241 |[0m   font-display: swap;
[31m[1m>[0m [90m1242 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1243 |[0m   unicode-range: [33mU[0m+[35m7166[0m, [33mU[0m+[35m7168[0m, [33mU[0m+[35m716[0mc, [33mU[0m+[35m7179[0m, [33mU[0m+[35m7180[0m, [33mU[0m+[35m7184[0m-[35m7185[0m, [33mU[0m+[35m7187[0m-[35m7188[0m, [33mU[0m+[35m718[0m...
  [90m1244 |[0m }
  [90m1245 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1250:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1248 |[0m   font-weight: [35m500[0m;
  [90m1249 |[0m   font-display: swap;
[31m[1m>[0m [90m1250 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1251 |[0m   unicode-range: [33mU[0m+[35m6[0mf58-[35m6[0mf5b, [33mU[0m+[35m6[0mf5d-[35m6[0mf5e, [33mU[0m+[35m6[0mf60-[35m6[0mf62, [33mU[0m+[35m6[0mf66, [33mU[0m+[35m6[0mf68, [33mU[0m+[35m6[0mf6c-[35m6[0mf6d, [33mU[0m+[35m6[0m...
  [90m1252 |[0m }
  [90m1253 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1258:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1256 |[0m   font-weight: [35m500[0m;
  [90m1257 |[0m   font-display: swap;
[31m[1m>[0m [90m1258 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1259 |[0m   unicode-range: [33mU[0m+[35m6[0md7c, [33mU[0m+[35m6[0md80-[35m6[0md82, [33mU[0m+[35m6[0md85, [33mU[0m+[35m6[0md87, [33mU[0m+[35m6[0md89-[35m6[0md8a, [33mU[0m+[35m6[0md8c-[35m6[0md8e, [33mU[0m+[35m6[0md91-[35m6[0m...
  [90m1260 |[0m }
  [90m1261 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1274:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1272 |[0m   font-weight: [35m500[0m;
  [90m1273 |[0m   font-display: swap;
[31m[1m>[0m [90m1274 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1275 |[0m   unicode-range: [33mU[0m+[35m69[0mdd-[35m69[0mde, [33mU[0m+[35m69e2[0m-[35m69e3[0m, [33mU[0m+[35m69e5[0m, [33mU[0m+[35m69e7[0m-[35m69[0meb, [33mU[0m+[35m69[0med-[35m69[0mef, [33mU[0m+[35m69[0mf1-[35m69[0mf6..[33m.[0m
  [90m1276 |[0m }
  [90m1277 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1282:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1280 |[0m   font-weight: [35m500[0m;
  [90m1281 |[0m   font-display: swap;
[31m[1m>[0m [90m1282 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1283 |[0m   unicode-range: [33mU[0m+[35m6855[0m, [33mU[0m+[35m6857[0m-[35m6859[0m, [33mU[0m+[35m685[0mb, [33mU[0m+[35m685[0md, [33mU[0m+[35m685[0mf, [33mU[0m+[35m6863[0m, [33mU[0m+[35m6867[0m, [33mU[0m+[35m686[0mb, [33mU[0m+[35m...[0m
  [90m1284 |[0m }
  [90m1285 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1290:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1288 |[0m   font-weight: [35m500[0m;
  [90m1289 |[0m   font-display: swap;
[31m[1m>[0m [90m1290 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1291 |[0m   unicode-range: [33mU[0m+[35m667e-6680[0m, [33mU[0m+[35m6683[0m-[35m6684[0m, [33mU[0m+[35m6688[0m, [33mU[0m+[35m668[0mb-[35m668[0me, [33mU[0m+[35m6690[0m, [33mU[0m+[35m6692[0m, [33mU[0m+[35m6698[0m-[35m6..[0m.
  [90m1292 |[0m }
  [90m1293 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1298:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1296 |[0m   font-weight: [35m500[0m;
  [90m1297 |[0m   font-display: swap;
[31m[1m>[0m [90m1298 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1299 |[0m   unicode-range: [33mU[0m+[35m64[0md2, [33mU[0m+[35m64[0md4-[35m64[0md5, [33mU[0m+[35m64[0md7-[35m64[0md8, [33mU[0m+[35m64[0mda, [33mU[0m+[35m64e0[0m-[35m64e1[0m, [33mU[0m+[35m64e3[0m-[35m64e5[0m, [33mU[0m+[35m6...[0m
  [90m1300 |[0m }
  [90m1301 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1306:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1304 |[0m   font-weight: [35m500[0m;
  [90m1305 |[0m   font-display: swap;
[31m[1m>[0m [90m1306 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1307 |[0m   unicode-range: [33mU[0m+[35m62[0mcf, [33mU[0m+[35m62[0md1, [33mU[0m+[35m62[0md4-[35m62[0md6, [33mU[0m+[35m62[0mda, [33mU[0m+[35m62[0mdc, [33mU[0m+[35m62[0mea, [33mU[0m+[35m62[0mee-[35m62[0mef, [33mU[0m+[35m62[0mf..[35m.[0m
  [90m1308 |[0m }
  [90m1309 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1314:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1312 |[0m   font-weight: [35m500[0m;
  [90m1313 |[0m   font-display: swap;
[31m[1m>[0m [90m1314 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1315 |[0m   unicode-range: [33mU[0m+[35m6117[0m, [33mU[0m+[35m6119[0m, [33mU[0m+[35m611[0mc, [33mU[0m+[35m611[0me, [33mU[0m+[35m6120[0m-[35m6122[0m, [33mU[0m+[35m6127[0m-[35m6128[0m, [33mU[0m+[35m612[0ma-[35m612[0mc, [33m.[0m.[35m.[0m
  [90m1316 |[0m }
  [90m1317 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1322:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1320 |[0m   font-weight: [35m500[0m;
  [90m1321 |[0m   font-display: swap;
[31m[1m>[0m [90m1322 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1323 |[0m   unicode-range: [33mU[0m+[35m5[0mf6c-[35m5[0mf6d, [33mU[0m+[35m5[0mf6f, [33mU[0m+[35m5[0mf72-[35m5[0mf75, [33mU[0m+[35m5[0mf78, [33mU[0m+[35m5[0mf7a, [33mU[0m+[35m5[0mf7d-[35m5[0mf7f, [33mU[0m+[35m5[0mf82-[35m5[0m...
  [90m1324 |[0m }
  [90m1325 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1330:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1328 |[0m   font-weight: [35m500[0m;
  [90m1329 |[0m   font-display: swap;
[31m[1m>[0m [90m1330 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1331 |[0m   unicode-range: [33mU[0m+[35m5[0md9b, [33mU[0m+[35m5[0md9d, [33mU[0m+[35m5[0md9f-[35m5[0mda0, [33mU[0m+[35m5[0mda2, [33mU[0m+[35m5[0mda4, [33mU[0m+[35m5[0mda7, [33mU[0m+[35m5[0mdab-[35m5[0mdac, [33mU[0m+[35m5[0mda...
  [90m1332 |[0m }
  [90m1333 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1346:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1344 |[0m   font-weight: [35m500[0m;
  [90m1345 |[0m   font-display: swap;
[31m[1m>[0m [90m1346 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1347 |[0m   unicode-range: [33mU[0m+[35m598[0mb-[35m598[0me, [33mU[0m+[35m5992[0m, [33mU[0m+[35m5995[0m, [33mU[0m+[35m5997[0m, [33mU[0m+[35m599[0mb, [33mU[0m+[35m599[0md, [33mU[0m+[35m599[0mf, [33mU[0m+[35m59[0ma3-[35m59[0ma...
  [90m1348 |[0m }
  [90m1349 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1362:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1360 |[0m   font-weight: [35m500[0m;
  [90m1361 |[0m   font-display: swap;
[31m[1m>[0m [90m1362 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1363 |[0m   unicode-range: [33mU[0m+[35m5616[0m-[35m5617[0m, [33mU[0m+[35m5619[0m, [33mU[0m+[35m561[0mb, [33mU[0m+[35m5620[0m, [33mU[0m+[35m5628[0m, [33mU[0m+[35m562[0mc, [33mU[0m+[35m562[0mf-[35m5639[0m, [33mU[0m+[35m563[0m..[35m.[0m
  [90m1364 |[0m }
  [90m1365 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1370:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1368 |[0m   font-weight: [35m500[0m;
  [90m1369 |[0m   font-display: swap;
[31m[1m>[0m [90m1370 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1371 |[0m   unicode-range: [33mU[0m+[35m543[0mf-[35m5440[0m, [33mU[0m+[35m5443[0m-[35m5444[0m, [33mU[0m+[35m5447[0m, [33mU[0m+[35m544[0mc-[35m544[0mf, [33mU[0m+[35m5455[0m, [33mU[0m+[35m545[0me, [33mU[0m+[35m5462[0m, [33m.[0m.[35m.[0m
  [90m1372 |[0m }
  [90m1373 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1378:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1376 |[0m   font-weight: [35m500[0m;
  [90m1377 |[0m   font-display: swap;
[31m[1m>[0m [90m1378 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1379 |[0m   unicode-range: [33mU[0m+[35m528[0md, [33mU[0m+[35m5291[0m-[35m5298[0m, [33mU[0m+[35m529[0ma, [33mU[0m+[35m529[0mc, [33mU[0m+[35m52[0ma4-[35m52[0ma7, [33mU[0m+[35m52[0mab-[35m52[0mad, [33mU[0m+[35m52[0maf-[35m5.[0m..
  [90m1380 |[0m }
  [90m1381 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1402:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1400 |[0m   font-weight: [35m500[0m;
  [90m1401 |[0m   font-display: swap;
[31m[1m>[0m [90m1402 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1403 |[0m   unicode-range: [33mU[0m+[35m4093[0m, [33mU[0m+[35m4103[0m, [33mU[0m+[35m4105[0m, [33mU[0m+[35m4148[0m, [33mU[0m+[35m414[0mf, [33mU[0m+[35m4163[0m, [33mU[0m+[35m41[0mb4, [33mU[0m+[35m41[0mbf, [33mU[0m+[35m41e6[0m,.[33m.[0m.
  [90m1404 |[0m }
  [90m1405 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1418:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1416 |[0m   font-weight: [35m500[0m;
  [90m1417 |[0m   font-display: swap;
[31m[1m>[0m [90m1418 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1419 |[0m   unicode-range: [33mU[0m+[35m32[0mb5-[35m332[0mb, [33mU[0m+[35m332[0md-[35m3394[0m;
  [90m1420 |[0m }
  [90m1421 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1442:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1440 |[0m   font-weight: [35m500[0m;
  [90m1441 |[0m   font-display: swap;
[31m[1m>[0m [90m1442 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1443 |[0m   unicode-range: [33mU[0m+[35m2[0mf14-[35m2[0mfd5, [33mU[0m+[35m2[0mff0-[35m2[0mffb, [33mU[0m+[35m3004[0m, [33mU[0m+[35m3013[0m, [33mU[0m+[35m3016[0m-[35m301[0mb, [33mU[0m+[35m301[0me, [33mU[0m+[35m3020[0m-[35m3...[0m
  [90m1444 |[0m }
  [90m1445 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1450:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1448 |[0m   font-weight: [35m500[0m;
  [90m1449 |[0m   font-display: swap;
[31m[1m>[0m [90m1450 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1451 |[0m   unicode-range: [33mU[0m+[35m25e4[0m-[35m25e6[0m, [33mU[0m+[35m2601[0m-[35m2603[0m, [33mU[0m+[35m2609[0m, [33mU[0m+[35m260e-260[0mf, [33mU[0m+[35m2616[0m-[35m2617[0m, [33mU[0m+[35m261[0mc-[35m261[0mf..[33m.[0m
  [90m1452 |[0m }
  [90m1453 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1458:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1456 |[0m   font-weight: [35m500[0m;
  [90m1457 |[0m   font-display: swap;
[31m[1m>[0m [90m1458 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1459 |[0m   unicode-range: [33mU[0m+[35m24[0md1-[35m24[0mff, [33mU[0m+[35m2503[0m-[35m2513[0m, [33mU[0m+[35m2515[0m-[35m2516[0m, [33mU[0m+[35m2518[0m-[35m251[0mb, [33mU[0m+[35m251[0md-[35m2522[0m, [33mU[0m+[35m2524[0m.[35m..[0m
  [90m1460 |[0m }
  [90m1461 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1466:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1464 |[0m   font-weight: [35m500[0m;
  [90m1465 |[0m   font-display: swap;
[31m[1m>[0m [90m1466 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1467 |[0m   unicode-range: [33mU[0m+[35m2105[0m, [33mU[0m+[35m2109[0m-[35m210[0ma, [33mU[0m+[35m210[0mf, [33mU[0m+[35m2116[0m, [33mU[0m+[35m2121[0m, [33mU[0m+[35m2126[0m-[35m2127[0m, [33mU[0m+[35m212[0mb, [33mU[0m+[35m212[0m...
  [90m1468 |[0m }
  [90m1469 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1498:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1496 |[0m   font-weight: [35m500[0m;
  [90m1497 |[0m   font-display: swap;
[31m[1m>[0m [90m1498 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1499 |[0m   unicode-range: [33mU[0m+[35m2[0md9, [33mU[0m+[35m21[0md4, [33mU[0m+[35m301[0md, [33mU[0m+[35m515[0mc, [33mU[0m+[35m52[0mfe, [33mU[0m+[35m5420[0m, [33mU[0m+[35m5750[0m, [33mU[0m+[35m5766[0m, [33mU[0m+[35m5954[0m, [33m.[0m.[35m.[0m
  [90m1500 |[0m }
  [90m1501 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1522:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1520 |[0m   font-weight: [35m500[0m;
  [90m1521 |[0m   font-display: swap;
[31m[1m>[0m [90m1522 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1523 |[0m   unicode-range: [33mU[0m+b1, [33mU[0m+[35m309[0mb, [33mU[0m+[35m4e5[0me, [33mU[0m+[35m51[0mf1, [33mU[0m+[35m5506[0m, [33mU[0m+[35m55[0mc5, [33mU[0m+[35m58[0mcc, [33mU[0m+[35m59[0md1, [33mU[0m+[35m5[0mc51, [33mU[0m.[35m.[0m.
  [90m1524 |[0m }
  [90m1525 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1538:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1536 |[0m   font-weight: [35m500[0m;
  [90m1537 |[0m   font-display: swap;
[31m[1m>[0m [90m1538 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1539 |[0m   unicode-range: [33mU[0m+[35m2466[0m, [33mU[0m+[35m2600[0m, [33mU[0m+[35m4[0meab, [33mU[0m+[35m4[0mfe3, [33mU[0m+[35m4[0mff5, [33mU[0m+[35m51[0ma5, [33mU[0m+[35m51[0mf0, [33mU[0m+[35m536[0mf, [33mU[0m+[35m53[0md4,.[33m.[0m.
  [90m1540 |[0m }
  [90m1541 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1546:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1544 |[0m   font-weight: [35m500[0m;
  [90m1545 |[0m   font-display: swap;
[31m[1m>[0m [90m1546 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1547 |[0m   unicode-range: [33mU[0m+[35m251[0mc, [33mU[0m+[35m2523[0m, [33mU[0m+[35m4e14[0m, [33mU[0m+[35m545[0mf, [33mU[0m+[35m54[0mbd, [33mU[0m+[35m553[0me, [33mU[0m+[35m55[0mdc, [33mU[0m+[35m56[0mda, [33mU[0m+[35m589[0mc,.[33m.[0m.
  [90m1548 |[0m }
  [90m1549 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1554:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1552 |[0m   font-weight: [35m500[0m;
  [90m1553 |[0m   font-display: swap;
[31m[1m>[0m [90m1554 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1555 |[0m   unicode-range: [33mU[0m+[35m2003[0m, [33mU[0m+[35m2312[0m, [33mU[0m+[35m266[0mc, [33mU[0m+[35m4[0mf86, [33mU[0m+[35m51[0mea, [33mU[0m+[35m5243[0m, [33mU[0m+[35m5256[0m, [33mU[0m+[35m541[0mf, [33mU[0m+[35m5841[0m,.[33m.[0m.
  [90m1556 |[0m }
  [90m1557 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1562:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1560 |[0m   font-weight: [35m500[0m;
  [90m1561 |[0m   font-display: swap;
[31m[1m>[0m [90m1562 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1563 |[0m   unicode-range: [33mU[0m+[35m266[0mb, [33mU[0m+[35m3006[0m, [33mU[0m+[35m5176[0m, [33mU[0m+[35m5197[0m, [33mU[0m+[35m51[0ma8, [33mU[0m+[35m51[0mc6, [33mU[0m+[35m52[0mf2, [33mU[0m+[35m5614[0m, [33mU[0m+[35m5875[0m,.[33m.[0m.
  [90m1564 |[0m }
  [90m1565 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1570:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1568 |[0m   font-weight: [35m500[0m;
  [90m1569 |[0m   font-display: swap;
[31m[1m>[0m [90m1570 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1571 |[0m   unicode-range: [33mU[0m+af, [33mU[0m+[35m2465[0m, [33mU[0m+[35m2517[0m, [33mU[0m+[35m33[0ma1, [33mU[0m+[35m4[0mf10, [33mU[0m+[35m50[0mc5, [33mU[0m+[35m51[0mb4, [33mU[0m+[35m5384[0m, [33mU[0m+[35m5606[0m, [33mU[0m.[35m.[0m.
  [90m1572 |[0m }
  [90m1573 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1610:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1608 |[0m   font-weight: [35m500[0m;
  [90m1609 |[0m   font-display: swap;
[31m[1m>[0m [90m1610 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1611 |[0m   unicode-range: [33mU[0m+[35m2266[0m-[35m2267[0m, [33mU[0m+[35m4[0mf2f, [33mU[0m+[35m5208[0m, [33mU[0m+[35m5451[0m, [33mU[0m+[35m546[0ma, [33mU[0m+[35m5589[0m, [33mU[0m+[35m576[0ma, [33mU[0m+[35m5815[0m, [33mU[0m+[35m.[0m..
  [90m1612 |[0m }
  [90m1613 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1626:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1624 |[0m   font-weight: [35m500[0m;
  [90m1625 |[0m   font-display: swap;
[31m[1m>[0m [90m1626 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1627 |[0m   unicode-range: [33mU[0m+[35m4e32[0m, [33mU[0m+[35m51[0mdb, [33mU[0m+[35m53[0ma8, [33mU[0m+[35m53[0mea, [33mU[0m+[35m5609[0m, [33mU[0m+[35m5674[0m, [33mU[0m+[35m5[0ma92, [33mU[0m+[35m5e7[0me, [33mU[0m+[35m6115[0m,.[33m.[0m.
  [90m1628 |[0m }
  [90m1629 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1634:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1632 |[0m   font-weight: [35m500[0m;
  [90m1633 |[0m   font-display: swap;
[31m[1m>[0m [90m1634 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1635 |[0m   unicode-range: [33mU[0m+[35m25[0mb3, [33mU[0m+[35m30[0mf5, [33mU[0m+[35m4[0meae, [33mU[0m+[35m4[0mf46, [33mU[0m+[35m4[0mf51, [33mU[0m+[35m5203[0m, [33mU[0m+[35m52[0mff, [33mU[0m+[35m55[0ma7, [33mU[0m+[35m564[0mc,.[33m.[0m.
  [90m1636 |[0m }
  [90m1637 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1658:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1656 |[0m   font-weight: [35m500[0m;
  [90m1657 |[0m   font-display: swap;
[31m[1m>[0m [90m1658 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1659 |[0m   unicode-range: [33mU[0m+[35m2103[0m, [33mU[0m+[35m5049[0m, [33mU[0m+[35m52[0mb1, [33mU[0m+[35m5320[0m, [33mU[0m+[35m5553[0m, [33mU[0m+[35m572[0md, [33mU[0m+[35m58[0mc7, [33mU[0m+[35m5[0mb5d, [33mU[0m+[35m5[0mbc2,.[33m.[0m.
  [90m1660 |[0m }
  [90m1661 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1666:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1664 |[0m   font-weight: [35m500[0m;
  [90m1665 |[0m   font-display: swap;
[31m[1m>[0m [90m1666 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1667 |[0m   unicode-range: [33mU[0m+[35m2500[0m, [33mU[0m+[35m3008[0m-[35m3009[0m, [33mU[0m+[35m4[0mead, [33mU[0m+[35m4[0mf0f, [33mU[0m+[35m4[0mfca, [33mU[0m+[35m53[0meb, [33mU[0m+[35m543[0me, [33mU[0m+[35m57[0ma2, [33mU[0m+[35m.[0m..
  [90m1668 |[0m }
  [90m1669 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1682:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1680 |[0m   font-weight: [35m500[0m;
  [90m1681 |[0m   font-display: swap;
[31m[1m>[0m [90m1682 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1683 |[0m   unicode-range: [33mU[0m+[35m25[0mc7, [33mU[0m+[35m3007[0m, [33mU[0m+[35m504[0mf, [33mU[0m+[35m507[0md, [33mU[0m+[35m51[0ma0, [33mU[0m+[35m52[0ma3, [33mU[0m+[35m5410[0m, [33mU[0m+[35m5510[0m, [33mU[0m+[35m559[0ma,.[33m.[0m.
  [90m1684 |[0m }
  [90m1685 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1690:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1688 |[0m   font-weight: [35m500[0m;
  [90m1689 |[0m   font-display: swap;
[31m[1m>[0m [90m1690 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1691 |[0m   unicode-range: [33mU[0m+[35m24[0m, [33mU[0m+[35m2022[0m, [33mU[0m+[35m2212[0m, [33mU[0m+[35m221[0mf, [33mU[0m+[35m2665[0m, [33mU[0m+[35m4[0mecf, [33mU[0m+[35m5100[0m, [33mU[0m+[35m51[0mcd, [33mU[0m+[35m52[0md8, [33mU[0m.[35m..[0m
  [90m1692 |[0m }
  [90m1693 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1698:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1696 |[0m   font-weight: [35m500[0m;
  [90m1697 |[0m   font-display: swap;
[31m[1m>[0m [90m1698 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1699 |[0m   unicode-range: [33mU[0m+b0, [33mU[0m+[35m226[0ma, [33mU[0m+[35m2462[0m, [33mU[0m+[35m4e39[0m, [33mU[0m+[35m4[0mfc3, [33mU[0m+[35m4[0mfd7, [33mU[0m+[35m50[0mbe, [33mU[0m+[35m50[0mda, [33mU[0m+[35m5200[0m, [33mU[0m.[35m..[0m
  [90m1700 |[0m }
  [90m1701 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1706:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1704 |[0m   font-weight: [35m500[0m;
  [90m1705 |[0m   font-display: swap;
[31m[1m>[0m [90m1706 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1707 |[0m   unicode-range: [33mU[0m+[35m25[0mbd, [33mU[0m+[35m4e59[0m, [33mU[0m+[35m4[0mec1, [33mU[0m+[35m4[0mff3, [33mU[0m+[35m515[0ma, [33mU[0m+[35m518[0ma, [33mU[0m+[35m525[0mb, [33mU[0m+[35m5375[0m, [33mU[0m+[35m552[0mf,.[33m.[0m.
  [90m1708 |[0m }
  [90m1709 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1722:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1720 |[0m   font-weight: [35m500[0m;
  [90m1721 |[0m   font-display: swap;
[31m[1m>[0m [90m1722 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1723 |[0m   unicode-range: [33mU[0m+[35m4e18[0m, [33mU[0m+[35m4[0mfb5, [33mU[0m+[35m5104[0m, [33mU[0m+[35m52[0mc7, [33mU[0m+[35m5353[0m, [33mU[0m+[35m5374[0m, [33mU[0m+[35m53e5[0m, [33mU[0m+[35m587[0me, [33mU[0m+[35m594[0mf,.[33m.[0m.
  [90m1724 |[0m }
  [90m1725 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1730:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1728 |[0m   font-weight: [35m500[0m;
  [90m1729 |[0m   font-display: swap;
[31m[1m>[0m [90m1730 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1731 |[0m   unicode-range: [33mU[0m+[35m60[0m, [33mU[0m+[35m2200[0m, [33mU[0m+[35m226[0mb, [33mU[0m+[35m2461[0m, [33mU[0m+[35m517[0mc, [33mU[0m+[35m526[0mf, [33mU[0m+[35m5800[0m, [33mU[0m+[35m5[0mb97, [33mU[0m+[35m5[0mbf8, [33mU[0m.[35m.[0m.
  [90m1732 |[0m }
  [90m1733 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1738:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1736 |[0m   font-weight: [35m500[0m;
  [90m1737 |[0m   font-display: swap;
[31m[1m>[0m [90m1738 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1739 |[0m   unicode-range: [33mU[0m+[35m2460[0m, [33mU[0m+[35m4e5[0mf, [33mU[0m+[35m4e7[0me, [33mU[0m+[35m4[0med9, [33mU[0m+[35m501[0mf, [33mU[0m+[35m502[0mb, [33mU[0m+[35m5968[0m, [33mU[0m+[35m5974[0m, [33mU[0m+[35m5[0mac1,.[33m.[0m.
  [90m1740 |[0m }
  [90m1741 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1746:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1744 |[0m   font-weight: [35m500[0m;
  [90m1745 |[0m   font-display: swap;
[31m[1m>[0m [90m1746 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1747 |[0m   unicode-range: [33mU[0m+[35m21[0md2, [33mU[0m+[35m25[0mce, [33mU[0m+[35m300[0ma-[35m300[0mb, [33mU[0m+[35m4e89[0m, [33mU[0m+[35m4e9[0mc, [33mU[0m+[35m4[0mea1, [33mU[0m+[35m5263[0m, [33mU[0m+[35m53[0mcc, [33mU[0m+[35m...[0m
  [90m1748 |[0m }
  [90m1749 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1754:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1752 |[0m   font-weight: [35m500[0m;
  [90m1753 |[0m   font-display: swap;
[31m[1m>[0m [90m1754 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1755 |[0m   unicode-range: [33mU[0m+[35m2015[0m, [33mU[0m+[35m2190[0m, [33mU[0m+[35m4e43[0m, [33mU[0m+[35m5019[0m, [33mU[0m+[35m5247[0m, [33mU[0m+[35m52e7[0m, [33mU[0m+[35m5438[0m, [33mU[0m+[35m54[0mb2, [33mU[0m+[35m55[0mab,.[33m.[0m.
  [90m1756 |[0m }
  [90m1757 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1770:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1768 |[0m   font-weight: [35m500[0m;
  [90m1769 |[0m   font-display: swap;
[31m[1m>[0m [90m1770 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1771 |[0m   unicode-range: [33mU[0m+[35m4e03[0m, [33mU[0m+[35m4[0mf38, [33mU[0m+[35m50[0mb7, [33mU[0m+[35m5264[0m, [33mU[0m+[35m5348[0m, [33mU[0m+[35m5371[0m, [33mU[0m+[35m585[0ma, [33mU[0m+[35m58[0mca, [33mU[0m+[35m5951[0m,.[33m.[0m.
  [90m1772 |[0m }
  [90m1773 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1778:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1776 |[0m   font-weight: [35m500[0m;
  [90m1777 |[0m   font-display: swap;
[31m[1m>[0m [90m1778 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1779 |[0m   unicode-range: [33mU[0m+[35m7[0me, [33mU[0m+b4, [33mU[0m+[35m25[0mc6, [33mU[0m+[35m2661[0m, [33mU[0m+[35m4e92[0m, [33mU[0m+[35m4[0meee, [33mU[0m+[35m4[0mffa, [33mU[0m+[35m5144[0m, [33mU[0m+[35m5237[0m, [33mU[0m+[35m5...[0m
  [90m1780 |[0m }
  [90m1781 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1786:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1784 |[0m   font-weight: [35m500[0m;
  [90m1785 |[0m   font-display: swap;
[31m[1m>[0m [90m1786 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1787 |[0m   unicode-range: [33mU[0m+[35m25[0mcb, [33mU[0m+[35m4e71[0m, [33mU[0m+[35m4[0mf59, [33mU[0m+[35m50[0md5, [33mU[0m+[35m520[0ma, [33mU[0m+[35m5217[0m, [33mU[0m+[35m5230[0m, [33mU[0m+[35m523[0ma-[35m523[0mb, [33mU[0m+[35m...[0m
  [90m1788 |[0m }
  [90m1789 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1810:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1808 |[0m   font-weight: [35m500[0m;
  [90m1809 |[0m   font-display: swap;
[31m[1m>[0m [90m1810 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1811 |[0m   unicode-range: [33mU[0m+[35m25[0mbc, [33mU[0m+[35m3012[0m, [33mU[0m+[35m4[0mef2, [33mU[0m+[35m4[0mf0a, [33mU[0m+[35m516[0mb, [33mU[0m+[35m5373[0m, [33mU[0m+[35m539[0ma, [33mU[0m+[35m53[0mb3, [33mU[0m+[35m559[0mc,.[33m.[0m.
  [90m1812 |[0m }
  [90m1813 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1818:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1816 |[0m   font-weight: [35m500[0m;
  [90m1817 |[0m   font-display: swap;
[31m[1m>[0m [90m1818 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1819 |[0m   unicode-range: [33mU[0m+[35m3[0md, [33mU[0m+[35m5[0me, [33mU[0m+[35m25[0mcf, [33mU[0m+[35m4e0[0me, [33mU[0m+[35m4e5[0md, [33mU[0m+[35m4e73[0m, [33mU[0m+[35m4e94[0m, [33mU[0m+[35m4[0mf3c, [33mU[0m+[35m5009[0m, [33mU[0m+[35m5...[0m
  [90m1820 |[0m }
  [90m1821 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1826:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1824 |[0m   font-weight: [35m500[0m;
  [90m1825 |[0m   font-display: swap;
[31m[1m>[0m [90m1826 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1827 |[0m   unicode-range: [33mU[0m+[35m500[0md, [33mU[0m+[35m5074[0m, [33mU[0m+[35m50[0mcd, [33mU[0m+[35m5175[0m, [33mU[0m+[35m52e2[0m, [33mU[0m+[35m5352[0m, [33mU[0m+[35m5354[0m, [33mU[0m+[35m53[0mf2, [33mU[0m+[35m5409[0m,.[33m.[0m.
  [90m1828 |[0m }
  [90m1829 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1866:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1864 |[0m   font-weight: [35m500[0m;
  [90m1865 |[0m   font-display: swap;
[31m[1m>[0m [90m1866 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1867 |[0m   unicode-range: [33mU[0m+[35m2605[0m-[35m2606[0m, [33mU[0m+[35m301[0mc, [33mU[0m+[35m4e57[0m, [33mU[0m+[35m4[0mfee, [33mU[0m+[35m5065[0m, [33mU[0m+[35m52[0mdf, [33mU[0m+[35m533[0mb, [33mU[0m+[35m5357[0m, [33mU[0m+[35m..[0m.
  [90m1868 |[0m }
  [90m1869 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1898:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1896 |[0m   font-weight: [35m500[0m;
  [90m1897 |[0m   font-display: swap;
[31m[1m>[0m [90m1898 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1899 |[0m   unicode-range: [33mU[0m+[35m4e16[0m, [33mU[0m+[35m4e3[0mb, [33mU[0m+[35m4[0mea4, [33mU[0m+[35m4[0mee4, [33mU[0m+[35m4[0mf4d, [33mU[0m+[35m4[0mf4f, [33mU[0m+[35m4[0mf55, [33mU[0m+[35m4[0mf9b, [33mU[0m+[35m5317[0m,.[33m.[0m.
  [90m1900 |[0m }
  [90m1901 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1906:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1904 |[0m   font-weight: [35m500[0m;
  [90m1905 |[0m   font-display: swap;
[31m[1m>[0m [90m1906 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1907 |[0m   unicode-range: [33mU[0m+[35m26[0m, [33mU[0m+[35m5[0mf, [33mU[0m+[35m2026[0m, [33mU[0m+[35m203[0mb, [33mU[0m+[35m4e09[0m, [33mU[0m+[35m4[0meac, [33mU[0m+[35m4[0med5, [33mU[0m+[35m4[0mfa1, [33mU[0m+[35m5143[0m, [33mU[0m+[35m5...[0m
  [90m1908 |[0m }
  [90m1909 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1930:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1928 |[0m   font-weight: [35m500[0m;
  [90m1929 |[0m   font-display: swap;
[31m[1m>[0m [90m1930 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1931 |[0m   unicode-range: [33mU[0m+a9, [33mU[0m+[35m3010[0m-[35m3011[0m, [33mU[0m+[35m30e2[0m, [33mU[0m+[35m4e0[0mb, [33mU[0m+[35m4[0meca, [33mU[0m+[35m4[0med6, [33mU[0m+[35m4[0med8, [33mU[0m+[35m4[0mf53, [33mU[0m+[35m4[0mf...
  [90m1932 |[0m }
  [90m1933 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1938:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1936 |[0m   font-weight: [35m500[0m;
  [90m1937 |[0m   font-display: swap;
[31m[1m>[0m [90m1938 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1939 |[0m   unicode-range: [33mU[0m+[35m4[0me, [33mU[0m+a0, [33mU[0m+[35m3000[0m, [33mU[0m+[35m300[0mc-[35m300[0md, [33mU[0m+[35m4e00[0m, [33mU[0m+[35m4e0[0ma, [33mU[0m+[35m4e2[0md, [33mU[0m+[35m4e8[0mb, [33mU[0m+[35m4[0meba..[33m.[0m
  [90m1940 |[0m }
  [90m1941 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1946:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1944 |[0m   font-weight: [35m500[0m;
  [90m1945 |[0m   font-display: swap;
[31m[1m>[0m [90m1946 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1947 |[0m   unicode-range: [33mU[0m+[35m21[0m-[35m22[0m, [33mU[0m+[35m27[0m-[35m2[0ma, [33mU[0m+[35m2[0mc-[35m3[0mb, [33mU[0m+[35m3[0mf, [33mU[0m+[35m41[0m-[35m4[0md, [33mU[0m+[35m4[0mf-[35m5[0md, [33mU[0m+[35m61[0m-[35m7[0mb, [33mU[0m+[35m7[0md, [33mU[0m+ab,.[33m.[0m.
  [90m1948 |[0m }
  [90m1949 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1963:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1961 |[0m   font-weight: [35m500[0m;
  [90m1962 |[0m   font-display: swap;
[31m[1m>[0m [90m1963 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1964 |[0m   unicode-range: [33mU[0m+[35m0301[0m, [33mU[0m+[35m0400[0m-[35m045[0m[33mF[0m, [33mU[0m+[35m0490[0m-[35m0491[0m, [33mU[0m+[35m04[0m[33mB0[0m-[35m04[0m[33mB1[0m, [33mU[0m+[35m2116[0m;
  [90m1965 |[0m }
  [90m1966 |[0m [90m/* vietnamese */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1981:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1979 |[0m   font-weight: [35m500[0m;
  [90m1980 |[0m   font-display: swap;
[31m[1m>[0m [90m1981 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1982 |[0m   unicode-range: [33mU[0m+[35m0100[0m-[35m02[0m[33mBA[0m, [33mU[0m+[35m02[0m[33mBD[0m-[35m02[0m[33mC5[0m, [33mU[0m+[35m02[0m[33mC7[0m-[35m02[0m[33mCC[0m, [33mU[0m+[35m02[0m[33mCE[0m-[35m02[0m[33mD7[0m, [33mU[0m+[35m02[0m[33mDD[0m-[35m02[0m[33mFF[0m, [33mU[0m+[35m0304[0m..[33m.[0m
  [90m1983 |[0m }
  [90m1984 |[0m [90m/* latin */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1990:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1988 |[0m   font-weight: [35m500[0m;
  [90m1989 |[0m   font-display: swap;
[31m[1m>[0m [90m1990 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1991 |[0m   unicode-range: [33mU[0m+[35m0000[0m-[35m00[0m[33mFF[0m, [33mU[0m+[35m0131[0m, [33mU[0m+[35m0152[0m-[35m0153[0m, [33mU[0m+[35m02[0m[33mBB[0m-[35m02[0m[33mBC[0m, [33mU[0m+[35m02[0m[33mC6[0m, [33mU[0m+[35m02[0m[33mDA[0m, [33mU[0m+[35m02[0m[33mDC[0m, [33m.[0m.[35m.[0m
  [90m1992 |[0m }
  [90m1993 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1998:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m1996 |[0m   font-weight: [35m700[0m;
  [90m1997 |[0m   font-display: swap;
[31m[1m>[0m [90m1998 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m1999 |[0m   unicode-range: [33mU[0m+[35m25[0mee8, [33mU[0m+[35m25[0mf23, [33mU[0m+[35m25[0mf5c, [33mU[0m+[35m25[0mfd4, [33mU[0m+[35m25[0mfe0, [33mU[0m+[35m25[0mffb, [33mU[0m+[35m2600[0mc, [33mU[0m+[35m26017[0m,.[33m.[0m.
  [90m2000 |[0m }
  [90m2001 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2006:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2004 |[0m   font-weight: [35m700[0m;
  [90m2005 |[0m   font-display: swap;
[31m[1m>[0m [90m2006 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2007 |[0m   unicode-range: [33mU[0m+[35m1[0mf235-[35m1[0mf23b, [33mU[0m+[35m1[0mf240-[35m1[0mf248, [33mU[0m+[35m1[0mf250-[35m1[0mf251, [33mU[0m+[35m2000[0mb, [33mU[0m+[35m20089[0m-[35m2008[0ma, [33mU[0m+[35m...[0m
  [90m2008 |[0m }
  [90m2009 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2046:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2044 |[0m   font-weight: [35m700[0m;
  [90m2045 |[0m   font-display: swap;
[31m[1m>[0m [90m2046 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2047 |[0m   unicode-range: [33mU[0m+[35m9[0mc3e, [33mU[0m+[35m9[0mc41, [33mU[0m+[35m9[0mc43-[35m9[0mc4a, [33mU[0m+[35m9[0mc4e-[35m9[0mc50, [33mU[0m+[35m9[0mc52-[35m9[0mc54, [33mU[0m+[35m9[0mc56, [33mU[0m+[35m9[0mc58, [33m.[0m.[35m.[0m
  [90m2048 |[0m }
  [90m2049 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2054:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2052 |[0m   font-weight: [35m700[0m;
  [90m2053 |[0m   font-display: swap;
[31m[1m>[0m [90m2054 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2055 |[0m   unicode-range: [33mU[0m+[35m9[0mae5-[35m9[0mae7, [33mU[0m+[35m9[0mae9, [33mU[0m+[35m9[0maeb-[35m9[0maec, [33mU[0m+[35m9[0maee-[35m9[0maef, [33mU[0m+[35m9[0maf1-[35m9[0maf5, [33mU[0m+[35m9[0maf7, [33mU[0m+[35m9[0m...
  [90m2056 |[0m }
  [90m2057 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2062:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2060 |[0m   font-weight: [35m700[0m;
  [90m2061 |[0m   font-display: swap;
[31m[1m>[0m [90m2062 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2063 |[0m   unicode-range: [33mU[0m+[35m98[0meb, [33mU[0m+[35m98[0med-[35m98[0mee, [33mU[0m+[35m98[0mf0-[35m98[0mf1, [33mU[0m+[35m98[0mf3, [33mU[0m+[35m98[0mf6, [33mU[0m+[35m9902[0m, [33mU[0m+[35m9907[0m-[35m9909[0m, [33m.[0m.[35m.[0m
  [90m2064 |[0m }
  [90m2065 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2070:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2068 |[0m   font-weight: [35m700[0m;
  [90m2069 |[0m   font-display: swap;
[31m[1m>[0m [90m2070 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2071 |[0m   unicode-range: [33mU[0m+[35m971[0md, [33mU[0m+[35m9721[0m-[35m9724[0m, [33mU[0m+[35m9728[0m, [33mU[0m+[35m972[0ma, [33mU[0m+[35m9730[0m-[35m9731[0m, [33mU[0m+[35m9733[0m, [33mU[0m+[35m9736[0m, [33mU[0m+[35m973.[0m.[35m.[0m
  [90m2072 |[0m }
  [90m2073 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2078:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2076 |[0m   font-weight: [35m700[0m;
  [90m2077 |[0m   font-display: swap;
[31m[1m>[0m [90m2078 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2079 |[0m   unicode-range: [33mU[0m+[35m944[0ma, [33mU[0m+[35m944[0mc, [33mU[0m+[35m9452[0m-[35m9453[0m, [33mU[0m+[35m9455[0m, [33mU[0m+[35m9459[0m-[35m945[0mc, [33mU[0m+[35m945e-9463[0m, [33mU[0m+[35m9468[0m, [33m.[0m.[35m.[0m
  [90m2080 |[0m }
  [90m2081 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2086:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2084 |[0m   font-weight: [35m700[0m;
  [90m2085 |[0m   font-display: swap;
[31m[1m>[0m [90m2086 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2087 |[0m   unicode-range: [33mU[0m+[35m92[0mbc-[35m92[0mbd, [33mU[0m+[35m92[0mbf-[35m92[0mc3, [33mU[0m+[35m92[0mc5-[35m92[0mc8, [33mU[0m+[35m92[0mcb-[35m92[0md0, [33mU[0m+[35m92[0md2-[35m92[0md3, [33mU[0m+[35m92[0md5..[33m.[0m
  [90m2088 |[0m }
  [90m2089 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2102:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2100 |[0m   font-weight: [35m700[0m;
  [90m2101 |[0m   font-display: swap;
[31m[1m>[0m [90m2102 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2103 |[0m   unicode-range: [33mU[0m+[35m8[0mf52-[35m8[0mf55, [33mU[0m+[35m8[0mf57-[35m8[0mf58, [33mU[0m+[35m8[0mf5c-[35m8[0mf5e, [33mU[0m+[35m8[0mf61-[35m8[0mf66, [33mU[0m+[35m8[0mf9c-[35m8[0mf9d, [33mU[0m+[35m8[0mf9f.[35m.[0m.
  [90m2104 |[0m }
  [90m2105 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2110:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2108 |[0m   font-weight: [35m700[0m;
  [90m2109 |[0m   font-display: swap;
[31m[1m>[0m [90m2110 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2111 |[0m   unicode-range: [33mU[0m+[35m8[0mdc0, [33mU[0m+[35m8[0mdc2, [33mU[0m+[35m8[0mdc5-[35m8[0mdc8, [33mU[0m+[35m8[0mdca-[35m8[0mdcc, [33mU[0m+[35m8[0mdce-[35m8[0mdcf, [33mU[0m+[35m8[0mdd1, [33mU[0m+[35m8[0mdd4-[35m8[0m...
  [90m2112 |[0m }
  [90m2113 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2118:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2116 |[0m   font-weight: [35m700[0m;
  [90m2117 |[0m   font-display: swap;
[31m[1m>[0m [90m2118 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2119 |[0m   unicode-range: [33mU[0m+[35m8[0mb2d, [33mU[0m+[35m8[0mb30, [33mU[0m+[35m8[0mb37, [33mU[0m+[35m8[0mb3c, [33mU[0m+[35m8[0mb3e, [33mU[0m+[35m8[0mb41-[35m8[0mb46, [33mU[0m+[35m8[0mb48-[35m8[0mb49, [33mU[0m+[35m8[0mb4..[35m.[0m
  [90m2120 |[0m }
  [90m2121 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2126:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2124 |[0m   font-weight: [35m700[0m;
  [90m2125 |[0m   font-display: swap;
[31m[1m>[0m [90m2126 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2127 |[0m   unicode-range: [33mU[0m+[35m8973[0m-[35m8975[0m, [33mU[0m+[35m8977[0m, [33mU[0m+[35m897[0ma-[35m897[0me, [33mU[0m+[35m8980[0m, [33mU[0m+[35m8983[0m, [33mU[0m+[35m8988[0m-[35m898[0ma, [33mU[0m+[35m898[0md, [33m.[0m.[35m.[0m
  [90m2128 |[0m }
  [90m2129 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2134:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2132 |[0m   font-weight: [35m700[0m;
  [90m2133 |[0m   font-display: swap;
[31m[1m>[0m [90m2134 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2135 |[0m   unicode-range: [33mU[0m+[35m87e2[0m-[35m87e6[0m, [33mU[0m+[35m87[0mea-[35m87[0med, [33mU[0m+[35m87[0mef, [33mU[0m+[35m87[0mf1, [33mU[0m+[35m87[0mf3, [33mU[0m+[35m87[0mf5-[35m87[0mf8, [33mU[0m+[35m87[0mfa-[35m8.[0m..
  [90m2136 |[0m }
  [90m2137 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2142:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2140 |[0m   font-weight: [35m700[0m;
  [90m2141 |[0m   font-display: swap;
[31m[1m>[0m [90m2142 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2143 |[0m   unicode-range: [33mU[0m+[35m8655[0m-[35m8659[0m, [33mU[0m+[35m865[0mb, [33mU[0m+[35m865[0md-[35m8664[0m, [33mU[0m+[35m8667[0m, [33mU[0m+[35m8669[0m, [33mU[0m+[35m866[0mc, [33mU[0m+[35m866[0mf, [33mU[0m+[35m867.[0m..
  [90m2144 |[0m }
  [90m2145 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2150:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2148 |[0m   font-weight: [35m700[0m;
  [90m2149 |[0m   font-display: swap;
[31m[1m>[0m [90m2150 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2151 |[0m   unicode-range: [33mU[0m+[35m84[0mb4, [33mU[0m+[35m84[0mb9-[35m84[0mbb, [33mU[0m+[35m84[0mbd-[35m84[0mc2, [33mU[0m+[35m84[0mc6-[35m84[0mca, [33mU[0m+[35m84[0mcc-[35m84[0md1, [33mU[0m+[35m84[0md3, [33mU[0m+[35m8.[0m..
  [90m2152 |[0m }
  [90m2153 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2158:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2156 |[0m   font-weight: [35m700[0m;
  [90m2157 |[0m   font-display: swap;
[31m[1m>[0m [90m2158 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2159 |[0m   unicode-range: [33mU[0m+[35m82e8[0m, [33mU[0m+[35m82[0mea, [33mU[0m+[35m82[0med, [33mU[0m+[35m82[0mef, [33mU[0m+[35m82[0mf3-[35m82[0mf4, [33mU[0m+[35m82[0mf6-[35m82[0mf7, [33mU[0m+[35m82[0mf9, [33mU[0m+[35m82[0mf...
  [90m2160 |[0m }
  [90m2161 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2166:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2164 |[0m   font-weight: [35m700[0m;
  [90m2165 |[0m   font-display: swap;
[31m[1m>[0m [90m2166 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2167 |[0m   unicode-range: [33mU[0m+[35m814[0ma, [33mU[0m+[35m814[0mc, [33mU[0m+[35m8151[0m-[35m8153[0m, [33mU[0m+[35m8157[0m, [33mU[0m+[35m815[0mf-[35m8161[0m, [33mU[0m+[35m8165[0m-[35m8169[0m, [33mU[0m+[35m816[0md-[35m8..[0m.
  [90m2168 |[0m }
  [90m2169 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2174:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2172 |[0m   font-weight: [35m700[0m;
  [90m2173 |[0m   font-display: swap;
[31m[1m>[0m [90m2174 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2175 |[0m   unicode-range: [33mU[0m+[35m7[0mf77-[35m7[0mf79, [33mU[0m+[35m7[0mf7d-[35m7[0mf80, [33mU[0m+[35m7[0mf82-[35m7[0mf83, [33mU[0m+[35m7[0mf86-[35m7[0mf88, [33mU[0m+[35m7[0mf8b-[35m7[0mf8d, [33mU[0m+[35m7[0mf8f.[35m.[0m.
  [90m2176 |[0m }
  [90m2177 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2182:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2180 |[0m   font-weight: [35m700[0m;
  [90m2181 |[0m   font-display: swap;
[31m[1m>[0m [90m2182 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2183 |[0m   unicode-range: [33mU[0m+[35m7[0md57, [33mU[0m+[35m7[0md59-[35m7[0md5d, [33mU[0m+[35m7[0md63, [33mU[0m+[35m7[0md65, [33mU[0m+[35m7[0md67, [33mU[0m+[35m7[0md6a, [33mU[0m+[35m7[0md6e, [33mU[0m+[35m7[0md70, [33mU[0m+[35m.[0m..
  [90m2184 |[0m }
  [90m2185 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2206:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2204 |[0m   font-weight: [35m700[0m;
  [90m2205 |[0m   font-display: swap;
[31m[1m>[0m [90m2206 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2207 |[0m   unicode-range: [33mU[0m+[35m7851[0m-[35m7852[0m, [33mU[0m+[35m785[0mc, [33mU[0m+[35m785[0me, [33mU[0m+[35m7860[0m-[35m7861[0m, [33mU[0m+[35m7863[0m-[35m7864[0m, [33mU[0m+[35m7868[0m, [33mU[0m+[35m786[0ma, [33m.[0m.[35m.[0m
  [90m2208 |[0m }
  [90m2209 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2238:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2236 |[0m   font-weight: [35m700[0m;
  [90m2237 |[0m   font-display: swap;
[31m[1m>[0m [90m2238 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2239 |[0m   unicode-range: [33mU[0m+[35m7166[0m, [33mU[0m+[35m7168[0m, [33mU[0m+[35m716[0mc, [33mU[0m+[35m7179[0m, [33mU[0m+[35m7180[0m, [33mU[0m+[35m7184[0m-[35m7185[0m, [33mU[0m+[35m7187[0m-[35m7188[0m, [33mU[0m+[35m718[0m...
  [90m2240 |[0m }
  [90m2241 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2246:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2244 |[0m   font-weight: [35m700[0m;
  [90m2245 |[0m   font-display: swap;
[31m[1m>[0m [90m2246 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2247 |[0m   unicode-range: [33mU[0m+[35m6[0mf58-[35m6[0mf5b, [33mU[0m+[35m6[0mf5d-[35m6[0mf5e, [33mU[0m+[35m6[0mf60-[35m6[0mf62, [33mU[0m+[35m6[0mf66, [33mU[0m+[35m6[0mf68, [33mU[0m+[35m6[0mf6c-[35m6[0mf6d, [33mU[0m+[35m6[0m...
  [90m2248 |[0m }
  [90m2249 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2254:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2252 |[0m   font-weight: [35m700[0m;
  [90m2253 |[0m   font-display: swap;
[31m[1m>[0m [90m2254 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2255 |[0m   unicode-range: [33mU[0m+[35m6[0md7c, [33mU[0m+[35m6[0md80-[35m6[0md82, [33mU[0m+[35m6[0md85, [33mU[0m+[35m6[0md87, [33mU[0m+[35m6[0md89-[35m6[0md8a, [33mU[0m+[35m6[0md8c-[35m6[0md8e, [33mU[0m+[35m6[0md91-[35m6[0m...
  [90m2256 |[0m }
  [90m2257 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2270:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2268 |[0m   font-weight: [35m700[0m;
  [90m2269 |[0m   font-display: swap;
[31m[1m>[0m [90m2270 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2271 |[0m   unicode-range: [33mU[0m+[35m69[0mdd-[35m69[0mde, [33mU[0m+[35m69e2[0m-[35m69e3[0m, [33mU[0m+[35m69e5[0m, [33mU[0m+[35m69e7[0m-[35m69[0meb, [33mU[0m+[35m69[0med-[35m69[0mef, [33mU[0m+[35m69[0mf1-[35m69[0mf6..[33m.[0m
  [90m2272 |[0m }
  [90m2273 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2278:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2276 |[0m   font-weight: [35m700[0m;
  [90m2277 |[0m   font-display: swap;
[31m[1m>[0m [90m2278 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2279 |[0m   unicode-range: [33mU[0m+[35m6855[0m, [33mU[0m+[35m6857[0m-[35m6859[0m, [33mU[0m+[35m685[0mb, [33mU[0m+[35m685[0md, [33mU[0m+[35m685[0mf, [33mU[0m+[35m6863[0m, [33mU[0m+[35m6867[0m, [33mU[0m+[35m686[0mb, [33mU[0m+[35m...[0m
  [90m2280 |[0m }
  [90m2281 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2286:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2284 |[0m   font-weight: [35m700[0m;
  [90m2285 |[0m   font-display: swap;
[31m[1m>[0m [90m2286 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2287 |[0m   unicode-range: [33mU[0m+[35m667e-6680[0m, [33mU[0m+[35m6683[0m-[35m6684[0m, [33mU[0m+[35m6688[0m, [33mU[0m+[35m668[0mb-[35m668[0me, [33mU[0m+[35m6690[0m, [33mU[0m+[35m6692[0m, [33mU[0m+[35m6698[0m-[35m6..[0m.
  [90m2288 |[0m }
  [90m2289 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2294:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2292 |[0m   font-weight: [35m700[0m;
  [90m2293 |[0m   font-display: swap;
[31m[1m>[0m [90m2294 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2295 |[0m   unicode-range: [33mU[0m+[35m64[0md2, [33mU[0m+[35m64[0md4-[35m64[0md5, [33mU[0m+[35m64[0md7-[35m64[0md8, [33mU[0m+[35m64[0mda, [33mU[0m+[35m64e0[0m-[35m64e1[0m, [33mU[0m+[35m64e3[0m-[35m64e5[0m, [33mU[0m+[35m6...[0m
  [90m2296 |[0m }
  [90m2297 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2302:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2300 |[0m   font-weight: [35m700[0m;
  [90m2301 |[0m   font-display: swap;
[31m[1m>[0m [90m2302 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2303 |[0m   unicode-range: [33mU[0m+[35m62[0mcf, [33mU[0m+[35m62[0md1, [33mU[0m+[35m62[0md4-[35m62[0md6, [33mU[0m+[35m62[0mda, [33mU[0m+[35m62[0mdc, [33mU[0m+[35m62[0mea, [33mU[0m+[35m62[0mee-[35m62[0mef, [33mU[0m+[35m62[0mf..[35m.[0m
  [90m2304 |[0m }
  [90m2305 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2310:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2308 |[0m   font-weight: [35m700[0m;
  [90m2309 |[0m   font-display: swap;
[31m[1m>[0m [90m2310 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2311 |[0m   unicode-range: [33mU[0m+[35m6117[0m, [33mU[0m+[35m6119[0m, [33mU[0m+[35m611[0mc, [33mU[0m+[35m611[0me, [33mU[0m+[35m6120[0m-[35m6122[0m, [33mU[0m+[35m6127[0m-[35m6128[0m, [33mU[0m+[35m612[0ma-[35m612[0mc, [33m.[0m.[35m.[0m
  [90m2312 |[0m }
  [90m2313 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2318:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2316 |[0m   font-weight: [35m700[0m;
  [90m2317 |[0m   font-display: swap;
[31m[1m>[0m [90m2318 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2319 |[0m   unicode-range: [33mU[0m+[35m5[0mf6c-[35m5[0mf6d, [33mU[0m+[35m5[0mf6f, [33mU[0m+[35m5[0mf72-[35m5[0mf75, [33mU[0m+[35m5[0mf78, [33mU[0m+[35m5[0mf7a, [33mU[0m+[35m5[0mf7d-[35m5[0mf7f, [33mU[0m+[35m5[0mf82-[35m5[0m...
  [90m2320 |[0m }
  [90m2321 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2326:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2324 |[0m   font-weight: [35m700[0m;
  [90m2325 |[0m   font-display: swap;
[31m[1m>[0m [90m2326 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2327 |[0m   unicode-range: [33mU[0m+[35m5[0md9b, [33mU[0m+[35m5[0md9d, [33mU[0m+[35m5[0md9f-[35m5[0mda0, [33mU[0m+[35m5[0mda2, [33mU[0m+[35m5[0mda4, [33mU[0m+[35m5[0mda7, [33mU[0m+[35m5[0mdab-[35m5[0mdac, [33mU[0m+[35m5[0mda...
  [90m2328 |[0m }
  [90m2329 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2342:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2340 |[0m   font-weight: [35m700[0m;
  [90m2341 |[0m   font-display: swap;
[31m[1m>[0m [90m2342 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2343 |[0m   unicode-range: [33mU[0m+[35m598[0mb-[35m598[0me, [33mU[0m+[35m5992[0m, [33mU[0m+[35m5995[0m, [33mU[0m+[35m5997[0m, [33mU[0m+[35m599[0mb, [33mU[0m+[35m599[0md, [33mU[0m+[35m599[0mf, [33mU[0m+[35m59[0ma3-[35m59[0ma...
  [90m2344 |[0m }
  [90m2345 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2358:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2356 |[0m   font-weight: [35m700[0m;
  [90m2357 |[0m   font-display: swap;
[31m[1m>[0m [90m2358 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2359 |[0m   unicode-range: [33mU[0m+[35m5616[0m-[35m5617[0m, [33mU[0m+[35m5619[0m, [33mU[0m+[35m561[0mb, [33mU[0m+[35m5620[0m, [33mU[0m+[35m5628[0m, [33mU[0m+[35m562[0mc, [33mU[0m+[35m562[0mf-[35m5639[0m, [33mU[0m+[35m563[0m..[35m.[0m
  [90m2360 |[0m }
  [90m2361 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2366:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2364 |[0m   font-weight: [35m700[0m;
  [90m2365 |[0m   font-display: swap;
[31m[1m>[0m [90m2366 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2367 |[0m   unicode-range: [33mU[0m+[35m543[0mf-[35m5440[0m, [33mU[0m+[35m5443[0m-[35m5444[0m, [33mU[0m+[35m5447[0m, [33mU[0m+[35m544[0mc-[35m544[0mf, [33mU[0m+[35m5455[0m, [33mU[0m+[35m545[0me, [33mU[0m+[35m5462[0m, [33m.[0m.[35m.[0m
  [90m2368 |[0m }
  [90m2369 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2374:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2372 |[0m   font-weight: [35m700[0m;
  [90m2373 |[0m   font-display: swap;
[31m[1m>[0m [90m2374 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2375 |[0m   unicode-range: [33mU[0m+[35m528[0md, [33mU[0m+[35m5291[0m-[35m5298[0m, [33mU[0m+[35m529[0ma, [33mU[0m+[35m529[0mc, [33mU[0m+[35m52[0ma4-[35m52[0ma7, [33mU[0m+[35m52[0mab-[35m52[0mad, [33mU[0m+[35m52[0maf-[35m5.[0m..
  [90m2376 |[0m }
  [90m2377 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2398:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2396 |[0m   font-weight: [35m700[0m;
  [90m2397 |[0m   font-display: swap;
[31m[1m>[0m [90m2398 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2399 |[0m   unicode-range: [33mU[0m+[35m4093[0m, [33mU[0m+[35m4103[0m, [33mU[0m+[35m4105[0m, [33mU[0m+[35m4148[0m, [33mU[0m+[35m414[0mf, [33mU[0m+[35m4163[0m, [33mU[0m+[35m41[0mb4, [33mU[0m+[35m41[0mbf, [33mU[0m+[35m41e6[0m,.[33m.[0m.
  [90m2400 |[0m }
  [90m2401 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2414:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2412 |[0m   font-weight: [35m700[0m;
  [90m2413 |[0m   font-display: swap;
[31m[1m>[0m [90m2414 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2415 |[0m   unicode-range: [33mU[0m+[35m32[0mb5-[35m332[0mb, [33mU[0m+[35m332[0md-[35m3394[0m;
  [90m2416 |[0m }
  [90m2417 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2438:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2436 |[0m   font-weight: [35m700[0m;
  [90m2437 |[0m   font-display: swap;
[31m[1m>[0m [90m2438 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2439 |[0m   unicode-range: [33mU[0m+[35m2[0mf14-[35m2[0mfd5, [33mU[0m+[35m2[0mff0-[35m2[0mffb, [33mU[0m+[35m3004[0m, [33mU[0m+[35m3013[0m, [33mU[0m+[35m3016[0m-[35m301[0mb, [33mU[0m+[35m301[0me, [33mU[0m+[35m3020[0m-[35m3...[0m
  [90m2440 |[0m }
  [90m2441 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2446:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2444 |[0m   font-weight: [35m700[0m;
  [90m2445 |[0m   font-display: swap;
[31m[1m>[0m [90m2446 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2447 |[0m   unicode-range: [33mU[0m+[35m25e4[0m-[35m25e6[0m, [33mU[0m+[35m2601[0m-[35m2603[0m, [33mU[0m+[35m2609[0m, [33mU[0m+[35m260e-260[0mf, [33mU[0m+[35m2616[0m-[35m2617[0m, [33mU[0m+[35m261[0mc-[35m261[0mf..[33m.[0m
  [90m2448 |[0m }
  [90m2449 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2454:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2452 |[0m   font-weight: [35m700[0m;
  [90m2453 |[0m   font-display: swap;
[31m[1m>[0m [90m2454 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2455 |[0m   unicode-range: [33mU[0m+[35m24[0md1-[35m24[0mff, [33mU[0m+[35m2503[0m-[35m2513[0m, [33mU[0m+[35m2515[0m-[35m2516[0m, [33mU[0m+[35m2518[0m-[35m251[0mb, [33mU[0m+[35m251[0md-[35m2522[0m, [33mU[0m+[35m2524[0m.[35m..[0m
  [90m2456 |[0m }
  [90m2457 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2462:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2460 |[0m   font-weight: [35m700[0m;
  [90m2461 |[0m   font-display: swap;
[31m[1m>[0m [90m2462 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2463 |[0m   unicode-range: [33mU[0m+[35m2105[0m, [33mU[0m+[35m2109[0m-[35m210[0ma, [33mU[0m+[35m210[0mf, [33mU[0m+[35m2116[0m, [33mU[0m+[35m2121[0m, [33mU[0m+[35m2126[0m-[35m2127[0m, [33mU[0m+[35m212[0mb, [33mU[0m+[35m212[0m...
  [90m2464 |[0m }
  [90m2465 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2494:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2492 |[0m   font-weight: [35m700[0m;
  [90m2493 |[0m   font-display: swap;
[31m[1m>[0m [90m2494 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2495 |[0m   unicode-range: [33mU[0m+[35m2[0md9, [33mU[0m+[35m21[0md4, [33mU[0m+[35m301[0md, [33mU[0m+[35m515[0mc, [33mU[0m+[35m52[0mfe, [33mU[0m+[35m5420[0m, [33mU[0m+[35m5750[0m, [33mU[0m+[35m5766[0m, [33mU[0m+[35m5954[0m, [33m.[0m.[35m.[0m
  [90m2496 |[0m }
  [90m2497 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2518:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2516 |[0m   font-weight: [35m700[0m;
  [90m2517 |[0m   font-display: swap;
[31m[1m>[0m [90m2518 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2519 |[0m   unicode-range: [33mU[0m+b1, [33mU[0m+[35m309[0mb, [33mU[0m+[35m4e5[0me, [33mU[0m+[35m51[0mf1, [33mU[0m+[35m5506[0m, [33mU[0m+[35m55[0mc5, [33mU[0m+[35m58[0mcc, [33mU[0m+[35m59[0md1, [33mU[0m+[35m5[0mc51, [33mU[0m.[35m.[0m.
  [90m2520 |[0m }
  [90m2521 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2534:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2532 |[0m   font-weight: [35m700[0m;
  [90m2533 |[0m   font-display: swap;
[31m[1m>[0m [90m2534 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2535 |[0m   unicode-range: [33mU[0m+[35m2466[0m, [33mU[0m+[35m2600[0m, [33mU[0m+[35m4[0meab, [33mU[0m+[35m4[0mfe3, [33mU[0m+[35m4[0mff5, [33mU[0m+[35m51[0ma5, [33mU[0m+[35m51[0mf0, [33mU[0m+[35m536[0mf, [33mU[0m+[35m53[0md4,.[33m.[0m.
  [90m2536 |[0m }
  [90m2537 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2542:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2540 |[0m   font-weight: [35m700[0m;
  [90m2541 |[0m   font-display: swap;
[31m[1m>[0m [90m2542 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2543 |[0m   unicode-range: [33mU[0m+[35m251[0mc, [33mU[0m+[35m2523[0m, [33mU[0m+[35m4e14[0m, [33mU[0m+[35m545[0mf, [33mU[0m+[35m54[0mbd, [33mU[0m+[35m553[0me, [33mU[0m+[35m55[0mdc, [33mU[0m+[35m56[0mda, [33mU[0m+[35m589[0mc,.[33m.[0m.
  [90m2544 |[0m }
  [90m2545 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2550:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2548 |[0m   font-weight: [35m700[0m;
  [90m2549 |[0m   font-display: swap;
[31m[1m>[0m [90m2550 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2551 |[0m   unicode-range: [33mU[0m+[35m2003[0m, [33mU[0m+[35m2312[0m, [33mU[0m+[35m266[0mc, [33mU[0m+[35m4[0mf86, [33mU[0m+[35m51[0mea, [33mU[0m+[35m5243[0m, [33mU[0m+[35m5256[0m, [33mU[0m+[35m541[0mf, [33mU[0m+[35m5841[0m,.[33m.[0m.
  [90m2552 |[0m }
  [90m2553 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2558:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2556 |[0m   font-weight: [35m700[0m;
  [90m2557 |[0m   font-display: swap;
[31m[1m>[0m [90m2558 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2559 |[0m   unicode-range: [33mU[0m+[35m266[0mb, [33mU[0m+[35m3006[0m, [33mU[0m+[35m5176[0m, [33mU[0m+[35m5197[0m, [33mU[0m+[35m51[0ma8, [33mU[0m+[35m51[0mc6, [33mU[0m+[35m52[0mf2, [33mU[0m+[35m5614[0m, [33mU[0m+[35m5875[0m,.[33m.[0m.
  [90m2560 |[0m }
  [90m2561 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2566:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2564 |[0m   font-weight: [35m700[0m;
  [90m2565 |[0m   font-display: swap;
[31m[1m>[0m [90m2566 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2567 |[0m   unicode-range: [33mU[0m+af, [33mU[0m+[35m2465[0m, [33mU[0m+[35m2517[0m, [33mU[0m+[35m33[0ma1, [33mU[0m+[35m4[0mf10, [33mU[0m+[35m50[0mc5, [33mU[0m+[35m51[0mb4, [33mU[0m+[35m5384[0m, [33mU[0m+[35m5606[0m, [33mU[0m.[35m.[0m.
  [90m2568 |[0m }
  [90m2569 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2606:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2604 |[0m   font-weight: [35m700[0m;
  [90m2605 |[0m   font-display: swap;
[31m[1m>[0m [90m2606 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2607 |[0m   unicode-range: [33mU[0m+[35m2266[0m-[35m2267[0m, [33mU[0m+[35m4[0mf2f, [33mU[0m+[35m5208[0m, [33mU[0m+[35m5451[0m, [33mU[0m+[35m546[0ma, [33mU[0m+[35m5589[0m, [33mU[0m+[35m576[0ma, [33mU[0m+[35m5815[0m, [33mU[0m+[35m.[0m..
  [90m2608 |[0m }
  [90m2609 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2622:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2620 |[0m   font-weight: [35m700[0m;
  [90m2621 |[0m   font-display: swap;
[31m[1m>[0m [90m2622 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2623 |[0m   unicode-range: [33mU[0m+[35m4e32[0m, [33mU[0m+[35m51[0mdb, [33mU[0m+[35m53[0ma8, [33mU[0m+[35m53[0mea, [33mU[0m+[35m5609[0m, [33mU[0m+[35m5674[0m, [33mU[0m+[35m5[0ma92, [33mU[0m+[35m5e7[0me, [33mU[0m+[35m6115[0m,.[33m.[0m.
  [90m2624 |[0m }
  [90m2625 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2630:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2628 |[0m   font-weight: [35m700[0m;
  [90m2629 |[0m   font-display: swap;
[31m[1m>[0m [90m2630 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2631 |[0m   unicode-range: [33mU[0m+[35m25[0mb3, [33mU[0m+[35m30[0mf5, [33mU[0m+[35m4[0meae, [33mU[0m+[35m4[0mf46, [33mU[0m+[35m4[0mf51, [33mU[0m+[35m5203[0m, [33mU[0m+[35m52[0mff, [33mU[0m+[35m55[0ma7, [33mU[0m+[35m564[0mc,.[33m.[0m.
  [90m2632 |[0m }
  [90m2633 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2654:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2652 |[0m   font-weight: [35m700[0m;
  [90m2653 |[0m   font-display: swap;
[31m[1m>[0m [90m2654 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2655 |[0m   unicode-range: [33mU[0m+[35m2103[0m, [33mU[0m+[35m5049[0m, [33mU[0m+[35m52[0mb1, [33mU[0m+[35m5320[0m, [33mU[0m+[35m5553[0m, [33mU[0m+[35m572[0md, [33mU[0m+[35m58[0mc7, [33mU[0m+[35m5[0mb5d, [33mU[0m+[35m5[0mbc2,.[33m.[0m.
  [90m2656 |[0m }
  [90m2657 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2662:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2660 |[0m   font-weight: [35m700[0m;
  [90m2661 |[0m   font-display: swap;
[31m[1m>[0m [90m2662 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2663 |[0m   unicode-range: [33mU[0m+[35m2500[0m, [33mU[0m+[35m3008[0m-[35m3009[0m, [33mU[0m+[35m4[0mead, [33mU[0m+[35m4[0mf0f, [33mU[0m+[35m4[0mfca, [33mU[0m+[35m53[0meb, [33mU[0m+[35m543[0me, [33mU[0m+[35m57[0ma2, [33mU[0m+[35m.[0m..
  [90m2664 |[0m }
  [90m2665 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2678:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2676 |[0m   font-weight: [35m700[0m;
  [90m2677 |[0m   font-display: swap;
[31m[1m>[0m [90m2678 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2679 |[0m   unicode-range: [33mU[0m+[35m25[0mc7, [33mU[0m+[35m3007[0m, [33mU[0m+[35m504[0mf, [33mU[0m+[35m507[0md, [33mU[0m+[35m51[0ma0, [33mU[0m+[35m52[0ma3, [33mU[0m+[35m5410[0m, [33mU[0m+[35m5510[0m, [33mU[0m+[35m559[0ma,.[33m.[0m.
  [90m2680 |[0m }
  [90m2681 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2686:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2684 |[0m   font-weight: [35m700[0m;
  [90m2685 |[0m   font-display: swap;
[31m[1m>[0m [90m2686 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2687 |[0m   unicode-range: [33mU[0m+[35m24[0m, [33mU[0m+[35m2022[0m, [33mU[0m+[35m2212[0m, [33mU[0m+[35m221[0mf, [33mU[0m+[35m2665[0m, [33mU[0m+[35m4[0mecf, [33mU[0m+[35m5100[0m, [33mU[0m+[35m51[0mcd, [33mU[0m+[35m52[0md8, [33mU[0m.[35m..[0m
  [90m2688 |[0m }
  [90m2689 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2694:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2692 |[0m   font-weight: [35m700[0m;
  [90m2693 |[0m   font-display: swap;
[31m[1m>[0m [90m2694 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2695 |[0m   unicode-range: [33mU[0m+b0, [33mU[0m+[35m226[0ma, [33mU[0m+[35m2462[0m, [33mU[0m+[35m4e39[0m, [33mU[0m+[35m4[0mfc3, [33mU[0m+[35m4[0mfd7, [33mU[0m+[35m50[0mbe, [33mU[0m+[35m50[0mda, [33mU[0m+[35m5200[0m, [33mU[0m.[35m..[0m
  [90m2696 |[0m }
  [90m2697 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2702:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2700 |[0m   font-weight: [35m700[0m;
  [90m2701 |[0m   font-display: swap;
[31m[1m>[0m [90m2702 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2703 |[0m   unicode-range: [33mU[0m+[35m25[0mbd, [33mU[0m+[35m4e59[0m, [33mU[0m+[35m4[0mec1, [33mU[0m+[35m4[0mff3, [33mU[0m+[35m515[0ma, [33mU[0m+[35m518[0ma, [33mU[0m+[35m525[0mb, [33mU[0m+[35m5375[0m, [33mU[0m+[35m552[0mf,.[33m.[0m.
  [90m2704 |[0m }
  [90m2705 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2718:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2716 |[0m   font-weight: [35m700[0m;
  [90m2717 |[0m   font-display: swap;
[31m[1m>[0m [90m2718 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2719 |[0m   unicode-range: [33mU[0m+[35m4e18[0m, [33mU[0m+[35m4[0mfb5, [33mU[0m+[35m5104[0m, [33mU[0m+[35m52[0mc7, [33mU[0m+[35m5353[0m, [33mU[0m+[35m5374[0m, [33mU[0m+[35m53e5[0m, [33mU[0m+[35m587[0me, [33mU[0m+[35m594[0mf,.[33m.[0m.
  [90m2720 |[0m }
  [90m2721 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2726:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2724 |[0m   font-weight: [35m700[0m;
  [90m2725 |[0m   font-display: swap;
[31m[1m>[0m [90m2726 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2727 |[0m   unicode-range: [33mU[0m+[35m60[0m, [33mU[0m+[35m2200[0m, [33mU[0m+[35m226[0mb, [33mU[0m+[35m2461[0m, [33mU[0m+[35m517[0mc, [33mU[0m+[35m526[0mf, [33mU[0m+[35m5800[0m, [33mU[0m+[35m5[0mb97, [33mU[0m+[35m5[0mbf8, [33mU[0m.[35m.[0m.
  [90m2728 |[0m }
  [90m2729 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2734:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2732 |[0m   font-weight: [35m700[0m;
  [90m2733 |[0m   font-display: swap;
[31m[1m>[0m [90m2734 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2735 |[0m   unicode-range: [33mU[0m+[35m2460[0m, [33mU[0m+[35m4e5[0mf, [33mU[0m+[35m4e7[0me, [33mU[0m+[35m4[0med9, [33mU[0m+[35m501[0mf, [33mU[0m+[35m502[0mb, [33mU[0m+[35m5968[0m, [33mU[0m+[35m5974[0m, [33mU[0m+[35m5[0mac1,.[33m.[0m.
  [90m2736 |[0m }
  [90m2737 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2742:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2740 |[0m   font-weight: [35m700[0m;
  [90m2741 |[0m   font-display: swap;
[31m[1m>[0m [90m2742 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2743 |[0m   unicode-range: [33mU[0m+[35m21[0md2, [33mU[0m+[35m25[0mce, [33mU[0m+[35m300[0ma-[35m300[0mb, [33mU[0m+[35m4e89[0m, [33mU[0m+[35m4e9[0mc, [33mU[0m+[35m4[0mea1, [33mU[0m+[35m5263[0m, [33mU[0m+[35m53[0mcc, [33mU[0m+[35m...[0m
  [90m2744 |[0m }
  [90m2745 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2750:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2748 |[0m   font-weight: [35m700[0m;
  [90m2749 |[0m   font-display: swap;
[31m[1m>[0m [90m2750 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2751 |[0m   unicode-range: [33mU[0m+[35m2015[0m, [33mU[0m+[35m2190[0m, [33mU[0m+[35m4e43[0m, [33mU[0m+[35m5019[0m, [33mU[0m+[35m5247[0m, [33mU[0m+[35m52e7[0m, [33mU[0m+[35m5438[0m, [33mU[0m+[35m54[0mb2, [33mU[0m+[35m55[0mab,.[33m.[0m.
  [90m2752 |[0m }
  [90m2753 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2766:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2764 |[0m   font-weight: [35m700[0m;
  [90m2765 |[0m   font-display: swap;
[31m[1m>[0m [90m2766 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2767 |[0m   unicode-range: [33mU[0m+[35m4e03[0m, [33mU[0m+[35m4[0mf38, [33mU[0m+[35m50[0mb7, [33mU[0m+[35m5264[0m, [33mU[0m+[35m5348[0m, [33mU[0m+[35m5371[0m, [33mU[0m+[35m585[0ma, [33mU[0m+[35m58[0mca, [33mU[0m+[35m5951[0m,.[33m.[0m.
  [90m2768 |[0m }
  [90m2769 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2774:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2772 |[0m   font-weight: [35m700[0m;
  [90m2773 |[0m   font-display: swap;
[31m[1m>[0m [90m2774 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2775 |[0m   unicode-range: [33mU[0m+[35m7[0me, [33mU[0m+b4, [33mU[0m+[35m25[0mc6, [33mU[0m+[35m2661[0m, [33mU[0m+[35m4e92[0m, [33mU[0m+[35m4[0meee, [33mU[0m+[35m4[0mffa, [33mU[0m+[35m5144[0m, [33mU[0m+[35m5237[0m, [33mU[0m+[35m5...[0m
  [90m2776 |[0m }
  [90m2777 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2782:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2780 |[0m   font-weight: [35m700[0m;
  [90m2781 |[0m   font-display: swap;
[31m[1m>[0m [90m2782 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2783 |[0m   unicode-range: [33mU[0m+[35m25[0mcb, [33mU[0m+[35m4e71[0m, [33mU[0m+[35m4[0mf59, [33mU[0m+[35m50[0md5, [33mU[0m+[35m520[0ma, [33mU[0m+[35m5217[0m, [33mU[0m+[35m5230[0m, [33mU[0m+[35m523[0ma-[35m523[0mb, [33mU[0m+[35m...[0m
  [90m2784 |[0m }
  [90m2785 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2806:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2804 |[0m   font-weight: [35m700[0m;
  [90m2805 |[0m   font-display: swap;
[31m[1m>[0m [90m2806 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2807 |[0m   unicode-range: [33mU[0m+[35m25[0mbc, [33mU[0m+[35m3012[0m, [33mU[0m+[35m4[0mef2, [33mU[0m+[35m4[0mf0a, [33mU[0m+[35m516[0mb, [33mU[0m+[35m5373[0m, [33mU[0m+[35m539[0ma, [33mU[0m+[35m53[0mb3, [33mU[0m+[35m559[0mc,.[33m.[0m.
  [90m2808 |[0m }
  [90m2809 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2814:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2812 |[0m   font-weight: [35m700[0m;
  [90m2813 |[0m   font-display: swap;
[31m[1m>[0m [90m2814 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2815 |[0m   unicode-range: [33mU[0m+[35m3[0md, [33mU[0m+[35m5[0me, [33mU[0m+[35m25[0mcf, [33mU[0m+[35m4e0[0me, [33mU[0m+[35m4e5[0md, [33mU[0m+[35m4e73[0m, [33mU[0m+[35m4e94[0m, [33mU[0m+[35m4[0mf3c, [33mU[0m+[35m5009[0m, [33mU[0m+[35m5...[0m
  [90m2816 |[0m }
  [90m2817 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2822:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2820 |[0m   font-weight: [35m700[0m;
  [90m2821 |[0m   font-display: swap;
[31m[1m>[0m [90m2822 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2823 |[0m   unicode-range: [33mU[0m+[35m500[0md, [33mU[0m+[35m5074[0m, [33mU[0m+[35m50[0mcd, [33mU[0m+[35m5175[0m, [33mU[0m+[35m52e2[0m, [33mU[0m+[35m5352[0m, [33mU[0m+[35m5354[0m, [33mU[0m+[35m53[0mf2, [33mU[0m+[35m5409[0m,.[33m.[0m.
  [90m2824 |[0m }
  [90m2825 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2862:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2860 |[0m   font-weight: [35m700[0m;
  [90m2861 |[0m   font-display: swap;
[31m[1m>[0m [90m2862 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2863 |[0m   unicode-range: [33mU[0m+[35m2605[0m-[35m2606[0m, [33mU[0m+[35m301[0mc, [33mU[0m+[35m4e57[0m, [33mU[0m+[35m4[0mfee, [33mU[0m+[35m5065[0m, [33mU[0m+[35m52[0mdf, [33mU[0m+[35m533[0mb, [33mU[0m+[35m5357[0m, [33mU[0m+[35m..[0m.
  [90m2864 |[0m }
  [90m2865 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2894:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2892 |[0m   font-weight: [35m700[0m;
  [90m2893 |[0m   font-display: swap;
[31m[1m>[0m [90m2894 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2895 |[0m   unicode-range: [33mU[0m+[35m4e16[0m, [33mU[0m+[35m4e3[0mb, [33mU[0m+[35m4[0mea4, [33mU[0m+[35m4[0mee4, [33mU[0m+[35m4[0mf4d, [33mU[0m+[35m4[0mf4f, [33mU[0m+[35m4[0mf55, [33mU[0m+[35m4[0mf9b, [33mU[0m+[35m5317[0m,.[33m.[0m.
  [90m2896 |[0m }
  [90m2897 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2902:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2900 |[0m   font-weight: [35m700[0m;
  [90m2901 |[0m   font-display: swap;
[31m[1m>[0m [90m2902 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2903 |[0m   unicode-range: [33mU[0m+[35m26[0m, [33mU[0m+[35m5[0mf, [33mU[0m+[35m2026[0m, [33mU[0m+[35m203[0mb, [33mU[0m+[35m4e09[0m, [33mU[0m+[35m4[0meac, [33mU[0m+[35m4[0med5, [33mU[0m+[35m4[0mfa1, [33mU[0m+[35m5143[0m, [33mU[0m+[35m5...[0m
  [90m2904 |[0m }
  [90m2905 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2926:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2924 |[0m   font-weight: [35m700[0m;
  [90m2925 |[0m   font-display: swap;
[31m[1m>[0m [90m2926 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2927 |[0m   unicode-range: [33mU[0m+a9, [33mU[0m+[35m3010[0m-[35m3011[0m, [33mU[0m+[35m30e2[0m, [33mU[0m+[35m4e0[0mb, [33mU[0m+[35m4[0meca, [33mU[0m+[35m4[0med6, [33mU[0m+[35m4[0med8, [33mU[0m+[35m4[0mf53, [33mU[0m+[35m4[0mf...
  [90m2928 |[0m }
  [90m2929 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2934:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2932 |[0m   font-weight: [35m700[0m;
  [90m2933 |[0m   font-display: swap;
[31m[1m>[0m [90m2934 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2935 |[0m   unicode-range: [33mU[0m+[35m4[0me, [33mU[0m+a0, [33mU[0m+[35m3000[0m, [33mU[0m+[35m300[0mc-[35m300[0md, [33mU[0m+[35m4e00[0m, [33mU[0m+[35m4e0[0ma, [33mU[0m+[35m4e2[0md, [33mU[0m+[35m4e8[0mb, [33mU[0m+[35m4[0meba..[33m.[0m
  [90m2936 |[0m }
  [90m2937 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2942:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2940 |[0m   font-weight: [35m700[0m;
  [90m2941 |[0m   font-display: swap;
[31m[1m>[0m [90m2942 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2943 |[0m   unicode-range: [33mU[0m+[35m21[0m-[35m22[0m, [33mU[0m+[35m27[0m-[35m2[0ma, [33mU[0m+[35m2[0mc-[35m3[0mb, [33mU[0m+[35m3[0mf, [33mU[0m+[35m41[0m-[35m4[0md, [33mU[0m+[35m4[0mf-[35m5[0md, [33mU[0m+[35m61[0m-[35m7[0mb, [33mU[0m+[35m7[0md, [33mU[0m+ab,.[33m.[0m.
  [90m2944 |[0m }
  [90m2945 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2959:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2957 |[0m   font-weight: [35m700[0m;
  [90m2958 |[0m   font-display: swap;
[31m[1m>[0m [90m2959 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2960 |[0m   unicode-range: [33mU[0m+[35m0301[0m, [33mU[0m+[35m0400[0m-[35m045[0m[33mF[0m, [33mU[0m+[35m0490[0m-[35m0491[0m, [33mU[0m+[35m04[0m[33mB0[0m-[35m04[0m[33mB1[0m, [33mU[0m+[35m2116[0m;
  [90m2961 |[0m }
  [90m2962 |[0m [90m/* vietnamese */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2977:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2975 |[0m   font-weight: [35m700[0m;
  [90m2976 |[0m   font-display: swap;
[31m[1m>[0m [90m2977 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2978 |[0m   unicode-range: [33mU[0m+[35m0100[0m-[35m02[0m[33mBA[0m, [33mU[0m+[35m02[0m[33mBD[0m-[35m02[0m[33mC5[0m, [33mU[0m+[35m02[0m[33mC7[0m-[35m02[0m[33mCC[0m, [33mU[0m+[35m02[0m[33mCE[0m-[35m02[0m[33mD7[0m, [33mU[0m+[35m02[0m[33mDD[0m-[35m02[0m[33mFF[0m, [33mU[0m+[35m0304[0m..[33m.[0m
  [90m2979 |[0m }
  [90m2980 |[0m [90m/* latin */[0m

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


[next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2986:8
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  [90m2984 |[0m   font-weight: [35m700[0m;
  [90m2985 |[0m   font-display: swap;
[31m[1m>[0m [90m2986 |[0m   src: url(@vercel/turbopack-next/internal/font/google/font?{%[35m22[0murl%[35m22[0m:%[35m22[0mhttps:[90m//fonts....[0m
  [90m     |[0m        [31m[1m^[0m
  [90m2987 |[0m   unicode-range: [33mU[0m+[35m0000[0m-[35m00[0m[33mFF[0m, [33mU[0m+[35m0131[0m, [33mU[0m+[35m0152[0m-[35m0153[0m, [33mU[0m+[35m02[0m[33mBB[0m-[35m02[0m[33mBC[0m, [33mU[0m+[35m02[0m[33mC6[0m, [33mU[0m+[35m02[0m[33mDA[0m, [33mU[0m+[35m02[0m[33mDC[0m, [33m.[0m.[35m.[0m
  [90m2988 |[0m }
  [90m2989 |[0m @font-face {

Import map: Resolved by import map


Import trace:
  Server Component:
    [next]/internal/font/google/noto_sans_jp_43a8d00c.module.css
    [next]/internal/font/google/noto_sans_jp_43a8d00c.js
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:6:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:14:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:54:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:62:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:70:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:78:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:86:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:94:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:110:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:118:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:126:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:134:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:142:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:150:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:158:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:166:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:174:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:182:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:190:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:214:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:246:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:254:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:262:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:278:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:286:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:294:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:302:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:310:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:318:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:326:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:334:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:350:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:366:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:374:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:382:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:406:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:422:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:446:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:454:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:462:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:470:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:502:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:526:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:542:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:550:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:558:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:566:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:574:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:614:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:630:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:638:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:662:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:670:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:686:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:694:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:702:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:710:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:726:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:734:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:742:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:750:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:758:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:774:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:782:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:790:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:814:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:822:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:830:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:870:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:902:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:910:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:934:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:942:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:950:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:967:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:985:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:994:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1002:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1010:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1050:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1058:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1066:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1074:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1082:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1090:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1106:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1114:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1122:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1130:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1138:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1146:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1154:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1162:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1170:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1178:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1186:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1210:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1242:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1250:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1258:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1274:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1282:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1290:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1298:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1306:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1314:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1322:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1330:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1346:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1362:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1370:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1378:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1402:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1418:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1442:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1450:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1458:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1466:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1498:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1522:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1538:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1546:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1554:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1562:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1570:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1610:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1626:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1634:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1658:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1666:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1682:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1690:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1698:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1706:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1722:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1730:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1738:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1746:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1754:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1770:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1778:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1786:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1810:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1818:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1826:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1866:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1898:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1906:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1930:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1938:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1946:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1963:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1981:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1990:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:1998:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2006:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2046:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2054:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2062:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2070:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2078:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2086:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2102:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2110:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2118:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2126:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2134:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2142:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2150:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2158:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2166:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2174:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2182:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2206:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2238:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2246:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2254:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2270:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2278:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2286:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2294:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2302:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2310:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2318:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2326:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2342:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2358:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2366:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2374:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2398:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2414:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2438:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2446:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2454:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2462:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2494:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2518:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2534:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2542:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2550:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2558:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2566:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2606:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2622:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2630:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2654:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2662:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2678:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2686:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2694:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2702:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2718:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2726:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2734:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2742:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2750:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2766:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2774:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2782:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2806:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2814:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2822:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2862:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2894:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2902:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2926:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2934:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2942:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2959:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2977:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
    at <unknown> ([next]/internal/font/google/noto_sans_jp_43a8d00c.module.css:2986:8)
    at <unknown> (https://nextjs.org/docs/messages/module-not-found)
error: script "build" exited with code 1

```

## Phase: typecheck

_(skipped — previous command failed)_

## Phase: test

_(skipped — previous command failed)_

## Phase: lint

_(skipped — previous command failed)_
