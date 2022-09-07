import { formatPercent, parseRgbaStr, rgb2hex, normalizeHex } from '../utils/index';

type ColorMap = {
  [x: string]: string
};

interface Options {
  colorMap: ColorMap,
  [x: string]: any
}

export default class ColorConverter {
  protected colorMap: ColorMap;
  constructor(options: Options) {
    this.colorMap = options.colorMap;
  }

  // 根据colorMap转换hex颜色为变量名
  public getVarByHex(hex: string) {
    return this.colorMap[hex.toUpperCase()];
  }

  // 根据rgb颜色值转换为变量名
  public getVarByRgb(r: number, g: number, b: number) {
    let hex = rgb2hex(r, g, b);
    return this.getVarByHex(hex);
  };

  // 替换hex
  public replaceHex(hex: string) {
    // 将3位色值统一成6位
    hex = normalizeHex(hex);

    return this.getVarByHex(hex) || hex;
  }

  // 替换rgba
  public replaceRgba (rgba: string) {
    const { r, g, b, a = 1 } = parseRgbaStr(rgba);

    if (a === 0) {return 'transparent';};

    const varName = this.getVarByRgb(r, g, b);
    if (a === 1) {return varName || rgba;};

    if (varName) {
      return `fade(${varName}, ${formatPercent(a)})`;
    }

    return rgba;
  };

  // 根据 colorItems 或 colorMap 将颜色转换成变量名，转换规则如下
  // #FFFFFF -> @l-white
  // linear-gradient(180deg, #A4EBEB 0%, rgba(164, 235, 235, 0) 100%) -> linear-gradient(180deg, @l-boss-300 0%, transparent 100%)
  // rgb(164, 235, 235) -> @l-boss-300
  public convert(colorStr: string) {
    return colorStr
      .replaceAll(/#([a-f0-9]{6}|[a-f0-9]{3})/ig, (hex) => this.replaceHex(hex))
      .replaceAll(/rgba?\(([0-9]{1,3}), *([0-9]{1,3}), *([0-9]{1,3})(?:, *([0-9.]{1,3}))?\)/ig, rgba => this.replaceRgba(rgba));
  }
}