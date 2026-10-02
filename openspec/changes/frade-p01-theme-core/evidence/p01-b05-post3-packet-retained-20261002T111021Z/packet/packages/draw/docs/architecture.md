# Architecture

React renders controls; `createGraph` creates the single X6 graph. X6 cells are the mutable source of truth. Pure document, routing, geometry, attachment, and segment modules do not import React. The current segment decision is an adapter around X6 native `segments`, documented in `docs/x6-segments-spike.md`.
