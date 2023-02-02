# tiff2tiles

Convert GeoTIFF to tiles for web map.

## Usage

```bash
tiff2tiles [options] <input> [output]
```

## Options

```
  -r, --resampling <resampling>  Resampling method (near, bilinear, mode, max, min, median) (default: "near")
  -z, --zoom <zoom>              Zoom levels to render (format:'2-5' or '10') (default: "0-5")
  -a, --nodata <nodata>          Nodata value to burn in (default: 0)
  -h, --help                     Show help message and exit
  --tilesize <PIXELS>            Tile size in pixels (default: 256)
  --webp-quality <QUALITY>       QUALITY is a integer between 1-100. Default is 75. (default: 75)
  --webp-lossless                Use WEBP lossless compression, default is lossy
  -V, --version                  output the version number
```

## Examples

```bash
tiff2tiles input.tif ./tiles --zoom "0-18" -r near
```

```bash
tiff2tiles -z 0-5 -r near -a 0 -h -V --tilesize 256 --webp-quality 75 --webp-lossless ./input.tif ./output
```
