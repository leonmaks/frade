# Native resize readiness RCA

Classification: TEST. No production fix.

Lower unchanged readiness accepted translate984 before delayed native Format completion. Two causal diagnostic runs preserve readiness/actions/assertions and FAIL. Extended raw records show inline transition width0.1s, initial refresh at pinned app.min.js2379, final refresh2380 changes984 to745, clears transition and emits formatWidthChanged. Earlier run ended748; these are observations, not new expectations/tolerances. Sole bridge has no Format/Shapes toggle calls.

Reflow raw control records the delayed native toggleShapesPanel q/refresh at14696-14697. Completion clears sidebar transition/transform and emits shapesPanelChanged. This finding only attributes these two native resize effects, not other full failures or all bridge behavior.

Readiness observes lastWindowWidth catching actual iframe width, both native leases, completion events when pending was observed, then six stable geometry frames. Already completed transitions need no historical event. A120frame/5second deadline fails and never grants readiness. Listeners/RAF/deadline always cleaned. Original two readiness loops and every action/assertion remain exact. Temporary diagnostics removed by exact reverse restoration. The permanent two additions and new helper reverse to all original bytes; origins never rebaselined. Other full failures remain open.
