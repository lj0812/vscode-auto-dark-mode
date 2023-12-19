import { capitalize } from '@/utils';

interface TypeProperty {
  name: string;
  type: string;
  comment?: string;
  optional?: boolean;
  readonly?: boolean
}

interface TypeDeclaration {
  name: string;
  properties: TypeProperty[];
  comment?: string;
}

const getTypeName = (name: string) => {
  return capitalize(name);
};

export function JsonScheme2Type(jsonSchema: any) {

};

export function json2Type(json: any, rootName = 'Response') {
  const result: Record<string, any> = {};

  if (Array.isArray(json)) {
    json = { zpData: json };
  }

  const transfer = (json: any) => {
    return Object.entries(json).map(([key, value]) => {
      const type = typeof value;
      const item: TypeProperty = { name: key, type };

      if (Array.isArray(value)) {
        const first = value[0];
        const type = typeof first;

        if (type === 'undefined') {
          item.type = 'any[]';

          return item;
        }
        if (value === null) {
          item.type = null;

          return item;
        }

        if (Array.isArray(first)) {
          item.type = 'any[][]';

          return item;
        }

        if (typeof first === 'object' && first !== null) {
          const typeName = getTypeName(key);
          const type = transfer(first);

          result[typeName] = type;

          item.type = `${typeName}[]`;

          return item;
        }

        item.type = `${type}[]`;

        return item;
      }

      if (type === 'object' && value !== null) {
        const typeName = getTypeName(key);
        const type = transfer(value);

        result[typeName] = type;

        item.type = typeName;

        return item;
      }

      if (value === null) {
        item.type = 'null';

        return item;
      }

      return item;
    });
  };

  result[rootName] = transfer(json);

  return result;
}

export const join = (indentStr: string) => (literals: any, ...values: any[]) => {
  let output = '';
  let index;
  for (index = 0; index < values.length; index++) {
    const value = values[index];

    const curr = Array.isArray(value)
      ? value.map((item) => item.split('\n').map((item: string) => `${indentStr}${item}`).join('\n')).join('\n')
      : value;

    output +=  literals[index] + curr;
  }

  output += literals[index];
  return output;
};