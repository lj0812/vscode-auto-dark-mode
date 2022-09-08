/* eslint-disable @typescript-eslint/naming-convention */
import { Declaration, Root, Rule, Helpers, Result, comment, AtRule } from "postcss";
import { MixinAtRule } from 'postcss-less';

const colorProps = [
  'color',
  'background',
  'border'
];

type Options = {
  converter: Function,
  filterDecl: Function,
};

const DISABLE_FLAG = 'disable auto-dark-mode';

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
    // Declaration(decl: Declaration) {

    // },

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
    Once(root: Root) {
      console.log('root', JSON.parse(JSON.stringify(root)));
      root.walkComments(comment => {
        if (comment.text.includes(DISABLE_FLAG)) {
          comment.next().remove();
        }
        comment.remove();
      });

      // 删除 atrule
      root.walkAtRules((rule) => {
        if (!options.filterDecl(rule)) {
          rule.remove();
          return;
        }

        const result = options.converter(rule);

        if (!result) {
          rule.remove();
          return;
        }

        rule.params = result.value;
      });

      root.walkDecls(decl => {
        if (!options.filterDecl(decl)) {
          decl.remove();
          return;
        }

        const result = options.converter(decl);

        if (!result) {
          decl.remove();
          return;
        }

        Object.assign(decl, result);
      });
    },

    // Will be called on Root node once, when all children will be processed.
    // Type: RootProcessor.
    OnceExit(root: Root, { AtRule }: Helpers) {
      // 只保留样式，并包裹在暗黑media下
      const validNodes = root.nodes.filter(node => node.type === 'rule');

      validNodes.forEach(node => {
        node.raws.before = node.raws.before.replace(/^/, '\n');
      });

      if (validNodes.length > 0) {
        let media = new AtRule({ name: 'media', params: '(prefers-color-scheme: dark) and (max-device-width: 1024px)' });
        media.append(...validNodes);
        root.append(media);

        root.walk(node => {
          // 嵌套最终剩下属性时补全分号
          if (node.type === 'rule' && node.nodes.every(n => n.type === 'decl') && node.raws?.semicolon === false) {
            node.raws.semicolon = true;
          }
          // 遍历在每行前面增加缩进
          if (node.type === 'rule' || node.type === 'decl' || (node.type === 'atrule' && (node as MixinAtRule).mixin)) {
            node.raws.before = node.raws.before.replace(/$/, '\t');
          }
          if (node.type === 'rule') {
            node.raws.after = node.raws.after.replace(/$/, '\t');
          }
        });
      }

      console.log('root exit', JSON.parse(JSON.stringify(root)));
    },


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

    // prepare(result: Result) {
    //   console.log('prepare', JSON.parse(JSON.stringify(result)));
    // }
  };
};

Plugin.postcss = true;

export default Plugin;
