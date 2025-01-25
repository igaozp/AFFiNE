import type * as NoteType from '@blocksuite/affine-block-note/effects';
import type * as CommandsType from '@blocksuite/affine-shared/commands';
import type * as RemarkMathType from 'remark-math';

export * from './adapters';
export * from './latex-block';
export * from './latex-spec';

// Global types
declare type _GLOBAl =
  | typeof NoteType
  | typeof CommandsType
  | typeof RemarkMathType;
