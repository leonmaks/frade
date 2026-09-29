# R04 planning repair: bounded `runtime-invalid` mutation outcome

> Historical planning draft. The independent PRE revalidation on 2026-09-29
> found this draft too broad and superseded it with the exact candidate-bound
> contract in `design.md` section 6a. In particular, this draft's four-way
> field-combination and symmetric-operator wording is no longer authoritative.

Change: `routing-v2-04-orthogonal-router`

Decision: option 2 selected by the user. This file records planning only;
implementation, mutation execution, Verify and archive remain blocked until a
fresh independent PRE revalidation passes.

## Problem

The complete inventory is compiler-valid through candidate 82, whose `<` to
`<=` mutation supplies `undefined` to `checkedPoint`. The unchanged R01 finite
validator emits a RangeError from `assertFiniteNumber` in the isolated
`model/validation.ts`. Under the original contract this is an unknown structured
failure and correctly aborts the run, leaving no score.

## Approved bounded extension

Introduce a harness-only `runtime-invalid` outcome. It is admitted only when
candidate metadata, child status, complete schema-3 audit, JSON report, exact
finite-validation message and isolated first stack frame all match design
section 6a. The current manifest enumerates four horizontal/vertical and x/y
field combinations. It does not authorize a wildcard Error/RangeError/TypeError
rule, message substring matching, later-frame origin, or acceptance of mixed
errors.

The outcome is retained separately, contributes to effective killed mutants for
the threshold calculation, and is visible in the final report. Compiler-invalid
remains outside the executable denominator. Survivors and timeouts remain in
the denominator and never count as kills. Any unknown, infrastructure, global,
spawn, signal or timeout evidence aborts before scoring.

## Required controls before implementation resumes

- exact authentic bounded runtime-invalid specimen;
- altered field/message, wrong candidate category and wrong operator;
- wrong first frame and non-runner-owned origin;
- additional unknown Error/TypeError/RangeError evidence;
- timeout and infrastructure precedence;
- complete child retention, hash and aggregate consistency;
- score accounting with separate `runtimeInvalid` and effective killed counts.

## Scope and authority

No delta requirement, master specification, implementation playbook, AGENTS
contract, R01/R02/R03 source or production file is changed by this repair.
`design.md` and `tasks.md` are the active planning artifacts for the harness
contract. The approved `BASE_COMMIT` is unchanged. The existing architecture
gate/workspace blocker remains independent and unresolved.

PLANNING_REPAIR_STATUS: SPECIFIED_PENDING_PRE_REVALIDATION
READY_FOR_IMPLEMENTATION: NO
