// @ts-ignore
import createTile from "geotiff-tile";
import fs from "fs";
import { join } from "path";
import sharp from "sharp";

export default async function createTileWorker({
  input,
  bbox,
  tilesize,
  output,
  x,
  y,
  zoom,
  nodata,
  webpQuality,
  webpLossless,
  resampling,
}: {
  input: string;
  bbox: [number, number, number, number];
  tilesize: number;
  output: string;
  x: number;
  y: number;
  zoom: number;
  nodata: number;
  webpQuality: number;
  webpLossless: boolean;
  resampling: string;
}) {
  try {
    const { fromFile } = await import("geotiff");
    const geotiff = await fromFile(input as string);
    const { tile } = (await createTile({
      geotiff: geotiff,
      bbox: bbox,
      method: resampling,
      tile_array_types_strategy: "auto",
      bbox_srs: 4326,
      tile_height: tilesize,
      tile_width: tilesize,
    })) as unknown as { tile: [Uint8Array, Uint8Array, Uint8Array] };
    const dataForSharp = new Uint8Array(tile[0]!.length * 3);
    for (let i = 0; i < tile[0]!.length; i++) {
      dataForSharp[i * 3] = tile[0]![i]!;
      dataForSharp[i * 3 + 1] = tile[1]![i]!;
      dataForSharp[i * 3 + 2] = tile[2]![i]!;

      //   if (r === nodata && g === nodata && b === nodata) {
      //     dataForSharp[i * 3 + 3] = 0;
      //   } else {
      //     dataForSharp[i * 3 + 3] = 255;
      //   }
    }

    fs.mkdirSync(join(output, `${zoom}`, `${x}`), { recursive: true });

    await sharp(dataForSharp, {
      raw: {
        width: tilesize,
        height: tilesize,
        channels: 3,
      },
    })
      .png()
      .webp({
        quality: webpQuality,
        lossless: webpLossless,
      })
      .toFile(join(output, `${zoom}`, `${x}`, `${y}.webp`));
  } catch (e) {
    console.error(e);
  }
}
