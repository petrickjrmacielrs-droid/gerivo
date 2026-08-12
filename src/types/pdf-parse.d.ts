declare module "pdf-parse" {
  export class PDFParse {
    constructor(options: { data?: Uint8Array | Buffer; url?: string | URL; CanvasFactory?: unknown });
    getText(options?: Record<string, unknown>): Promise<{ text: string; pages?: unknown[]; total?: number }>;
    getTable(options?: Record<string, unknown>): Promise<{ pages?: Array<{ tables?: unknown[] }>; total?: number }>;
    destroy(): Promise<void>;
  }
}
declare module "pdf-parse/worker" {
  export const CanvasFactory: unknown;
}
