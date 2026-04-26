import JSZip from "jszip";

export type KdpPackFile = {
  path: string;
  content: string;
};

export async function buildKdpPackZip(files: KdpPackFile[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.content);
  }
  const nodeBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return Buffer.from(nodeBuffer);
}
