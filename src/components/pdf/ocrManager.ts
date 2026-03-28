/**
 * OCR Manager — Shared worker singleton + localStorage cache
 * Ensures only one Tesseract worker runs at a time and results are cached.
 */

interface OCRWord {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
}

export interface OCRResult {
    words: OCRWord[];
    text: string;
    width: number;
    height: number;
    timestamp: number;
}

const CACHE_PREFIX = "ocr_cache_";
const CACHE_VERSION = 2;

// ─── Cache ──────────────────────────────────────────────────────────

function cacheKey(bookId: string, page: number): string {
    return `${CACHE_PREFIX}v${CACHE_VERSION}_${bookId}_p${page}`;
}

export function getCachedOCR(bookId: string, page: number): OCRResult | null {
    try {
        const raw = localStorage.getItem(cacheKey(bookId, page));
        if (!raw) return null;
        return JSON.parse(raw) as OCRResult;
    } catch {
        return null;
    }
}

function setCachedOCR(bookId: string, page: number, result: OCRResult): void {
    try {
        localStorage.setItem(cacheKey(bookId, page), JSON.stringify(result));
    } catch {
        // localStorage full — evict oldest OCR caches
        evictOldCaches();
        try {
            localStorage.setItem(cacheKey(bookId, page), JSON.stringify(result));
        } catch { /* give up */ }
    }
}

function evictOldCaches(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    // Remove oldest 50% of OCR caches
    const half = Math.ceil(keys.length / 2);
    keys.slice(0, half).forEach(k => localStorage.removeItem(k));
}

// ─── Shared Worker ──────────────────────────────────────────────────

let workerInstance: any = null;
let workerBusy = false;
const queue: Array<{
    canvas: HTMLCanvasElement;
    bookId: string;
    page: number;
    resolve: (result: OCRResult | null) => void;
    reject: (err: Error) => void;
}> = [];

async function getWorker(): Promise<any> {
    if (workerInstance) return workerInstance;
    const { createWorker } = await import("tesseract.js");
    workerInstance = await createWorker("ind+eng");
    return workerInstance;
}

async function processQueue(): Promise<void> {
    if (workerBusy || queue.length === 0) return;
    workerBusy = true;

    const job = queue.shift()!;
    try {
        // Check cache again (might have been cached by another job)
        const cached = getCachedOCR(job.bookId, job.page);
        if (cached) {
            job.resolve(cached);
            workerBusy = false;
            processQueue();
            return;
        }

        const worker = await getWorker();

        // Enhance canvas for better OCR (Contrast + Grayscale)
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = job.canvas.width;
        tempCanvas.height = job.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
            tempCtx.filter = "grayscale(100%) contrast(150%)";
            tempCtx.drawImage(job.canvas, 0, 0);
        }

        const { data } = await worker.recognize(tempCtx ? tempCanvas : job.canvas);

        const result: OCRResult = {
            words: (data.words || []).map((w: any) => ({
                text: w.text,
                bbox: w.bbox,
                confidence: w.confidence,
            })),
            text: data.text || "",
            width: job.canvas.width,
            height: job.canvas.height,
            timestamp: Date.now(),
        };

        setCachedOCR(job.bookId, job.page, result);
        job.resolve(result);
    } catch (err) {
        job.reject(err as Error);
    } finally {
        workerBusy = false;
        processQueue();
    }
}

/**
 * Run OCR on a canvas. Uses cache if available, otherwise queues for processing.
 * Only one OCR job runs at a time to avoid memory issues.
 */
export function runOCR(
    canvas: HTMLCanvasElement,
    bookId: string,
    page: number
): Promise<OCRResult | null> {
    // Check cache first
    const cached = getCachedOCR(bookId, page);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
        // Remove any existing job for same page (deduplication)
        const existing = queue.findIndex(j => j.bookId === bookId && j.page === page);
        if (existing >= 0) queue.splice(existing, 1);

        queue.push({ canvas, bookId, page, resolve, reject });
        processQueue();
    });
}

/**
 * Terminate the shared worker (call on component unmount)
 */
export async function terminateOCR(): Promise<void> {
    if (workerInstance) {
        try { await workerInstance.terminate(); } catch { }
        workerInstance = null;
    }
    queue.length = 0;
    workerBusy = false;
}

/**
 * Get queue status
 */
export function getOCRQueueSize(): number {
    return queue.length + (workerBusy ? 1 : 0);
}
