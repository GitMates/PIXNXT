import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ScanFace, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import './RekognitionTest.css';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FaceOverlay({ faces, imageRef }) {
  const img = imageRef.current;
  if (!img || !faces?.length) return null;

  const w = img.clientWidth;
  const h = img.clientHeight;
  if (!w || !h) return null;

  return (
    <svg className="rek-test-overlay" width={w} height={h} aria-hidden>
      {faces.map((face, i) => {
        const box = face.boundingBox;
        if (!box) return null;
        const x = box.Left * w;
        const y = box.Top * h;
        const bw = box.Width * w;
        const bh = box.Height * h;
        return (
          <g key={face.faceId || i}>
            <rect x={x} y={y} width={bw} height={bh} className="rek-test-face-box" />
            <text x={x + 4} y={y + 14} className="rek-test-face-label">
              Face {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const RekognitionTest = () => {
  const imageRef = useRef(null);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [overlayTick, setOverlayTick] = useState(0);

  const onPickFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPEG or PNG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller for this test.');
      return;
    }

    setError('');
    setResult(null);
    setFileName(file.name);
    const dataUrl = await fileToDataUrl(file);
    setPreviewUrl(dataUrl);
    setImageBase64(dataUrl);
    setOverlayTick((t) => t + 1);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      onPickFile(file);
    },
    [onPickFile]
  );

  const runAnalyze = async () => {
    if (!imageBase64) {
      setError('Upload a photo first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/rekognition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          externalImageId: fileName || 'local-test',
          indexFaces: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setResult(data.result);
      setOverlayTick((t) => t + 1);
    } catch (err) {
      setError(err?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rek-test-page theme-mono cg-shell">
      <div className="rek-test-inner">
        <header className="rek-test-header">
          <div>
            <p className="rek-test-eyebrow">Dev tool</p>
            <h1 className="rek-test-title cg-page-title">Rekognition test</h1>
            <p className="rek-test-sub">
              Upload a photo to test AWS face indexing + label detection locally. Results are saved to the{' '}
              <code>pixnxt-dev-test</code> Rekognition face group (AWS calls this a “collection”).
            </p>
          </div>
          <Link to="/dashboard" className="rek-test-back">
            ← Dashboard
          </Link>
        </header>

        <div className="rek-test-grid">
          <section className="rek-test-card">
            <h2>1. Upload photo</h2>
            <div
              className="rek-test-drop neu-inset"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
              <Upload size={28} strokeWidth={1.5} />
              <p>Drop an image here or click to browse</p>
              <span>JPEG / PNG · max 5 MB</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="rek-test-file-input"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </div>

            {previewUrl && (
              <div className="rek-test-preview-wrap">
                <div className="rek-test-preview-stage">
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    className="rek-test-preview-img"
                    onLoad={() => setOverlayTick((t) => t + 1)}
                  />
                  <FaceOverlay faces={result?.faces} imageRef={imageRef} key={overlayTick} />
                </div>
                {fileName && <p className="rek-test-filename">{fileName}</p>}
              </div>
            )}

            <button
              type="button"
              className="rek-test-run neu-pill"
              onClick={runAnalyze}
              disabled={!imageBase64 || loading}
            >
              {loading ? 'Analyzing…' : 'Run Rekognition'}
            </button>

            {error && (
              <div className="rek-test-alert rek-test-alert--error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
          </section>

          <section className="rek-test-card">
            <h2>2. Results</h2>

            {!result && !loading && (
              <p className="rek-test-empty">Upload a photo and run analysis to see faces and labels.</p>
            )}

            {loading && <p className="rek-test-empty">Calling AWS Rekognition…</p>}

            {result && (
              <>
                <div className="rek-test-success">
                  <CheckCircle2 size={18} />
                  <span>
                    Connected · region <strong>{result.region}</strong>
                    {result.collectionId && (
                      <>
                        {' '}
                        · collection <strong>{result.collectionId}</strong>
                      </>
                    )}
                  </span>
                </div>

                <div className="rek-test-block">
                  <h3>
                    <ScanFace size={18} /> Faces ({result.faces.length})
                  </h3>
                  {result.faces.length === 0 ? (
                    <p className="rek-test-muted">No faces detected in this image.</p>
                  ) : (
                    <ul className="rek-test-face-list">
                      {result.faces.map((face, i) => (
                        <li key={face.faceId || i}>
                          <span className="rek-test-face-num">Person {i + 1}</span>
                          <span className="rek-test-muted">{face.confidence}% confidence</span>
                          <code className="rek-test-code">{face.faceId}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.unindexedFaceCount > 0 && (
                    <p className="rek-test-muted">
                      {result.unindexedFaceCount} additional face(s) could not be indexed (quality filter).
                    </p>
                  )}
                </div>

                <div className="rek-test-block">
                  <h3>
                    <Tag size={18} /> Labels ({result.labels.length})
                  </h3>
                  {result.labels.length === 0 ? (
                    <p className="rek-test-muted">No labels above 70% confidence.</p>
                  ) : (
                    <div className="rek-test-chips">
                      {result.labels.map((label) => (
                        <span key={label.name} className="rek-test-chip">
                          {label.name}
                          <em>{label.confidence}%</em>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default RekognitionTest;
