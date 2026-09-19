# Release dependency authority

This baseline freezes the versions used by the clean release proof. `package.json`,
`bun.lock`, and the installed tree agree for every web dependency below. The Python
rows are declared in the coordinated scraper repository at commit
`307f306dc3edf18a997b2d27ddba2c6ee18b9bf1` and locked by its `uv.lock`.

| Dependency | Declared | Lockfile | Verified installed | Authoritative baseline |
| --- | --- | --- | --- | --- |
| Node | `26.7.0` engine | CI input | `26.7.0` | `26.7.0` |
| Bun | `1.3.14` package manager | CI input | `1.3.14` | `1.3.14` |
| Next | `16.2.11` | `16.2.11` | `16.2.11` | `16.2.11` |
| React | `19.2.4` | `19.2.4` | `19.2.4` | `19.2.4` |
| React DOM | `19.2.4` | `19.2.4` | `19.2.4` | `19.2.4` |
| Drizzle ORM | `1.0.0-beta.9-e89174b` | same | same | `1.0.0-beta.9-e89174b` |
| drizzle-kit | `1.0.0-beta.9-e89174b` | same | same | `1.0.0-beta.9-e89174b` |
| pg | `8.20.0` | `8.20.0` | `8.20.0` | `8.20.0` |
| Vitest | `4.1.10` | `4.1.10` | `4.1.10` | `4.1.10` |
| TypeScript | `5.9.3` | `5.9.3` | `5.9.3` | `5.9.3` |
| Biome | `2.4.11` | `2.4.11` | `2.4.11` | `2.4.11` |
| Python | `.python-version` `3.14.7` | CI input | `3.14.7` | `3.14.7` |
| httpx | `0.28.1` | `0.28.1` | `0.28.1` | `0.28.1` |
| Pydantic | `2.13.4` | `2.13.4` | `2.13.4` | `2.13.4` |
| BeautifulSoup | `4.15.0` | `4.15.0` | `4.15.0` | `4.15.0` |
| pytest | `8.4.2` | `8.4.2` | `8.4.2` | `8.4.2` |
| Ruff | `0.16.0` | `0.16.0` | `0.16.0` | `0.16.0` |
| PostgreSQL | target `17` | pinned CI image digest | client `17.11` | major `17` |

The release supports the tested `pg` 8 line only. `pg` 9 is intentionally
unsupported until the overlapping-query compatibility warning is reviewed and a
dedicated regression proof passes.

The CI action implementations are also commit-pinned. Clean installation uses
`bun install --frozen-lockfile` and `uv sync --frozen --extra dev --no-editable`.
The non-editable Python install is deliberate: Python 3.14 ignores hidden `.pth`
files, including setuptools' conventional `__editable__.*.pth` path file.
