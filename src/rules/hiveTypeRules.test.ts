import {
  backtickedType,
  checkValidDataType,
  getNested,
  isCorrectParenthesis,
  isValidColName,
  makeCompact,
  makePretty,
  tokenize,
} from './hiveTypeRules';

describe('Test isCorrectParenthesis function', () => {
  /* TRUE */
  it('올바른 괄호쌍', () => {
    expect(isCorrectParenthesis('array<int>')).toBe(true);
  });

  /* FALSE */
  it('열고 닫히는 괄호 개수 불일치', () => {
    expect(isCorrectParenthesis('array<<int>')).toBe(false);
  });

  it('열고 닫히는 괄호쌍 불일치', () => {
    expect(isCorrectParenthesis('array<varchar(10>)')).toBe(false);
  });

  it('가장 바깥 괄호쌍이 여럿', () => {
    expect(isCorrectParenthesis('array<int><int>')).toBe(false);
  });
});

describe('Test getNested function', () => {
  it('Nested', () => {
    expect(getNested('array<int>')).toBe('int');
  });

  it('Nested in Nested', () => {
    expect(getNested('struct<tag:array<int>>')).toBe('tag:array<int>');
  });
});

describe('Test tokenize function', () => {
  it('괄호가 없는 케이스', () => {
    expect(tokenize('int, string, char', ',')).toStrictEqual(['int', 'string', 'char']);
  });

  it('괄호 안에 구분자가 있는 케이스', () => {
    expect(tokenize('tag:array<struct<code:string>>', ':')).toStrictEqual(['tag', 'array<struct<code:string>>']);
    expect(tokenize('int, map<int, decimal(5, 5)>', ',')).toStrictEqual(['int', 'map<int,decimal(5,5)>']);
  });
});

describe('Test isValidColName function', () => {
  /* TRUE */
  it('단순 문자열', () => {
    expect(isValidColName('colname')).toBe(true);
  });

  it('연속된 백틱(`)이 짝수개가 있는 문자열', () => {
    expect(isValidColName('`col``name`')).toBe(true);
    expect(isValidColName('`col````name`')).toBe(true);
    expect(isValidColName('`col``````name`')).toBe(true);
  });

  /* FALSE */
  it('비어 있는 문자열', () => {
    expect(isValidColName('')).toBe(false);
    expect(isValidColName('``')).toBe(false);
  });

  it('공백이 있는 문자열', () => {
    expect(isValidColName('colname ')).toBe(false);
    expect(isValidColName('col name')).toBe(false);
  });

  it('캐럿 문자(‸)가 있는 문자열', () => {
    expect(isValidColName('col‸name')).toBe(false);
    expect(isValidColName('colname‸')).toBe(false);
  });

  it('타입 구분 문자(쉼표[,], 콜론[:], 괄호[(), <>])가 있는 문자열', () => {
    expect(isValidColName('col,name')).toBe(false);
    expect(isValidColName('col:name')).toBe(false);
    expect(isValidColName('col(name')).toBe(false);
    expect(isValidColName('colname)')).toBe(false);
    expect(isValidColName('col<name')).toBe(false);
    expect(isValidColName('colname>')).toBe(false);
  });

  it('연속된 백틱(`)이 홀수개가 있는 문자열', () => {
    expect(isValidColName('`col`name`')).toBe(false);
    expect(isValidColName('`col```name`')).toBe(false);
    expect(isValidColName('`col`````name`')).toBe(false);
  });
});

