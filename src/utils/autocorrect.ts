import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.join(__dirname, 'autocorrect.worker.js');

let worker: Worker | null = null;
const pendingRequests = new Map<string, { 
    resolve: (val: string) => void, 
    reject: (err: any) => void,
    timeout: NodeJS.Timeout
}>();

function getWorker(): Worker {
    if (worker) return worker;
    
    // console.log('[Main] Initializing Autocorrect Worker...');
    worker = new Worker(workerPath);
    
    worker.on('online', () => {
        // console.log('[Main] Autocorrect Worker is online.');
    });

    worker.on('message', (msg: any) => {
        const { id, result, error } = msg;
        const pending = pendingRequests.get(id);
        if (pending) {
            clearTimeout(pending.timeout);
            if (error) pending.reject(error);
            else pending.resolve(result || '');
            pendingRequests.delete(id);
        }
    });

    worker.on('error', (err) => {
        console.error('[Main] Autocorrect Worker Error:', err);
    });

    worker.on('exit', (code) => {
        console.error(`[Main] Autocorrect Worker stopped with exit code ${code}`);
        worker = null;
        for (const [id, pending] of pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Worker exited unexpectedly'));
        }
        pendingRequests.clear();
    });

    return worker;
}

export async function autocorrectText(text: string): Promise<string> {
    try {
        const w = getWorker();
        const id = Math.random().toString(36).substring(7);
        
        return await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                    resolve(text);
                }
            }, 5000);

            pendingRequests.set(id, { resolve, reject, timeout });
            w.postMessage({ id, text });
        });
    } catch (e) {
        console.error('[Main] Autocorrect failed to use worker:', e);
        return text;
    }
}
