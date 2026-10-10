# S1 Main close RCA

2026-10-10T17:00:58.703Z. STATE_TRANSITION / INVARIANT. Actual AST-extracted production callbacks reproduce3FAIL/10PASS: rejected helper close still calls app.quit; concurrent before-quit bypasses pending closure because quitting=true is treated as successful final exit; presentation failure callback calls app.exit despite unconfirmed helper close. Source-bound behavior RED p02-check-main-actual-quit-red-20261010T165840089Z.

Fix within accepted Main actual-close contract: separate in-progress from quitConfirmed, prevent every reentrant exit while pending, permit final exit only after fulfilled installer.dispose. Reject path logs truthfully, clears in-progress to keep later quit guarded; no success exit on unconfirmed close. Preserve original dirty work and other backend/repository allSettled behavior. Presentation5000ms source/timer/assertions unchanged; only S1-added helper-disposal result guard corrected.
