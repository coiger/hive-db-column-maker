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

const isCorrectParenthesis = (type: string) => {
  const openParen = [];
  let alreadyAllClosed = false;

  for (let i = 0; i < type.length; i += 1) {
    const c = type[i];
    if (c === '<' || c === '(') {
      if (alreadyAllClosed) return false;
      openParen[openParen.length] = c;
    } else if (c === '>' || c === ')') {
      const top = openParen.pop();
      if (top === '<' && c === ')') return false;
      if (top === '(' && c === '>') return false;
      if (openParen.length === 0) alreadyAllClosed = true;
    }
  }

  return openParen.length === 0;
};

/**
 * @param text 문자열 내에 '<'가 존재하고, 마지막 문자가 '>'인 문자열
 * @returns '<'와 '>' 내의 문자열을 반환
 */
const getNested = (text: string) => text.slice(text.indexOf('<') + 1, -1);

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
 * 타입이 Hive 형식에 맞는지 확인합니다.
 * @description 이 함수는 isCorrectParenthesis()가 true임을 가정합니다.
 */
const checkValidDataType = (rawType: string): boolean => {
  const checkValidPrimitiveType = (type: string) =>
    primitiveTypes.includes(type.toUpperCase()) ||
    /^CHAR\s*\(\s*\d+\s*\)$/is.test(type) ||
    /^VARCHAR\s*\(\s*\d+\s*\)$/is.test(type) ||
    /^DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)$/is.test(type);

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
   */
  const checkValidStructType = (type: string) => {
    if (!/^STRUCT\s*<.*>$/is.test(type)) return false;
    const nestedStr = getNested(type).trim();
    if (nestedStr === '') return false;

    const nameTypePairs = tokenize(nestedStr, ',').map(pair => tokenize(pair, ':').map(s => s.trim()));
    return (
      nameTypePairs.every(pair => pair.length === 2) &&
      nameTypePairs.every(([colName, dataType]) => !/\s+/s.test(colName) && checkValidDataType(dataType))
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

export const isValidHiveType = (type: string) => isCorrectParenthesis(type) && checkValidDataType(type);

/**
 * 공백을 제거하고, STRUCT 타입의 컬럼 이름을 제외한 문자의 대문자화를 수행합니다.
 * STRUCT 타입의 컬럼 이름에 백틱이 둘러져 있는 경우, 백틱을 제거해줍니다.
 * @description checkValidDataType() 함수의 반환값이 true인 텍스트를 입력으로 가정합니다.
 */
export const makeCompact = (text: string) => {
  /**
   * @param noSpaceText 공백이 없는 텍스트
   */
  const helpMakeCompact = (noSpaceText: string): string => {
    if (noSpaceText.at(-1) === '‸') return `${helpMakeCompact(noSpaceText.slice(0, -1))}‸`;

    if (/^‸?S‸?T‸?R‸?U‸?C‸?T‸?<.*>$/i.test(noSpaceText)) {
      const nameTypePairs = tokenize(getNested(noSpaceText), ',').map(pair => tokenize(pair, ':').map(s => s.trim()));
      return `${noSpaceText.split('<', 1)[0]}<${nameTypePairs
        .map(([colName, dataType]) => {
          let unBacktickedColName = colName;
          if (/^`.*`‸?$/.test(colName)) {
            if (colName.at(-1) === '‸') unBacktickedColName = `${colName.slice(1, -2)}‸`;
            else unBacktickedColName = colName.slice(1, -1);
          }
          return `${unBacktickedColName}:${helpMakeCompact(dataType)}`;
        })
        .join(',')}>`;
    }

    if (noSpaceText.includes('<'))
      return `${noSpaceText.split('<', 1)[0].toUpperCase()}<${helpMakeCompact(getNested(noSpaceText))}>`;

    return noSpaceText.toUpperCase(); // primitive types
  };

  return helpMakeCompact(text.replace(/\s/g, ''));
};

/**
 * Hive 타입 형식을 적절히 포맷팅 합니다.
 * @description makeCompact 함수를 거친 문자열을 가정합니다.
 * @returns 커서 위치를 나타내는 ‸가 있을 경우, 해당 위치도 반환합니다.
 */
export const makePretty = (text: string): [string, null | number] => {
  const INDENT = '  ';
  let indentLevel = 0;
  let isInCurvedParen = false;
  let cursorPos = null;

  let formattedText = '';
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '‸') {
      cursorPos = formattedText.length;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (isInCurvedParen) {
      if (c === ')') isInCurvedParen = !isInCurvedParen;
      formattedText += c;
      if (c === ',') formattedText += ' ';
    } else if (c === '<') {
      // short type(text) lookahead
      let nestedStr = '';
      let openParenCnt = 1;
      let j = i + 1;
      while (openParenCnt && j - i <= 16) {
        const nestedChar = text[j];
        if (nestedChar === '<') openParenCnt += 1;
        else if (nestedChar === '>') openParenCnt -= 1;
        j += 1;
        nestedStr += nestedChar;
      }

      if (openParenCnt) {
        indentLevel += 1;
        // cursor lookahead before newline
        if (text[i + 1] === '‸') {
          cursorPos = formattedText.length + 1;
          i += 1;
        }
        formattedText = `${formattedText}<\n${INDENT.repeat(indentLevel)}`;
      } else {
        if (nestedStr.includes('‸')) {
          const caretIdx = nestedStr.indexOf('‸');
          cursorPos = formattedText.length + caretIdx + 1;
          nestedStr = nestedStr.slice(0, caretIdx) + nestedStr.slice(caretIdx + 1);
        }
        formattedText += `<${nestedStr}`;
        i = j - 1;
      }
    } else {
      switch (c) {
        case ':':
          formattedText += ': ';
          break;
        case ',':
          // cursor lookahead before newline
          if (text[i + 1] === '‸') {
            cursorPos = formattedText.length + 1;
            i += 1;
          }
          formattedText = `${formattedText},\n${INDENT.repeat(indentLevel)}`;
          break;
        case '>':
          indentLevel -= 1;
          formattedText = `${formattedText}\n${INDENT.repeat(indentLevel)}>`;
          break;
        case '(':
          isInCurvedParen = !isInCurvedParen;
          formattedText += '(';
          break;
        default:
          formattedText += c;
      }
    }
  }

  return [formattedText, cursorPos];
};

/**
 * STRUCT 타입의 컬럼 이름을 백틱(`)으로 두르고, 백틱(`)이 있다면 더블-백틱(``)으로 변환합니다.
 * @param type makeCompact를 거친 문자열
 */
export const backtickedType = (type: string): string => {
  if (/^STRUCT<.*>$/i.test(type)) {
    const nameTypePairs = tokenize(getNested(type), ',').map(pair => tokenize(pair, ':'));
    return `STRUCT<${nameTypePairs
      .map(([colName, dataType]) => `\`${colName.replace(/`/g, '``')}\`:${backtickedType(dataType)}`)
      .join(',')}>`;
  }

  if (type.includes('<')) return `${type.split('<', 1)[0]}<${backtickedType(getNested(type))}>`;

  return type; // primitive types
};
