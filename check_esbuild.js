import esbuild from 'esbuild';
import fs from 'fs';

try {
  const code = fs.readFileSync('src/printstore/lab/LabArtworkReviewDetails.jsx', 'utf-8');
  const result = esbuild.transformSync(code, {
    loader: 'jsx',
    format: 'esm',
  });
  console.log("SUCCESS");
} catch (e) {
  console.log("ESBUILD ERROR DETECTED:");
  console.log(JSON.stringify(e.errors, null, 2));
}
