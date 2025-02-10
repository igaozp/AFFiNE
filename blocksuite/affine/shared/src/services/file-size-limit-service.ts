import { StoreExtension } from '@blocksuite/store';

// bytes.parse('2GB')
const maxFileSize = 2147483648;

export class FileSizeLimitService extends StoreExtension {
  static override key = 'file-size-limit';

  maxFileSize = maxFileSize;
}
