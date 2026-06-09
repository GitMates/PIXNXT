import re

with open("src/printstore/components/ProductDetailPage.jsx", "r") as f:
    content = f.read()

# 1. Update imports
content = re.sub(
    r"import \{ MOCK_SIZES, MOCK_PAPERS, MOCK_FRAMES \} from '\.\./data/mockStoreData';",
    "import { MOCK_SIZES, MOCK_PAPERS, MOCK_FRAMES, MATTED_FRAME_SIZES } from '../data/mockStoreData';",
    content,
    count=1
)

# 2. Update state
state_search = r"const \[selectedSize, setSelectedSize\] = useState\(MOCK_SIZES\[0\]\);\n  const \[selectedPaper, setSelectedPaper\] = useState\(MOCK_PAPERS\[0\]\);\n  const \[isSizeDropdownOpen, setIsSizeDropdownOpen\] = useState\(false\);\n  const sizeDropdownRef = useRef\(null\);\n  const \[isPaperDropdownOpen, setIsPaperDropdownOpen\] = useState\(false\);\n  const paperDropdownRef = useRef\(null\);"
state_replace = """const [selectedSize, setSelectedSize] = useState(
    product.id === 'matted_frame' ? MATTED_FRAME_SIZES[0] : MOCK_SIZES[0]
  );
  const [selectedPaper, setSelectedPaper] = useState(MOCK_PAPERS[0]);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const sizeDropdownRef = useRef(null);
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState(false);
  const paperDropdownRef = useRef(null);
  const [selectedPrintSize, setSelectedPrintSize] = useState(
    product.id === 'matted_frame' ? MATTED_FRAME_SIZES[0].printSize : null
  );
  const [isPrintSizeDropdownOpen, setIsPrintSizeDropdownOpen] = useState(false);
  const printSizeDropdownRef = useRef(null);"""
content = re.sub(state_search, state_replace, content, count=1)

# 3. Update useEffect for click outside and auto-sync
effect_search = r"""  useEffect\(\(\) => \{
    function handleClickOutside\(event\) \{
      if \(sizeDropdownRef\.current && !sizeDropdownRef\.current\.contains\(event\.target\)\) \{
        setIsSizeDropdownOpen\(false\);
      \}
      if \(paperDropdownRef\.current && !paperDropdownRef\.current\.contains\(event\.target\)\) \{
        setIsPaperDropdownOpen\(false\);
      \}
    \}
    document\.addEventListener\("mousedown", handleClickOutside\);
    return \(\) => \{
      document\.removeEventListener\("mousedown", handleClickOutside\);
    \};
  \}, \[\]\);"""
effect_replace = """  useEffect(() => {
    function handleClickOutside(event) {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {
        setIsSizeDropdownOpen(false);
      }
      if (paperDropdownRef.current && !paperDropdownRef.current.contains(event.target)) {
        setIsPaperDropdownOpen(false);
      }
      if (printSizeDropdownRef.current && !printSizeDropdownRef.current.contains(event.target)) {
        setIsPrintSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-sync print size when frame size changes for matted frames
  useEffect(() => {
    if (product.id === 'matted_frame' && selectedSize?.printSize) {
      setSelectedPrintSize(selectedSize.printSize);
    }
  }, [selectedSize, product.id]);"""
content = re.sub(effect_search, effect_replace, content, count=1)

# 4. Pass selectedSize and selectedPrintSize to MattedFramePreview
preview_search = r"""                              \{product\.id === 'matted_frame' && \(
                                <MattedFramePreview 
                                  product=\{product\} 
                                  selectedFrame=\{selectedFrame\} 
                                  currentAspect=\{currentAspect\} 
                                />
                              \)\}"""
preview_replace = """                              {product.id === 'matted_frame' && (
                                <MattedFramePreview 
                                  product={product} 
                                  selectedFrame={selectedFrame} 
                                  currentAspect={currentAspect}
                                  selectedSize={selectedSize}
                                  selectedPrintSize={selectedPrintSize}
                                />
                              )}"""
content = re.sub(preview_search, preview_replace, content, count=1)

# 5. Update size dropdown
size_map_search = r"""                                \{MOCK_SIZES\.map\(\(size\) => \(
                                  <div 
                                    key=\{size\.id\} """
size_map_replace = """                                {(product.id === 'matted_frame' ? MATTED_FRAME_SIZES : MOCK_SIZES).map((size) => (
                                  <div 
                                    key={size.id} """
content = re.sub(size_map_search, size_map_replace, content, count=1)

