# Structural Design

## Repository layout

```
node-red-contrib-ntrip/
├── ntrip/
│   ├── 99-ntrip.js          # Node-RED registration entry point
│   ├── 99-ntrip.html        # Editor UI for all four nodes (forms + help text)
│   ├── nodes/
│   │   ├── ntrip-client-node.js
│   │   ├── rtcm-decoder-node.js
│   │   ├── nmea-decoder-node.js
│   │   └── nmea-encoder-node.js
│   └── lib/
│       └── ntrip-client.js  # Local extension of the upstream ntrip-client package
├── examples/                # Sample flows (ntripclient.json, sapos.json, upload.json, …)
├── test/                    # Mocha specs (one per node, suffixed .spec.js)
├── images/                  # Screenshots referenced by README.md
├── doc/architecture/        # This documentation tree
├── package.json
├── package-lock.json
├── CHANGELOG.md
├── CLAUDE.md
└── README.md
```

## Module dependency graph

```
   ┌────────────────────────┐
   │   ntrip/99-ntrip.js    │  (Node-RED entry, registerType x 4)
   └─────────┬──────────────┘
             │ require
   ┌─────────┴────────────────────────────────────────────────────────┐
   ▼              ▼                  ▼                   ▼            │
 ntrip-client-  rtcm-decoder-      nmea-decoder-      nmea-encoder-   │
 node.js        node.js            node.js            node.js         │
   │              │                  │                   │            │
   │ require      │ require          │ require           │ require    │
   ▼              ▼                  ▼                   ▼            │
 lib/ntrip-     @gnss/rtcm         @gnss/nmea          @gnss/nmea     │
 client.js                                                            │
   │                                                                  │
   │ require                                                          │
   ▼                                                                  │
 ntrip-client  (npm package, upstream)                                │
                                                                      │
                                                                      ▼
                                                       package.json reads
                                                       version into log line
```

## File responsibilities

### Entry layer

| File | Responsibility |
|------|----------------|
| [ntrip/99-ntrip.js](../../ntrip/99-ntrip.js) | Imports each node implementation. Registers the four types with `RED.nodes.registerType`. Declares the `credentials` block for `NtripClient`. Reads the package version from `package.json` and logs it. |
| [ntrip/99-ntrip.html](../../ntrip/99-ntrip.html) | Per-node `registerType` call (client side), the configuration `<template>`, and the help text shown in Node-RED's info sidebar. The credentials block is duplicated here — Node-RED requires both. |

### Node implementations

| File | Type | Inputs | Outputs |
|------|------|--------|---------|
| [ntrip/nodes/ntrip-client-node.js](../../ntrip/nodes/ntrip-client-node.js) | `NtripClient` | 1 | 1 (data from caster + optional pass-through of writes) |
| [ntrip/nodes/rtcm-decoder-node.js](../../ntrip/nodes/rtcm-decoder-node.js) | `RtcmDecoder` | 1 | 2 (decoded, error) |
| [ntrip/nodes/nmea-decoder-node.js](../../ntrip/nodes/nmea-decoder-node.js) | `NmeaDecoder` | 1 | 2 (decoded, error) |
| [ntrip/nodes/nmea-encoder-node.js](../../ntrip/nodes/nmea-encoder-node.js) | `NmeaEncoder` | 1 | 2 (encoded, error) |

All four follow the same skeleton:

```javascript
module.exports = function (RED) {
    function Node(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.<counter>Received = 0;
        node.invalidMessagesReceived = 0;

        // ... wire up the on('input') handler, possibly an external resource

        this.on('close', function (done) {
            // cleanup
            node.status({});
            done();
        });
    }
    return Node;
};
```

### Library layer

[ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js) — a thin local
adapter around the upstream `ntrip-client` npm package. Exposes two factories:

- `createDownloader(options)` — returns the upstream `NtripClient` unchanged.
- `createUploader(options)` — returns a subclass `NtripClientUploader` that
  overrides `_connect()` to switch the handshake string by `authmode`
  (`legacy`, `hybrid`, `ntripv1`, `ntripv2`). The constructor also rejects
  CR/LF in `mountpoint`/`username`/`password` to prevent header injection.

The override pattern is a full replacement of the parent's `_connect`, not a
delegation — see [ADR-0002](adr/0002-ntrip-uploader-extension.md) for the
rationale and trade-offs.

## Class / type hierarchy

```
ntrip-client (npm)
  └── NtripClient            # download
        └── NtripClientUploader (lib/ntrip-client.js)   # upload
```

No other classes are defined in this package; every Node-RED node is a plain
function passed to `registerType`, and decoder/encoder state lives on the node
instance via simple property assignment (`node.pendingBuffer`, `node.messagesReceived`).

## Coupling

- **High cohesion within each node file.** A node's input handler, status
  updates, and close handler are co-located. There is no shared mutable state
  across node instances.
- **No cross-node imports.** The decoders do not know about `NtripClient` and
  vice versa; they communicate only through Node-RED wires at flow runtime.
- **Two seams to the outside world:**
  - The `ntrip-client` upstream package (via [lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js)).
  - `@gnss/rtcm` and `@gnss/nmea` for codec work.
- **Implicit coupling between [99-ntrip.js](../../ntrip/99-ntrip.js) and [99-ntrip.html](../../ntrip/99-ntrip.html)** — both must declare the `credentials` block, and the registered node-type names must match exactly. The HTML form field IDs (`node-input-host`, `node-input-port`, …) must align with the property names read in the JS (`config.host`, `config.port`, …).

## Distribution shape

- `node-red.nodes` in [package.json](../../package.json) points only at
  `ntrip/99-ntrip.js` — Node-RED loads that file, which transitively pulls in
  everything else.
- Runtime dependencies: `@gnss/nmea`, `@gnss/rtcm`, `ntrip-client`. No transient
  runtime dependency on Node-RED itself.
- Dev-only dependencies: `mocha`, `chai` (CJS v4), `node-red`,
  `node-red-node-test-helper`.
