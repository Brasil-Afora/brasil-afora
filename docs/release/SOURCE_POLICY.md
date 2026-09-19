# Production source policy

Source execution state is versioned and fail-closed:

| State | Scheduler behavior | Explicit execution |
| --- | --- | --- |
| `disabled` | excluded | rejected by web persistence when the registered DB source is disabled |
| `supervised` | excluded | allowed only through an explicit operator source run |
| `unattended` | eligible for normal scheduled discovery/recrawl | allowed |

For this baseline, **ONE = supervised**. The scraper repository's root
`config/sources.toml` marks ONE enabled only for `supervised_run`. Its packaged
default `src/brasil_afora_scraper/data/sources.toml` contains no live sources.
The ordinary worker cannot acquire ONE from its package default, and the normal
web scheduler excludes `supervised_run` sources.

The database's source state is authoritative at ingestion time. A payload cannot
re-enable a disabled registered source, and a stale disabled payload cannot disable
an enabled registered source. Contract tests cover both cases and verify that a
rejected disabled source creates no snapshot.

This baseline does not enable unattended ONE, onboard FEBRACE, or configure any
production schedule.
