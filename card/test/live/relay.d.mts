export const PROFILE_ARGS: string[];
export function startRelay(
  source: string,
  port?: number,
): Promise<{
  url: string;
  stats(): { open: number; total: number };
  close(): Promise<void>;
}>;
