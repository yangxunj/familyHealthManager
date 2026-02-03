declare module 'pdf-poppler' {
  interface ConvertOptions {
    format?: 'png' | 'jpeg' | 'tiff' | 'pdf';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
    resolution?: number;
  }

  export function convert(file: string, opts: ConvertOptions): Promise<void>;
  export function info(file: string): Promise<{
    pages: number;
    title?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  }>;
}
