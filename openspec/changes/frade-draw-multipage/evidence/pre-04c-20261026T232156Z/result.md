The focused PRE plan **passes**. The popup RED is explained by the v1 envelope: it has no page-name field. A one-page v2 envelope can retain the selected page’s ID, name, graph, and viewport while using a new top-level document ID. The reviewed codec, session, and one-shot transfer path support that representation without copying other pages or writing popup edits back to the source. All 24 packet artifacts match their recorded hashes.

This approves the **plan repair only**. The targeted regression still needs to prove those preserved fields and source independence; full implementation tests, verification, and POST remain pending.

GATE_STATUS: PASS