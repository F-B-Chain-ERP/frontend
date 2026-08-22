import type { ApplicationBuilderOptions } from '@angular/build';
import type { Target } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';

export default (builderOptions: ApplicationBuilderOptions, _target: Target): Plugin => {
  builderOptions.define ??= {};
  builderOptions.define.__VERSION__ = JSON.stringify(process.env.APP_VERSION ?? 'unknown');
  if (process.env.SERVER_API_URL !== undefined) {
    builderOptions.define.SERVER_API_URL = JSON.stringify(process.env.SERVER_API_URL);
  }

  return {
    name: 'define:vars',
    setup(_build) {},
  };
};
