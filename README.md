# tiff2tiles

Convert GeoTIFF to tiles for web map.

## Usage

```bash
npx tiff2tiles [options] <file|url> [output]
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

## Try it out

```bash
npx tiff2tiles https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/S/YB/2023/1/S2A_36SYB_20230130_0_L2A/TCI.tif tci_tiles --zoom "8-10"
```

## Examples

```bash
npx tiff2tiles input.tif ./tiles --zoom "0-18" -r near
```

```bash
npx tiff2tiles ./input.tif ./output --zoom "0-5" --resampling near -nodata 0 --tilesize 256 --webp-quality 75 --webp-lossless
```

```bash
npx tiff2tiles https://example.com/input.tif ./output --zoom "0-5"
```
