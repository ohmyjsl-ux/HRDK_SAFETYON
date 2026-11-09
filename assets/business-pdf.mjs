// 직원 비상대응 매뉴얼의 PDF.js 뷰어·확대축소·메모리 관리 코드를 재사용합니다.
export function createPdfViewer({onOpen=()=>{},onClose=()=>{}}={}) {
  const $=id=>document.getElementById(id);
  const PDFJS_VERSION='4.10.38';
  const PDFJS_MODULE_URL=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.min.mjs`;
  const PDFJS_WORKER_URL=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.min.mjs`;
  let currentForm=null,pdfJsLib=null,pdfDocument=null,pdfZoom=1,pdfPageItems=[],pdfObserver=null,pdfOpenToken=0,pdfResizeTimer=null,pdfScrollTimer=null;
  const PDF_MAX_CANVAS_PX=2_600_000,PDF_KEEP_RANGE=2;
  async function loadPdfJs() {
    if (pdfJsLib) return pdfJsLib;
    pdfJsLib = await import(PDFJS_MODULE_URL);
    pdfJsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfJsLib;
  }

  async function openPdf(form) {
    currentForm=form;
    $("pdfViewerTitle").textContent=form.title;
    $("pdfExternal").href=form.file;
    $("pdfDownload").href=form.file;
    $("pdfDownload").download=form.download;
    onOpen();

    const token = ++pdfOpenToken;
    $("pdfBackdrop").hidden = false;
    
    $("pdfPages").innerHTML = '<div class="pdf-loading">서식 PDF를 불러오는 중입니다.</div>';
    $("pdfPageInfo").textContent = "서식 PDF";
    pdfZoom = 1;
    updatePdfZoomLabel();

    try {
      const pdfjs = await loadPdfJs();
      if (token !== pdfOpenToken) return;
      const loadingTask = pdfjs.getDocument({ url: currentForm.file });
      pdfDocument = await loadingTask.promise;
      if (token !== pdfOpenToken) return;
      await buildPdfPages(token);
    } catch (error) {
      console.error("PDF.js 서식 PDF 표시 실패", error);
      if (token !== pdfOpenToken) return;
      $("pdfPages").innerHTML =
        `<div class="pdf-loading">서식 PDF 표시 중 오류가 발생했습니다.<br><a href="${currentForm.file}" target="_blank" rel="noopener noreferrer" style="margin-top:10px;color:#0b3a82;font-weight:800">새 창에서 서식 PDF 열기</a></div>`;
    }
  }

  // 페이지 자리(높이 포함)를 먼저 만들어 두고, 화면에 보이는 페이지만 그립니다.
  async function buildPdfPages(token) {
    const container = $("pdfPages");
    container.innerHTML = "";
    pdfPageItems = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      if (token !== pdfOpenToken) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const wrap = document.createElement("div");
      wrap.className = "pdf-page";
      wrap.setAttribute("aria-label", `${pageNumber}페이지`);
      wrap.dataset.label = `${pageNumber} / ${pdfDocument.numPages}`;

      const canvas = document.createElement("canvas");
      wrap.appendChild(canvas);
      container.appendChild(wrap);

      pdfPageItems.push({
        num: pageNumber,
        page,
        baseWidth: baseViewport.width,
        baseHeight: baseViewport.height,
        wrap,
        canvas,
        renderedKey: "",
        task: null
      });
    }

    layoutPdfPages();
    observePdfPages();
    updatePdfPageInfo();
  }

  function pdfAvailableWidth() {
    const container = $("pdfPages");
    const cs = getComputedStyle(container);
    const padX = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
    return Math.max(240, container.clientWidth - padX);
  }

  // 확대배율을 반영한 CSS 크기를 래퍼·캔버스에 '명시적으로' 지정합니다.
  function layoutPdfPages() {
    if (!pdfPageItems.length) return;
    const container = $("pdfPages");
    const available = pdfAvailableWidth();
    let widest = 0;

    pdfPageItems.forEach(item => {
      const cssWidth = Math.round(available * pdfZoom);
      const cssHeight = Math.round(cssWidth * (item.baseHeight / item.baseWidth));
      widest = Math.max(widest, cssWidth);

      if (item.cssWidth !== cssWidth) {
        item.cssWidth = cssWidth;
        item.cssHeight = cssHeight;
        item.wrap.style.width = `${cssWidth}px`;
        item.wrap.style.height = `${cssHeight}px`;
        item.renderedKey = "";
      }
    });

    // 확대해서 화면보다 넓어지면 왼쪽 끝이 잘리지 않도록 정렬을 바꿉니다.
    container.style.alignItems = widest > available ? "flex-start" : "center";
    renderVisiblePdfPages();
  }

  function observePdfPages() {
    if (pdfObserver) pdfObserver.disconnect();
    if (!("IntersectionObserver" in window)) {
      pdfPageItems.forEach(item => renderPdfPage(item));
      return;
    }
    pdfObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const item = pdfPageItems.find(x => x.wrap === entry.target);
        if (item && entry.isIntersecting) renderPdfPage(item);
      });
      releaseFarPdfPages();
    }, { root: $("pdfPages"), rootMargin: "300px 0px" });

    pdfPageItems.forEach(item => pdfObserver.observe(item.wrap));
  }

  function renderVisiblePdfPages() {
    const container = $("pdfPages");
    const box = container.getBoundingClientRect();
    pdfPageItems.forEach(item => {
      const rect = item.wrap.getBoundingClientRect();
      if (rect.bottom >= box.top - 300 && rect.top <= box.bottom + 300) renderPdfPage(item);
    });
  }

  async function renderPdfPage(item) {
    if (!pdfDocument || !item.cssWidth) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let scale = (item.cssWidth / item.baseWidth) * pixelRatio;

    // 캔버스가 지나치게 커지면 모바일에서 빈 화면이 되므로 상한을 둡니다.
    const rawPixels = (item.baseWidth * scale) * (item.baseHeight * scale);
    if (rawPixels > PDF_MAX_CANVAS_PX) scale *= Math.sqrt(PDF_MAX_CANVAS_PX / rawPixels);

    const key = `${item.cssWidth}@${scale.toFixed(3)}`;
    if (item.renderedKey === key) return;

    if (item.task) { try { item.task.cancel(); } catch (_) {} item.task = null; }

    const viewport = item.page.getViewport({ scale });
    const canvas = item.canvas;
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext("2d", { alpha: false });
    const task = item.page.render({ canvasContext: context, viewport });
    item.task = task;

    try {
      await task.promise;
      item.renderedKey = key;
      item.wrap.classList.add("is-rendered");
    } catch (error) {
      if (error?.name !== "RenderingCancelledException") {
        console.error(`PDF ${item.num}페이지 렌더링 실패`, error);
      }
    } finally {
      if (item.task === task) item.task = null;
    }
  }

  function releaseFarPdfPages() {
    const current = currentPdfPageNumber();
    pdfPageItems.forEach(item => {
      if (Math.abs(item.num - current) <= PDF_KEEP_RANGE) return;
      if (!item.renderedKey) return;
      if (item.task) { try { item.task.cancel(); } catch (_) {} item.task = null; }
      item.canvas.width = 1;
      item.canvas.height = 1;
      item.renderedKey = "";
      item.wrap.classList.remove("is-rendered");
    });
  }

  function currentPdfPageNumber() {
    if (!pdfPageItems.length) return 1;
    const container = $("pdfPages");
    const box = container.getBoundingClientRect();
    const center = box.top + box.height / 2;
    let best = pdfPageItems[0];
    let bestGap = Infinity;
    pdfPageItems.forEach(item => {
      const rect = item.wrap.getBoundingClientRect();
      const gap = Math.abs(rect.top + rect.height / 2 - center);
      if (gap < bestGap) { bestGap = gap; best = item; }
    });
    return best.num;
  }

  function updatePdfPageInfo() {
    if (!pdfDocument || !pdfPageItems.length) return;
    $("pdfPageInfo").textContent = `${currentPdfPageNumber()} / ${pdfDocument.numPages} 페이지`;
  }

  function onPdfScroll() {
    clearTimeout(pdfScrollTimer);
    pdfScrollTimer = setTimeout(() => {
      updatePdfPageInfo();
      renderVisiblePdfPages();
    }, 90);
  }

  function onPdfResize() {
    if ($("pdfBackdrop").hidden) return;
    clearTimeout(pdfResizeTimer);
    pdfResizeTimer = setTimeout(layoutPdfPages, 160);
  }

  function changePdfZoom(delta) {
    if (!pdfDocument || !pdfPageItems.length) return;
    const container = $("pdfPages");
    const before = container.scrollTop / Math.max(1, container.scrollHeight);
    const next = Math.max(0.7, Math.min(2, Math.round((pdfZoom + delta) * 100) / 100));
    if (next === pdfZoom) return;

    pdfZoom = next;
    updatePdfZoomLabel();
    layoutPdfPages();
    container.scrollTop = before * container.scrollHeight;
    updatePdfPageInfo();
  }

  function updatePdfZoomLabel() {
    $("pdfZoomLabel").textContent = `${Math.round(pdfZoom * 100)}%`;
  }

  function closePdf() {
    pdfOpenToken++;
    if (pdfObserver) { pdfObserver.disconnect(); pdfObserver = null; }
    pdfPageItems.forEach(item => {
      if (item.task) { try { item.task.cancel(); } catch (_) {} }
      item.canvas.width = 1;
      item.canvas.height = 1;
    });
    pdfPageItems = [];

    $("pdfBackdrop").hidden = true;
    $("pdfPages").innerHTML = '<div class="pdf-loading">서식 PDF를 불러오는 중입니다.</div>';
    $("pdfPageInfo").textContent = "서식 PDF";
    if (pdfDocument) { try { pdfDocument.destroy(); } catch (_) {} }
    pdfDocument = null;
    onClose();
  }


  $('pdfZoomOut').addEventListener('click',()=>changePdfZoom(-0.15));
  $('pdfZoomIn').addEventListener('click',()=>changePdfZoom(0.15));
  $('pdfPages').addEventListener('scroll',onPdfScroll,{passive:true});
  window.addEventListener('resize',onPdfResize);
  window.addEventListener('orientationchange',onPdfResize);
  return {open:openPdf,close:closePdf};
}
