# Path-resolution evidence

Node24 documents realpathSync.native as the synchronous native realpath API; UTF8 paths are required. Linux musl has a procfs dependency, so the planned optimization is Windows-only and leaves other platforms on their existing implementation. Source: [Node24 filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html#fsrealpathsyncnativepath-options).

Actual Windows v24.18.0 probe:667 canonical paths identical; standard936.4ms/native136.8ms. This is measured tool cost, not a gate result. Native-only and memo/single-read prospective alternatives still exceed the original5000ms tamper deadline and are rejected. Selected prospective exact-dispatch/native callback observations:1742ms first verification,3490ms tamper. These process-only loader/fs overrides are diagnostic, not production changes or acceptance.
