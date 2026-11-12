// Step 6 — Remotion Lambda (Larven's function, eu-north-1): deploy site + render the conformed film.
// Usage: node pipeline/06-lambda.mjs deploy | render
import { ROOT, GEN, path, ensure, download, writeFileSync, readFileSync, existsSync, COMPOSITION, OUT } from "./lib.mjs";
import { deploySite, getOrCreateBucket, renderMediaOnLambda, getRenderProgress } from "@remotion/lambda";

const region = process.env.REMOTION_LAMBDA_REGION;
const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
const stateFile = path.join(ROOT, "assets/gen/lambda.json"); // one shared Remotion site for all films
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};

async function deploy() {
  const { bucketName } = await getOrCreateBucket({ region });
  const { serveUrl } = await deploySite({
    bucketName, region, siteName: "gianna-ritorno",
    entryPoint: path.join(ROOT, "src/index.ts"),
    options: { publicDir: path.join(ROOT, "public"), onUploadProgress: ({ totalFiles, filesUploaded }) => process.stdout.write(`\r  upload ${filesUploaded}/${totalFiles}`) },
  });
  Object.assign(state, { bucketName, serveUrl });
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(`\n✓ site ${serveUrl}`);
}

async function render(kind = "video") {
  // "audio": lossless WAV of the mix, so the voice is AAC-encoded exactly once (at mastering).
  const codecOpts = kind === "audio"
    ? { codec: "wav" }
    : { codec: "h264", crf: 16, colorSpace: "bt709", pixelFormat: "yuv420p", audioCodec: "aac", audioBitrate: "320k", imageFormat: "jpeg", jpegQuality: 92 };
  const { renderId, bucketName } = await renderMediaOnLambda({
    region, functionName, serveUrl: state.serveUrl, composition: COMPOSITION,
    ...codecOpts,
    framesPerLambda: 120, privacy: "private", downloadBehavior: { type: "download", fileName: "ritorno.mp4" },
    timeoutInMilliseconds: 240000, maxRetries: 2,
  });
  console.log(`  render ${renderId}`);
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const p = await getRenderProgress({ renderId, bucketName, functionName, region });
    if (p.fatalErrorEncountered) throw new Error(JSON.stringify(p.errors?.slice(0, 2), null, 2));
    process.stdout.write(`\r  ${(p.overallProgress * 100).toFixed(0)}%`);
    if (p.done) {
      ensure(path.join(ROOT, "out")); const out = OUT(kind === "audio" ? "mix.wav" : "nocaptions.mp4");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID, secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY } });
      const key = p.outKey ?? new URL(p.outputFile).pathname.slice(1);
      await download(await getSignedUrl(s3, new GetObjectCommand({ Bucket: p.outBucket ?? bucketName, Key: key }), { expiresIn: 3600 }), out);
      console.log(`\n✓ ${out}  (lambda cost ~$${p.costs?.accruedSoFar?.toFixed?.(3) ?? "?"})`);
      return;
    }
  }
}

const cmd = process.argv[2];
if (cmd === "deploy") await deploy();
else if (cmd === "render") await render();
else if (cmd === "render-audio") await render("audio");
else console.log("usage: deploy | render");
