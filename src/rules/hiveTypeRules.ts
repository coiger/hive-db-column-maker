export const DIRECT_INPUT = '직접 입력';

export const primitiveTypes = [
  /* String Types */
  'STRING',
  /* Numeric Types */
  'INT',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  /* Date/Time Types */
  'TIMESTAMP',
  'DATE',
  /* Misc Types */
  'BOOLEAN',
  'BINARY',
];

export const isCorrectParenthesis = (type: string) => {
  const openParen = [];
  let alreadyAllClosed = false;

  for (let i = 0; i < type.length; i += 1) {
    const c = type[i];
    if (c === '<' || c === '(') {
      if (alreadyAllClosed) return false;
      openParen[openParen.length] = c;
    } else if (c === '>' || c === ')') {
      const top = openParen[openParen.length - 1];
      if (top === '<' && c === ')') return false;
      if (top === '(' && c === '>') return false;
      openParen.pop();
      if (openParen.length === 0) alreadyAllClosed = true;
    }
  }

  return openParen.length === 0;
};

/**
 * 타입이 Hive 형식에 맞는지 확인합니다.
 * @description 이 함수는 isCorrectParenthesis()가 true임을 가정합니다.
 */
export const checkValidDataType = (rawType: string): boolean => {
  const checkValidPrimitiveType = (type: string) =>
    primitiveTypes.includes(type.toUpperCase()) ||
    /^CHAR\s*\(\s*\d+\s*\)$/is.test(type) ||
    /^VARCHAR\s*\(\s*\d+\s*\)$/is.test(type) ||
    /^DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)$/is.test(type);

  const getNested = (type: string) => type.slice(type.indexOf('<') + 1, -1);

  /**
   * separator로 문자열을 토큰화합니다.
   * @description 괄호 안의 separator는 무시합니다.
   */
  const tokenize = (types: string, separator: string) => {
    const ret: string[] = [];
    let isInParenthesis = 0;
    types.split(separator).forEach(type => {
      const trimmedType = type.trim();
      if (isInParenthesis === 0) {
        ret[ret.length] = trimmedType;
      } else {
        ret[ret.length - 1] = ret[ret.length - 1] + separator + trimmedType;
      }
      isInParenthesis += type.match(/<|\(/g)?.length ?? 0;
      isInParenthesis -= type.match(/>|\)/g)?.length ?? 0;
    });
    return ret;
  };

  /**
   * ARRAY < data_type > 형식에 맞는지 확인합니다.
   */
  const checkValidArrayType = (type: string) => {
    if (!/^ARRAY\s*<.*>$/is.test(type)) return false;
    const nestedStr = getNested(type).trim();
    return nestedStr !== '' && checkValidDataType(nestedStr);
  };

  /**
   * MAP < primitive_type, data_type > 형식에 맞는지 확인합니다.
   */
  const checkValidMapType = (type: string) => {
    if (!/^MAP\s*<.*>$/is.test(type)) return false;
    const nestedStr = getNested(type).trim();
    if (nestedStr === '') return false;

    const [primitiveType, dataType, ...rest] = tokenize(nestedStr, ',').map(s => s.trim());
    if (!dataType || rest.length !== 0) return false;
    return checkValidPrimitiveType(primitiveType) && checkValidDataType(dataType);
  };

  /**
   * STRUCT < col_name : data_type, ... > 형식이 맞는지 확인합니다.
   * @description 컬럼 이름(col_name)은 반드시 백틱(`)으로 둘러싸야 합니다.
   */
  const checkValidStructType = (type: string) => {
    if (!/^STRUCT\s*<.*>$/is.test(type)) return false;
    const nestedStr = getNested(type).trim();
    if (nestedStr === '') return false;

    const nameTypePairs = tokenize(nestedStr, ',').map(pair => tokenize(pair, ':').map(s => s.trim()));
    return (
      nameTypePairs.every(pair => pair.length === 2) &&
      nameTypePairs.every(([colName, dataType]) => /^`.+`$/.test(colName) && checkValidDataType(dataType))
    );
  };

  /**
   * ARRAY < data_type > 형식에 맞는지 확인
   */
  const checkValidUnionType = (type: string) => {
    if (!/^UNIONTYPE\s*<.*>$/is.test(type)) return false;
    const nestedStr = getNested(type).trim();
    if (nestedStr === '') return false;

    const dataTypes = tokenize(nestedStr, ',').map(s => s.trim());
    return dataTypes.every(dataType => checkValidDataType(dataType));
  };

  const type = rawType.trim();

  return (
    checkValidPrimitiveType(type) ||
    checkValidArrayType(type) ||
    checkValidMapType(type) ||
    checkValidStructType(type) ||
    checkValidUnionType(type)
  );
};
