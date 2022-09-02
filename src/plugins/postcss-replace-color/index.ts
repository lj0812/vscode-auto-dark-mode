/* eslint-disable @typescript-eslint/naming-convention */
import { Declaration, Root, Rule, Helpers, Result, comment } from "postcss";


interface Options {
  converter: (decl: Declaration) => any,
  filterDecl: (decl: Declaration) => any,
}

const Plugin = (options: Options) => {
  return {
    postcssPlugin: 'postcss-replace-color',
    Once(root: Root) {
      root.walkDecls(decl => {
        if (options.filterDecl(decl)) {
          const result = options.converter(decl);
          Object.assign(decl, result);
        }
      });
    },

    // Will be called on Root node once, when all children will be processed.
    // Type: RootProcessor.
    OnceExit(root: Root, { AtRule }: Helpers) {
    },
  };
};

Plugin.postcss = true;

export default Plugin;
