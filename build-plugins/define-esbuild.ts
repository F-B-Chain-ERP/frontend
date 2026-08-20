import type { ApplicationBuilderOptions } from '@angular/build';
import type { Target } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';

export default (builderOptions: ApplicationBuilderOptions, _target: Target): Plugin => {
  builderOptions.define ??= {};
  builderOptions.define.__VERSION__ = JSON.stringify(process.env.APP_VERSION ?? 'unknown');

  return {
    name: 'define:vars',
    setup(_build) {},
  };
};
