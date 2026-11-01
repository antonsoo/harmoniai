export interface EditionFile {
  path: string;
  bytes: number;
  sha256: string;
}
export interface EditionConfig {
  edition: string;
  base: string;
  prefix: string;
  files: EditionFile[];
}
export function installEdition(config: EditionConfig): void;
