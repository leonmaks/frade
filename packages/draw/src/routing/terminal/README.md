# Routing V2 terminal ownership

This directory owns semantic, framework-independent terminal data and endpoint resolution. Bindings,
connection constraints, and port constraints do not inspect a graph, select a routing direction,
construct route segments, or persist derived endpoint coordinates. `perimeter/` owns shape-boundary
geometry; terminal code may depend inward on it and on the read-only R01 geometry/model contracts.

`resolveFixedTerminal` is the pre-routing boundary. Anchors return a fresh authoritative point;
fixed constraints return a finite affine point and use radial shape projection only when their
`perimeter` flag is true; floating bindings return `null`. `null` means only “not fixed.” Missing or
invalid geometry throws. The resolver accepts no opposite point, intermediate route, direction
policy, or history, so later floating resolution cannot relocate a fixed result.

`resolveFloatingTerminal` is the post-intermediate boundary. The caller supplies points without
endpoints, the explicit source/target role, and a pre-floating opposite-reference snapshot. Source
uses the first point, target uses the last, and an empty list uses that snapshot. Callers must obtain
the snapshot from the opposite fixed result when available, otherwise from opposite routing-bounds
center, and must bypass floating resolution for authoritative fixed/anchor results. The resolver does
not normalize/search the list, generate bends, select directions, or consume a just-resolved opposite
floating endpoint.
