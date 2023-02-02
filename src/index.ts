#!/usr/bin/env node
import Piscina from "piscina";
import { join } from "path";
import reprojectBBox from "reproject-bbox";
import { program } from "commander";
import { once } from "events";

const piscina = new Piscina({
  filename: join(__dirname, "worker.js"),
});

const version = "0.0.1";
const cmd = program
  .version(version)
  .option(
    "-r, --resampling <resampling>",
    "Resampling method (near, bilinear, mode, max, min, med)"
  )
  .option("-z, --zoom <zoom>", "Zoom levels to render (format:'2-5' or '10')")
  .option("-a, --nodata <nodata>", "Nodata value to burn in")
  .option("-h, --help", "Show help message and exit")
  .option("--tilesize <PIXELS>", "Tile size in pixels (default: 256)")
  .option(
    "--webp-quality <QUALITY>",
    "QUALITY is a integer between 1-100. Default is 75."
  )
  .option("--webp-lossless", "Use WEBP lossless compression, default is lossy")
  .parse(process.argv);
//   .option(
//     "-p, --profile <profile>",
//     "Tile cutting profile (mercator,geodetic,raster)"
//   )
//   .option("-s, --srs <srs>", "Target SRS")
//   .option("-e, --resume", "Resume mode (don't overwrite existing files)")
//   .option("-v, --verbose", "Verbose output")
//   .option("-q, --quiet", "Quiet output")
//   .option(
//     "-k, --force-kml",
//     "Generate KML for Google Earth - default for 'geodetic' profile and 'raster' in EPSG:4326. For a dataset with different projection use with caution!"
//   )
//   .option(
//     "-n, --no-kml",
//     "Avoid automatic generation of KML files for EPSG:4326."
//   )
//   .option(
//     "-u, --url <url>",
//     "URL address where the generated tiles are going to be published."
//   )
//   .option(
//     "-w, --webviewer <webviewer>",
//     "Web viewer to generate (all, google, openlayers, leaflet, mapml, none) - default 'all'."
//   )
//   .option("-t, --title <title>", "Title of the map.")
//   .option("-c, --copyright <copyright>", "Copyright for the map.")
//   .option(
//     "-g, --googlekey <googlekey>",
//     "Google Maps API key from http://code.google.com/apis/maps/signup.html."
//   )
//   .option(
//     "-b, --bingkey <bingkey>",
//     "Bing Maps API key from https://www.bingmapsportal.com/"
//   )
//   .option(
//     "--processes <NB_PROCESSES>",
//     "Number of processes to use (default: number of CPUs)"
//   )
//   .option("--mpi", "Use MPI for parallel processing")
//   .option("--xyz", "Generate XYZ tiles instead of TMS")
//   .option("--tmscompatible", "Create tiles compatible with OSGeo TMS")
//   .option(
//     "--mapml-template <filename>",
//     "Filename of a template mapml file where variables will be substituted. If not specified, the generic template_tiles.mapml file from GDAL data resources will be used"
//   )

const options = cmd.opts<{
  tilesize?: number;
  webpQuality?: number;
  zoom?: string;
  webpLossless?: boolean;
  resampling?: string;
  help?: boolean;
  nodata?: number;
}>();

const tilesize = options.tilesize || 256;
const webpQuality = options.webpQuality || 75;
const zommRange = options.zoom || "0-5";
const webpLossless = options.webpLossless || false;
const resampling = options.resampling || "near";
const help = options.help || false;
const nodata = options.nodata || 0;
const input = cmd.args[0];
const output = cmd.args[1] || "./output";

if (help) {
  cmd.help();
}

const [minZoom, maxZoom] = zommRange.split("-").map((v) => +v) as [
  number,
  number
];

(async () => {
  const { fromFile } = await import("geotiff");
  const geotiff = await fromFile(input as string);
  const image = await geotiff.getImage();
  const [minX, minY, maxX, maxY] = image.getBoundingBox() as [
    number,
    number,
    number,
    number
  ];
  const bbox = reprojectBBox({
    bbox: [minX, minY, maxX, maxY],
    from: image.geoKeys.ProjectedCSTypeGeoKey,
    to: 4326,
  });
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const [xMin, xMax, yMin, yMax] = bboxToXyz(
      bbox[0],
      bbox[2],
      bbox[1],
      bbox[3],
      zoom
    );
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const tileBBox = tileEdges(x, y, zoom);
        piscina.run({
          x,
          y,
          zoom,
          bbox: tileBBox,
          tilesize,
          webpQuality,
          webpLossless,
          resampling,
          nodata,
          output,
          input,
        });
      }
    }
  }

  await once(piscina, "drain");
  await once(piscina, "completed");
  await piscina.destroy();
})();

export function bboxToXyz(
  lonMin: number,
  lonMax: number,
  latMin: number,
  latMax: number,
  z: number
): [number, number, number, number] {
  const [xMin, yMax] = latlonToXyz(latMin, lonMin, z);
  const [xMax, yMin] = latlonToXyz(latMax, lonMax, z);
  return [
    Math.floor(xMin),
    Math.floor(xMax),
    Math.floor(yMin),
    Math.floor(yMax),
  ];
}

export function tileEdges(
  x: number,
  y: number,
  z: number
): [number, number, number, number] {
  const [lat1, lat2] = yToLatEdges(y, z);
  const [lon1, lon2] = xToLonEdges(x, z);
  return [lon1, lat1, lon2, lat2];
}

export function latlonToXyz(
  lat: number,
  lon: number,
  z: number
): [number, number] {
  const tileCount = 2 ** z;
  const x = (lon + 180) / 360;
  const y =
    (1 - Math.log(Math.tan(radians(lat)) + sec(radians(lat))) / Math.PI) / 2;
  return [tileCount * x, tileCount * y];
}

function yToLatEdges(y: number, z: number): [number, number] {
  const tileCount = 2 ** z;
  const unit = 1 / tileCount;
  const relativeY1 = y * unit;
  const relativeY2 = relativeY1 + unit;
  const lat1 = mercatorToLat(Math.PI * (1 - 2 * relativeY1));
  const lat2 = mercatorToLat(Math.PI * (1 - 2 * relativeY2));
  return [lat1, lat2];
}

function xToLonEdges(x: number, z: number): [number, number] {
  const tileCount = 2 ** z;
  const unit = 360 / tileCount;
  const lon1 = -180 + x * unit;
  const lon2 = lon1 + unit;
  return [lon1, lon2];
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function sec(x: number): number {
  return 1 / Math.cos(x);
}

export function xyzToLatlon(x: number, y: number, z: number): [number, number] {
  const tileCount = 2 ** z;
  const unit = 360 / tileCount;
  const lon = -180 + x * unit;
  const lat = mercatorToLat(Math.PI * (1 - (2 * y) / tileCount));
  return [lon, lat];
}

export function mercatorToLat(mercatorY: number): number {
  return (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;
}
