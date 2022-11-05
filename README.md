# Hive Database Column Maker
Hive 규칙에 따른 database column 이름/타입 검증 및 포맷팅 에디터  
- **DEMO**: https://coiger.github.io/hive-db-column-maker/

## 이름 규칙
- [기본 규칙](https://cwiki.apache.org/confluence/display/hive/languagemanual+ddl#LanguageManualDDL-RulesforColumnNames:~:text=result%20in%20error.-,Alter,-Column)에 기반
- STRUCT 타입 내 컬럼 이름에도 동일한 규칙 적용

### Implemented Rule
- 중복되는 이름 비허용
- 공백 및 타입 구분 문자를 제외한 모든 유니코드 문자 허용
    - 타입 구분 문자 = 쉼표(,)와 콜론(:), 그리고 괄호('<', '>', '(', ')')
- 입력한 내용을 백틱(`)으로 둘러 변환
- 입력한 내용에 백틱이 있는 경우 이중-백틱(``)으로 변환

## 타입 규칙
- [기본 규칙](https://cwiki.apache.org/confluence/display/hive/languagemanual+ddl#LanguageManualDDL-CreateTable)에 기반

### Supported Primitive Type
- Numeric Types: INT, BIGINT, SMALLINT, TINYINT, DECIMAL, DECIMAL(precision, scale), FLOAT, DOUBLE
- Date/Time Types: TIMESTAMP, DATE
- Misc Types: BOOLEAN, BINARY
- String Types: STRING, VARCHAR(len), CHAR(len)

### Supported Complex Type
- ARRAY < data_type >
- MAP < primitive_type, data_type >
- STRUCT < col_name : data_type, ... >
    - col_name 규칙은 [이름 규칙](#이름-규칙)을 따름
- UNIONTYPE < data_type, data_type, ... >

## 기능
### 컬럼 추가
- 추가 버튼을 눌러 추가
- 이름에서는 Enter, 타입의 직접 입력창에서는 Ctrl+Enter로 추가 가능
- 타입의 직접 입력창에서는 지원하는 모든 타입을 입력 가능
- 입력을 주지 않은 필드가 있거나, [타입 규칙](#%ED%83%80%EC%9E%85-%EA%B7%9C%EC%B9%99)에 맞지 않는 경우 추가 불가능
- 중복되는 컬럼 이름이 있는 경우 추가 불가능

### 목록
- pagination
- 이름이 길어질 경우 wrap. 타입이 길어질 경우 ellipse.
- 타입이 길어질 가능성이 있는 Complex Type의 경우 행을 확장할 수 있는 버튼을 제공하여 포맷팅된 타입 확인 가능

### 컬럼 삭제
- 삭제 버튼을 누르고 확인을 마친 뒤 삭제 가능

### 검증 및 포맷팅
- primitive type은 목록을 제공하므로, 이중 선택할 경우 검증이 별도로 필요치 않음.
- 직접 입력을 선택하여 입력하는 경우 [타입 규칙](#%ED%83%80%EC%9E%85-%EA%B7%9C%EC%B9%99)에 맞게 검증
- 타입 규칙을 지킨 입력의 경우 보기 좋은 형식으로 포맷팅
- 타입 규칙을 어긴 입력의 경우 입력창 테두리가 붉어짐

## 포맷팅 규칙
### 괄호
- 여는 괄호를 입력한 경우, 괄호 이후가 입력의 끝이나 공백, 또는 닫는 괄호라면, 닫는 괄호를 자동으로 붙여줍니다.
- 다음 문자가 닫는 괄호인데 닫는 괄호를 입력한 경우 커서만 다음으로 옮겨줍니다.

### 개행
- 둥근 괄호 '('와 ')' 사이에 있는 문자는 개행 없이 쭉 입력합니다.
- 꺾인 괄호 '<'와 '>' 사이에 있는 문자는 길지 않으면 개행 없이 쭉 입력하며, 길 경우 개행됩니다.
    - 개행될 때 인덴트가 한 수준 깊어집니다.
    - '>'를 빠져 나오면 인덴트가 한 수준 감소합니다.

### 띄어쓰기
- ',' 뒤에는 한 칸 띄어씁니다.
- ':' 뒤에는 한 칸 띄어씁니다.

## 개발 스택 (only front-end)
- This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
- 언어 : TypeScript
- 스타일링 : CSS Module, Ant Design
