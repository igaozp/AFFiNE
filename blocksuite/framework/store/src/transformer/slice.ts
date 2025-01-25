import type { DraftModel, Store } from '../model/index';

type SliceData = {
  content: DraftModel[];
  workspaceId: string;
  pageId: string;
};

export class Slice {
  get content() {
    return this.data.content;
  }

  get docId() {
    return this.data.pageId;
  }

  get workspaceId() {
    return this.data.workspaceId;
  }

  constructor(readonly data: SliceData) {}

  static fromModels(doc: Store, models: DraftModel[]) {
    return new Slice({
      content: models,
      workspaceId: doc.workspace.id,
      pageId: doc.id,
    });
  }
}