describe('Test checkValidDataType function', () => {
  /* TRUE */
  it('올바른 Primitive Type', () => {
    expect(checkValidDataType('string')).toBe(true);
    expect(checkValidDataType('int')).toBe(true);
    expect(checkValidDataType('char(10)')).toBe(true);
    expect(checkValidDataType('varchar(10)')).toBe(true);
    expect(checkValidDataType('decimal')).toBe(true);
    expect(checkValidDataType('decimal(10, 10)')).toBe(true);
  });

  it('대소문자는 결과에 영향을 주지 않음', () => {
    expect(checkValidDataType('STRING')).toBe(true);
    expect(checkValidDataType('INT')).toBe(true);
    expect(checkValidDataType('CHAR(10)')).toBe(true);
  });

  it('올바른 Complex Type', () => {
    expect(checkValidDataType('array<int>')).toBe(true);
    expect(checkValidDataType('map<int, array<int>>')).toBe(true);
    expect(checkValidDataType('struct<code:string, text:string>')).toBe(true);
    expect(checkValidDataType('array<struct<code:string, text:string>>')).toBe(true);
    expect(checkValidDataType('uniontype<int, array<int>, map<int, string>, struct<c:string, t:string>>')).toBe(true);
  });

  /* FALSE */
  it('올바르지 않은 array 타입', () => {
    expect(checkValidDataType('arr<int>')).toBe(false); // arr는 올바르지 않음.
    expect(checkValidDataType('array<str>')).toBe(false); // 괄호 내부의 타입이 올바르지 않음.
  });

  it('올바르지 않은 map 타입', () => {
    expect(checkValidDataType('mapp<int>')).toBe(false); // mapp은 올바르지 않음.
    expect(checkValidDataType('map<array<int>, int>')).toBe(false); // 괄호 내부의 첫 번째 타입은 primitive type이어야 함.
    expect(checkValidDataType('map<int, str>')).toBe(false); // 괄호 내부의 두 번째 타입이 올바르지 않음.
    expect(checkValidDataType('map<int>')).toBe(false); // 괄호 내부의 타입 개수가 올바르지 않음.
    expect(checkValidDataType('map<int, int, int>')).toBe(false); // 괄호 내부의 타입 개수가 올바르지 않음.
  });

  it('올바르지 않은 struct 타입', () => {
    expect(checkValidDataType('struc<int>')).toBe(false); // struc은 올바르지 않음.
    expect(checkValidDataType('struct<co de:string')).toBe(false); // 괄호 내부의 컬럼 이름이 올바르지 않음(공백이 있음).
    expect(checkValidDataType('struct<code:str>')).toBe(false); // 괄호 내부의 컬럼 타입이 올바르지 않음.
    expect(checkValidDataType('struct<int>')).toBe(false); // 괄호 내부가 이름-타입 쌍이 아님.
  });

  it('올바르지 않은 uniontype 타입', () => {
    expect(checkValidDataType('union<int>')).toBe(false); // union은 올바르지 않음.
    expect(checkValidDataType('uniontype<string, int, str>')).toBe(false); // 괄호 내부에 올바르지 않은 타입이 있음.
  });
});

describe('Test makeCompact function', () => {
  it('타입의 대문자화', () => {
    expect(makeCompact('string')).toBe('STRING');
    expect(makeCompact('int')).toBe('INT');
    expect(makeCompact('char(10)')).toBe('CHAR(10)');
  });

  it('STRUCT 타입 내의 컬럼 이름은 대문자화를 수행하지 않음', () => {
    expect(makeCompact('struct<code:string,text:string>')).toBe('STRUCT<code:STRING,text:STRING>');
  });

  it('공백 제거', () => {
    expect(makeCompact('array < int > ')).toBe('ARRAY<INT>');
    expect(makeCompact(' map < int , array < int > > ')).toBe('MAP<INT,ARRAY<INT>>');
    expect(
      makeCompact(` struct <
                              code : string ,
                          text : string > `)
    ).toBe('STRUCT<code:STRING,text:STRING>');
  });
});

describe('Test makePretty function', () => {
  it('띄어쓰기', () => {
    expect(makePretty('DECIMAL(10,10)')).toStrictEqual(['DECIMAL(10, 10)', null]); // 둥근 괄호('(', ')') 내 ',' 뒤 띄어쓰기
  });

  it('개행', () => {
    expect(makePretty('UNIONTYPE<INT,INT,INT,INT,INT>')).toStrictEqual([
      `UNIONTYPE<
  INT,
  INT,
  INT,
  INT,
  INT
>`,
      null,
    ]);
  });

  it('개행 및 띄어쓰기', () => {
    // struct 타입 내 컬럼 이름-타입 쌍이 단독 라인에 존재하게 되는 경우, ':' 뒤에 한 칸 띄어쓰기
    expect(makePretty('STRUCT<code:STRING,text:STRING>')).toStrictEqual([
      `STRUCT<
  code: STRING,
  text: STRING
>`,
      null,
    ]);
  });

  it('커서 위치 반환', () => {
    // 캐럿(‸) 문자가 있는 경우, 포맷팅 된 이후 문자열에서 문자 간 상대적 위치가 동일하도록 계산된 커서 위치 반환
    expect(makePretty('STRUCT<code:STRING,‸text:STRING>')).toStrictEqual([
      `STRUCT<
  code: STRING,
  text: STRING
>`,
      23,
    ]);
  });
});

describe('Test backtickedType function', () => {
  it('STRUCT 타입 내 컬럼 이름 백틱 조작', () => {
    expect(backtickedType('STRUCT<code:STRING,te`xt:STRING>')).toBe('STRUCT<`code`:STRING,`te``xt`:STRING>');
  });
});
