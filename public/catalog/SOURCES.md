# Catalog image sources

Every image here is a crop of the repository's existing `public/map.jpg`, an equirectangular night-lights world map (its original source is not recorded in the repo), resized for web delivery. No other editing.

- `header-mundo-v2.jpg`: longitude −130° to 160°, latitude 66° to −48° (international catalog header and the home page map). The `-v2` suffix is load-bearing: the image URL is part of the image-optimization cache key, so a re-crop must always ship under a new filename or stale variants will misalign the map pins.
- `header-brasil.jpg`: longitude −82° to −18°, latitude 8° to −36° (national catalog header).
- `cover-*.jpg`: 2:1 regional crops used as card covers when an opportunity has no photograph (Brazilian regions: brasil, sudeste, sul, nordeste, norte, centro-oeste; world regions: america-do-norte, america-latina, europa, africa, asia, oceania, mundo).
