# Document format

Documents use `{ format: "frade-draw", version: 1, metadata, graph, viewport? }`. Existing `frade-designer` version-1 documents remain readable.

Nodes retain semantic shape identity (`rect`, `rounded-rect`, `ellipse`, `diamond`, `text`), position, size, text, supported body/label presentation styles and optional absolute local port coordinates. Supported style keys are defined by `styleKeys` in the schema; arbitrary markup, URLs, tools and interaction state are not part of the format.

Edges retain floating or fixed terminal identities, optional center-relative terminal offsets, full vertices, legacy constraints, supported line style, router choice and target marker. Explicit offsets are committed route-editing geometry; automatically computed routing diagnostics and caches are transient. New exports retain full vertices because legacy alternating-axis constraints alone cannot reproduce every route.

The viewport records zoom and translation. Metadata contains a stable document ID and download name. Save downloads a JSON file; Save As asks for a new name and uses it for subsequent downloads. These browser operations do not overwrite a file in place.

Open validates shape types, finite geometry, unique cell IDs, terminal references, styles, ports and viewport before graph replacement. Invalid input leaves the active document intact and shows an error. New/Open reset selection and undo history. New also resets viewport and document metadata. Stale asynchronous reads cannot overwrite a newer document.

Legacy files without port positions receive deterministic right-side port positions; missing viewport defaults to zoom 1 and translation 0. Full vertices take precedence over legacy constraints. Data already discarded by an older exporter cannot be recovered.

Repository documents may use the `.frade` extension. Nodes can additionally contain `repositoryRef: { objectId: string, sourceId?: string }`. This optional field is validated and roundtrips through the graph adapter; it contains no filesystem path or authority to access another repository. Older documents without references remain valid. Hosts interpret local references relative to the owning document repository and may handle selection/activation and NRT object-update events. Standalone mode retains its existing download lifecycle; an embedded host owns persistence.
