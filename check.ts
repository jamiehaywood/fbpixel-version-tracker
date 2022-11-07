import fs from "node:fs/promises";
import crypto from "node:crypto";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const res = await fetch("https://connect.facebook.net/en_US/fbevents.js");
const body = await res.text();

const remoteHash = crypto.createHash("sha256").update(body).digest("hex");
const localHash = await fs.readFile("hash.txt", "utf-8");

if (localHash !== remoteHash) {
  await fs.writeFile("hash.txt", remoteHash, "utf-8");
  await fs.writeFile("fb-pixel-source.js", body, "utf-8");

  const hashSha = await getSHA("hash.txt");
  await octokit.repos.createOrUpdateFileContents({
    owner: "JamieHaywood",
    repo: "fbpixel-version-tracker",
    path: "hash.txt",
    message: `Update hash.txt`,
    content: Buffer.from(remoteHash).toString("base64"),
    sha: hashSha,
  });
  console.log("committed new hash.txt");
  const fbPixelSourceSha = await getSHA("fb-pixel-source.js");
  await octokit.repos.createOrUpdateFileContents({
      owner: "JamieHaywood",
      repo: "fbpixel-version-tracker",
    path: "fb-pixel-source.js",
    message: `Update fb-pixel-source.js`,
    content: Buffer.from(remoteHash).toString("base64"),
    sha: fbPixelSourceSha,
});
console.log("committed new fb-pixel-source.js");
}

async function getSHA(path: string) {
  const result = await octokit.repos.getContent({
    owner: "JamieHaywood",
    repo: "fbpixel-version-tracker",
    path,
  });

  // @ts-expect-error
  const sha = result?.data?.sha;

  return sha;
}
