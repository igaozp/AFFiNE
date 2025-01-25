import { assertExists } from '@blocksuite/global/utils';
import type { ExtensionType } from '@blocksuite/store';

import { SpecBuilder } from './spec-builder.js';

export class SpecProvider {
  static instance: SpecProvider;

  private readonly specMap = new Map<string, ExtensionType[]>();

  private constructor() {}

  static getInstance() {
    if (!SpecProvider.instance) {
      SpecProvider.instance = new SpecProvider();
    }
    return SpecProvider.instance;
  }

  addSpec(id: string, spec: ExtensionType[]) {
    if (!this.specMap.has(id)) {
      this.specMap.set(id, spec);
    }
  }

  clearSpec(id: string) {
    this.specMap.delete(id);
  }

  extendSpec(id: string, newSpec: ExtensionType[]) {
    const existingSpec = this.specMap.get(id);
    if (!existingSpec) {
      console.error(`Spec not found for ${id}`);
      return;
    }
    this.specMap.set(id, [...existingSpec, ...newSpec]);
  }

  getSpec(id: string) {
    const spec = this.specMap.get(id);
    assertExists(spec, `Spec not found for ${id}`);
    return new SpecBuilder(spec);
  }

  hasSpec(id: string) {
    return this.specMap.has(id);
  }

  cloneSpec(id: string, targetId: string) {
    const existingSpec = this.specMap.get(id);
    if (!existingSpec) {
      console.error(`Spec not found for ${id}`);
      return;
    }
    this.specMap.set(targetId, [...existingSpec]);
  }

  omitSpec(id: string, targetSpec: ExtensionType) {
    const existingSpec = this.specMap.get(id);
    if (!existingSpec) {
      console.error(`Spec not found for ${id}`);
      return;
    }

    this.specMap.set(
      id,
      existingSpec.filter(spec => spec !== targetSpec)
    );
  }

  replaceSpec(id: string, targetSpec: ExtensionType, newSpec: ExtensionType) {
    const existingSpec = this.specMap.get(id);
    if (!existingSpec) {
      console.error(`Spec not found for ${id}`);
      return;
    }

    this.specMap.set(
      id,
      existingSpec.map(spec => (spec === targetSpec ? newSpec : spec))
    );
  }
}
