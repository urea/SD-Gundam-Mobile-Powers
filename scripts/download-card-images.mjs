import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceManifestPath = path.join(root, 'public', 'assets', 'cards', 'card-image-sources.json');
const outputDir = path.join(root, 'public', 'assets', 'cards');
const auditDir = path.join(root, 'local-docs');
const args = process.argv.slice(2);
const forceDownload = args.includes('--force');
const delayArg = args.find((arg) => arg.startsWith('--delay-ms='));
const delayMs = delayArg ? Number(delayArg.split('=')[1]) : 750;

const readSourceManifest = async () => {
  const raw = await fs.readFile(sourceManifestPath, 'utf8');
  return JSON.parse(raw);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getExistingFileSize = async (filePath) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.size > 0 ? stat.size : null;
  } catch {
    return null;
  }
};

const downloadCardImage = async (card) => {
  const outputPath = path.join(outputDir, card.localFile);
  const existingSize = await getExistingFileSize(outputPath);
  if (!forceDownload && existingSize !== null) {
    return { bytes: existingSize, outputPath, status: 'cached' };
  }

  if (!card.remoteUrl) {
    return { bytes: 0, outputPath, status: 'missing-source' };
  }

  const response = await fetch(card.remoteUrl, {
    headers: {
      'user-agent': 'SD-Gundam-Mobile-Powers local image audit; cached downloads',
    },
  });
  if (!response.ok) {
    throw new Error(`${card.cardNumber}: ${response.status} ${response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await fs.writeFile(outputPath, bytes);
  return { bytes: bytes.length, outputPath, status: 'downloaded' };
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const writeAuditFiles = async (cards) => {
  await fs.mkdir(auditDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const htmlRows = cards.map((card) => `
<tr>
  <td>${escapeHtml(card.uniqueKey)}</td>
  <td>${escapeHtml(card.cardNumber)}</td>
  <td>${escapeHtml(card.cardName)}<br><small>${escapeHtml(card.cardNameOmm)}</small></td>
  <td><img src="../public${escapeHtml(card.localPath)}" loading="lazy"></td>
  <td>${card.type === 'M'
    ? `P:${escapeHtml(card.points || '-')}<br>適性:${escapeHtml(card.terrainTypeMCards || '-')}<br>地形:${escapeHtml(card.battlefieldTerrain || '-')}`
    : `効果地形:${escapeHtml(card.battlefieldTerrain || '-')}`}</td>
  <td>${escapeHtml(card.flavorAbility)}</td>
  <td>${escapeHtml(card.effect)}</td>
  <td>${escapeHtml(card.tags)}</td>
  <td><a href="${escapeHtml(card.remoteUrl)}">source</a><br>${escapeHtml(card.localPath)}</td>
</tr>`).join('\n');

  const auditHtml = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Mobile Powers Card Image Audit</title>
<style>
body{font-family:system-ui,'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;margin:16px;background:#f8fafc;color:#0f172a;}
table{border-collapse:collapse;width:100%;font-size:12px;background:white;}
th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top;}
th{position:sticky;top:0;background:#e2e8f0;z-index:1;}
img{width:120px;max-height:170px;object-fit:contain;background:#e2e8f0;}
small{color:#475569;}
a{color:#0369a1;}
</style>
</head>
<body>
<h1>Mobile Powers Card Image Audit</h1>
<p>Generated: ${generatedAt} / Total: ${cards.length}</p>
<table>
<thead><tr><th>Key</th><th>No</th><th>Name</th><th>Image</th><th>Stats</th><th>Flavor</th><th>Effect</th><th>Tags</th><th>Source</th></tr></thead>
<tbody>${htmlRows}</tbody>
</table>
</body>
</html>`;

  await fs.writeFile(path.join(auditDir, 'card-image-audit.html'), auditHtml, 'utf8');

  const summaryRows = cards
    .filter((card) => card.cardName.includes('ザク') || card.cardNameOmm.includes('ザク') || card.cardName.includes('アッガイ') || card.cardNameOmm.includes('アッガイ') || card.type === 'C')
    .map((card) => [card.uniqueKey, card.cardNumber, card.type, card.cardName, card.cardNameOmm, card.localPath, card.remoteUrl, card.flavorAbility, card.effect].join('\t'));
  await fs.writeFile(
    path.join(auditDir, 'card-image-audit-summary.tsv'),
    ['Unique_Key\tCard_Number\tType\tName\tOmm\tLocalPath\tRemoteURL\tFlavor\tEffect', ...summaryRows].join('\n'),
    'utf8',
  );
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const manifest = await readSourceManifest();
  const cards = [];

  for (const [index, card] of manifest.cards.entries()) {
    const result = await downloadCardImage(card);
    cards.push({ ...card, bytes: result.bytes, status: result.status });
    console.log(`${result.status} ${card.cardNumber} -> ${path.relative(root, result.outputPath)}`);
    if (result.status === 'downloaded' && delayMs > 0 && index < manifest.cards.length - 1) {
      await sleep(delayMs);
    }
  }

  await fs.writeFile(
    sourceManifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), total: cards.length, cards }, null, 2),
    'utf8',
  );
  await writeAuditFiles(cards);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
