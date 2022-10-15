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

/**
 * 백틱 내의 문자는 그대로 두고, 나머지는 공백 제거 및 대문자화를 수행합니다.
 */
export const makeCompact = (text: string) => {
  const tokens = text.split('`');
  return tokens.map((token, index) => (index % 2 ? `\`${token}\`` : token.replace(/\s/g, '').toUpperCase())).join('');
};

/**
 * Hive 타입 형식을 적절히 포맷팅 합니다.
 * @description 필수적이지는 않으나, makeCompact 함수를 거쳐 단순화된 형태가 선호됩니다.
 * @returns 커서 위치를 나타내는 ‸가 있을 경우, 해당 위치도 반환합니다.
 */
export const makePretty = (text: string): [string, null | number] => {
  const INDENT = '  ';
  let indentLevel = 0;
  let isInBacktick = false;
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

    if (isInBacktick) {
      if (c === '`') isInBacktick = !isInBacktick;
      formattedText += c;
    } else if (isInCurvedParen) {
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
        case '`':
          isInBacktick = !isInBacktick;
          formattedText += '`';
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
