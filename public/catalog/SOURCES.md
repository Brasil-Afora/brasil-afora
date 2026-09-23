# Catalog image sources

Every image here is a crop of the repository's existing `public/map.jpg`, an equirectangular night-lights world map (its original source is not recorded in the repo), resized for web delivery. No other editing.

- `header-mundo-v2.jpg`: longitude −130° to 160°, latitude 66° to −48° (international catalog header and the home page map). The `-v2` suffix is load-bearing: the image URL is part of the image-optimization cache key, so a re-crop must always ship under a new filename or stale variants will misalign the map pins.
- `header-brasil.jpg`: longitude −82° to −18°, latitude 8° to −36° (national catalog header).
- `cover-*.jpg`: 2:1 regional crops used as card covers when an opportunity has no photograph (Brazilian regions: brasil, sudeste, sul, nordeste, norte, centro-oeste; world regions: america-do-norte, america-latina, europa, africa, asia, oceania, mundo).

## Day twins (`day/`, light theme)

`day/header-mundo-v2.jpg`, `day/header-brasil.jpg` and `day/cover-*.jpg` are the same windows cut from `public/map-day.jpg` (NASA Earth Observatory, *Blue Marble: Next Generation*, graded for paper; see `public/map-tiles/SOURCES.md`) by `scripts/build-map-crops.mjs`, at the same pixel sizes as the night files, so pins land in the same place on both. That script is now the record of every window: the cover windows had never been written down and were recovered on 2026-09-23 by matching each night cover against `public/map.jpg` (the method and checks are in the script's header).

## Photographs

- `header-programas-v1.jpg` (Programas e Bolsas header): *Suzzallo Reading Room University of Washington restoration Seattle Washington 2026.jpg* (2026-02-15), by Guywelch2000, via Wikimedia Commons. CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Original: https://commons.wikimedia.org/wiki/File:Suzzallo_Reading_Room_University_of_Washington_restoration_Seattle_Washington_2026.jpg. Cropped from the home hero copy (`public/home/hero/night/washington-suzzallo.jpg`, 2400×1800) to a 2400×1080 band (top 380px) and resized to 2000×900. Credited on the page while shown. Same `-vN` rule as the maps: a re-crop ships under a new filename.
