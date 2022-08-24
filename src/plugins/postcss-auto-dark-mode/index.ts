/* eslint-disable @typescript-eslint/naming-convention */
import { Declaration, Root, Rule, Helpers } from "postcss";
import { includeColor } from '../../utils/index';

const colorProps = [
  'color',
  'background',
  'border'
];

interface Options {
  converter: (decl: Declaration) => any,
  filterDecl: (decl: Declaration) => any,
}

const Plugin = (options: Options) => {
  return {
    postcssPlugin: 'postcss-auto-dark-mode',
    // Will be called on allAtRule nodes.
    // Will be called again on node or children changes.
    // Type: AtRuleProcessor | { [name: string]: AtRuleProcessor }.
    // AtRule() {

    // },


    // Will be called on all AtRule nodes, when all children will be processed.
    // Will be called again on node or children changes.
    // Type: AtRuleProcessor | { [name: string]: AtRuleProcessor}.
    // AtRuleExit() {

    // },

    // Will be called on all Comment nodes.
    // Will be called again on node or children changes.
    // Type: CommentProcessor.
    // Comment() {

    // },

    // Will be called on all Comment nodes after listeners for Comment event.
    // Will be called again on node or children changes.
    // Type: CommentProcessor.
    // CommentExit() {

    // },

    // Will be called on all Declaration nodes after listeners for Declaration event.
    // Will be called again on node or children changes.
    // Type: DeclarationProcessor | { [prop: string]: DeclarationProcessor}.
    Declaration(decl: Declaration) {
      // console.log('decl', decl);
      // 转换 @l- 开头的颜色变量
      if (!options.filterDecl(decl)) {
        decl.remove();
        return;
      }

      const result = options.converter(decl);

      if (result) {
        Object.assign(decl, result);
      }
    },

    // Will be called on all Declaration nodes.
    // Will be called again on node or children changes.
    // Type: DeclarationProcessor | { [prop: string]: DeclarationProcessor}.
    // DeclarationExit() {

    // },

    // Will be called on Document node.
    // Will be called again on children changes.
    // Type: DocumentProcessor.
    // Document() {

    // },

    // Will be called on Document node, when all children will be processed.
    // Will be called again on children changes.
    // Type: DocumentProcessor.
    // DocumentExit() {

    // },
    // Will be called when all other listeners processed the document.
    // This listener will not be called again.
    // Type: RootProcessor.
    // Exit() {

    // },

    // Will be called on Root node once.
    // Type: RootProcessor.
    Once(root: Root, { AtRule }: Helpers) {
      console.log('root--', root);
      // 删除 atrule
      root.walkAtRules(rule => {
        if (rule.name === 'import') {
          rule.remove();
        }
      });

      // 只保留样式，并包裹在暗黑media下
      let media = new AtRule({ name: 'media', params: '(prefers-color-scheme: dark) and (max-device-width: 1024px)' });
      media.append(...root.nodes.filter(node => node.type === 'rule'));
      root.append(media);
    },

    // Will be called on Root node once, when all children will be processed.
    // Type: RootProcessor.
    // OnceExit() {

    // },


    // Will be called on Root node.
    // Will be called again on children changes.
    // Type: RootProcessor.
    // Root() {

    // },

    // Will be called on Root node, when all children will be processed.
    // Will be called again on children changes.
    // Type: RootProcessor.
    // RootExit() {

    // },

    // Will be called on all Rule nodes.
    // Will be called again on node or children changes.
    // Type: RuleProcessor.
    Rule(rule: Rule) {
      if (rule.nodes.length === 0) {
        rule.remove();
      }
    },

    // Will be called on all Rule nodes, when all children will be processed.
    // Will be called again on node or children changes.
    // Type: RuleProcessor.
    // RuleExit() {

    // },

    // prepare() {

    // }
  };
};

Plugin.postcss = true;

export default Plugin;
