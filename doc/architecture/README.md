# Architecture documentation

Architectural analysis of `node-red-contrib-ntrip`. Start with
[overview.md](overview.md) for a high-level orientation.

| Chapter | Read when |
|---------|-----------|
| [Overview](overview.md) | First contact — what this package is and how the pieces fit. |
| [Structural Design](structural-design.md) | You need to find or change a specific file / module. |
| [Behavioural Design](behavioural-design.md) | You're changing runtime behaviour — state machines, error paths, lifecycle hooks. |
| [Architecture Decisions](architecture-decisions.md) | You're about to revisit a load-bearing decision. Individual ADRs live in [adr/](adr/). |
| [Errors and Weaknesses](errors-and-weaknesses.md) | You're triaging a bug report — check whether it's already known. |
| [Refactoring Recommendations](refactoring-recommendations.md) | You have spare cycles and want to invest them in code health. |
| [Future Improvements](future-improvements.md) | You're planning the next minor release. |
| [Statistics](statistics.md) | You want a quantitative read on size, test coverage, and quality. |

This documentation lives alongside the code and is versioned with it. When
you change behaviour that contradicts a statement here, update the doc in the
same commit.