# 6. Update print size dropdown
print_size_search = r"""                      \{product\.id !== 'deckled_prints' && \(
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2" ref=\{paperDropdownRef\}>
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>\{\['matted_frame', 'gallery_board'\]\.includes\(product\.id\) \? 'Print Size' : 'Paper Type'\}</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          <div className={`custom-dropdown-wrapper full-width \$\{isPaperDropdownOpen \? 'open' : ''\}`}>
                            \{\['matted_frame', 'gallery_board'\]\.includes\(product\.id\) \? \(
                              <select className="pdp-select-input" defaultValue=\{product\.id === 'gallery_board' \? "10x15cm" : "8x8cm"\}>
                                \{product\.id === 'matted_frame' && <option value="8x8cm">8x8cm</option>\}
                                <option value="10x10cm">10x10cm</option>
                                \{product\.id === 'gallery_board' && <option value="10x15cm">10x15cm</option>\}
                              </select>
                            \) : \(
                              <>
                                <div 
                                  className="custom-dropdown-trigger"
                                  onClick=\{\(\) => setIsPaperDropdownOpen\(prev => !prev\)\}
                                >
                                  <span>\{selectedPaper\.label\}</span>
                                  \{isPaperDropdownOpen \? <ChevronUp size=\{16\} strokeWidth=\{2\} /> : <ChevronDown size=\{16\} strokeWidth=\{2\} />\}
                                </div>
                                \{isPaperDropdownOpen && \(
                                  <div className="custom-dropdown-menu">
                                    \{\(product\.id === 'dibond' \? MOCK_PAPERS\.filter\(p => p\.id !== 'paper_glossy'\) : MOCK_PAPERS\)\.map\(\(paper\) => \(
                                      <div 
                                        key=\{paper\.id\} 
                                        className={`custom-dropdown-item \$\{selectedPaper\.id === paper\.id \? 'active' : ''\}`}
                                        onClick=\{\(\) => \{
                                          setSelectedPaper\(paper\);
                                          setIsPaperDropdownOpen\(false\);
                                        \}\}
                                      >
                                        \{paper\.label\}
                                      </div>
                                    \)\)\}
                                  </div>
                                \)\}
                              </>
                            \)\}
                          </div>
                        </div>
                      </div>
                      \)\}"""

print_size_replace = """                      {product.id !== 'deckled_prints' && (
                      <div className="pt-dropdown-input-field IF-2-2" data-component="IF-2-2" ref={product.id === 'matted_frame' ? printSizeDropdownRef : paperDropdownRef}>
                        <div className="FE-2-2">
                          <div className="FE-2-2__header">
                            <span>{['matted_frame', 'gallery_board'].includes(product.id) ? 'Print Size' : 'Paper Type'}</span>
                          </div>
                        </div>
                        <div className="pt-dropdown-input">
                          {product.id === 'matted_frame' ? (
                            /* Custom white dropdown for Matted Frame print size */
                            <div className={`custom-dropdown-wrapper full-width ${isPrintSizeDropdownOpen ? 'open' : ''}`}>
                              <div 
                                className="custom-dropdown-trigger"
                                onClick={() => setIsPrintSizeDropdownOpen(prev => !prev)}
                              >
                                <span>{selectedPrintSize || '8x8cm'}</span>
                                {isPrintSizeDropdownOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                              </div>
                              {isPrintSizeDropdownOpen && (
                                <div className="custom-dropdown-menu">
                                  {/* Derive unique print sizes from MATTED_FRAME_SIZES */}
                                  {[...new Set(MATTED_FRAME_SIZES.map(s => s.printSize))].map((ps) => (
                                    <div 
                                      key={ps} 
                                      className={`custom-dropdown-item ${selectedPrintSize === ps ? 'active' : ''}`}
                                      onClick={() => {
                                        setSelectedPrintSize(ps);
                                        setIsPrintSizeDropdownOpen(false);
                                      }}
                                    >
                                      {ps}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : product.id === 'gallery_board' ? (
                            <div className="custom-dropdown-wrapper full-width">
                              <select className="pdp-select-input" defaultValue="10x15cm">
                                <option value="10x10cm">10x10cm</option>
                                <option value="10x15cm">10x15cm</option>
                              </select>
                            </div>
                          ) : (
                            <div className={`custom-dropdown-wrapper full-width ${isPaperDropdownOpen ? 'open' : ''}`}>
                              <div 
                                className="custom-dropdown-trigger"
                                onClick={() => setIsPaperDropdownOpen(prev => !prev)}
                              >
                                <span>{selectedPaper.label}</span>
                                {isPaperDropdownOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                              </div>
                              {isPaperDropdownOpen && (
                                <div className="custom-dropdown-menu">
                                  {(product.id === 'dibond' ? MOCK_PAPERS.filter(p => p.id !== 'paper_glossy') : MOCK_PAPERS).map((paper) => (
                                    <div 
                                      key={paper.id} 
                                      className={`custom-dropdown-item ${selectedPaper.id === paper.id ? 'active' : ''}`}
                                      onClick={() => {
                                        setSelectedPaper(paper);
                                        setIsPaperDropdownOpen(false);
                                      }}
                                    >
                                      {paper.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      )}"""
content = re.sub(print_size_search, print_size_replace, content, count=1)

with open("src/printstore/components/ProductDetailPage.jsx", "w") as f:
    f.write(content)

print("Done")
