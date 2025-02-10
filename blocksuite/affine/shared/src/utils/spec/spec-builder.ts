import type { ExtensionType } from '@blocksuite/store';

export class SpecBuilder {
  private _value: ExtensionType[];

  get value() {
    return this._value;
  }

  constructor(spec: ExtensionType[]) {
    this._value = [...spec];
  }

  extend(extensions: ExtensionType[]) {
    this._value = [...this._value, ...extensions];
  }

  omit(target: ExtensionType) {
    this._value = this._value.filter(extension => extension !== target);
  }

  replace(target: ExtensionType[], newExtension: ExtensionType[]) {
    this._value = [
      ...this._value.filter(extension => !target.includes(extension)),
      ...newExtension,
    ];
  }
}
