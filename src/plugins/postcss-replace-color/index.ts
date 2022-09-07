/* eslint-disable @typescript-eslint/naming-convention */
import { Declaration, Root, Rule, Helpers, Result, comment } from "postcss";


interface Options {
  converter: Function,
  filterDecl: Function,
}

const Plugin = (options: Options) => {
  return {
    postcssPlugin: 'postcss-replace-color',
    Once(root: Root) {
      root.walkAtRules((rule) => {
        if (options.filterDecl(rule)) {
          const result = options.converter(rule);
          if (result) {
            rule.params = result.value;
          }
        }
      });

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
