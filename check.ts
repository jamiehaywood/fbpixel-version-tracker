import fs from "node:fs/promises";
import crypto from "node:crypto";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.REPO_ACCESS_TOKEN,
});

const res = await fetch("https://connect.facebook.net/en_US/fbevents.js");
const fbPixelSource = await res.text();

const remoteSourceHash = crypto.createHash("sha256").update(fbPixelSource).digest("hex");
const localSourceHash = await fs.readFile("hash.txt", "utf-8");
const owner = process.env.GITHUB_REPOSITORY_OWNER!;
const repo = process.env.GITHUB_REPOSITORY!.replace(`${owner}/`, "");

if (localSourceHash !== remoteSourceHash) {
  await fs.writeFile("hash.txt", remoteSourceHash, "utf-8");
  await fs.writeFile("fb-pixel-source.js", fbPixelSource, "utf-8");

  const hashSha = await getSHA("hash.txt");
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: "hash.txt",
    message: 'Update `hash.txt`',
    content: Buffer.from(remoteSourceHash).toString("base64"),
    sha: hashSha,
  });

  console.log("committed new hash.txt");

  const fbPixelSourceSha = await getSHA("fb-pixel-source.js");
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: "fb-pixel-source.js",
    message: 'Update `fb-pixel-source.js`',
    content: Buffer.from(fbPixelSource).toString("base64"),
    sha: fbPixelSourceSha,
  });

  console.log("committed new fb-pixel-source.js");
}

async function getSHA(path: string) {
  const result = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  // @ts-expect-error
  const sha = result?.data?.sha;

  return sha;
}
