import Input, { InputRef } from 'antd/lib/input/Input';
import { useState, useRef, memo } from 'react';
import { Button, Card, Col, Form, Row, Select, notification } from 'antd';
import TextArea, { TextAreaRef } from 'antd/lib/input/TextArea';
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { BaseSelectRef } from 'rc-select';
import {
  checkValidDataType,
  DIRECT_INPUT,
  isCorrectParenthesis,
  makeCompact,
  makePretty,
  primitiveTypes,
} from 'rules/hiveTypeRules';
import styles from './DBColumnInsert.module.css';

const { Option } = Select;

type PropTypes = {
  onInsert: (newName: string, newType: string) => boolean;
};

function DBColumnInsert({ onInsert }: PropTypes) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  const [submitWasTried, setSubmitWasTried] = useState(false);
  const [isDupName, setIsDupName] = useState(false);
  const isEmptyName = submitWasTried && name === '';
  const isEmptyType = submitWasTried && type === '';

  const [selectedType, setSelectedType] = useState('');
  const [manualTypeInput, setManualTypeInput] = useState('');
  const [isValidType, setIsValidType] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);

  const [showNameHint, setShowNameHint] = useState(false);
  const [showTypeHint, setShowTypeHint] = useState(false);
  const [isFocusedOnSelect, setIsFocusedOnSelect] = useState(false);

  const nameInputRef = useRef<InputRef>(null);
  const typeInputRef = useRef<BaseSelectRef>(null);
  const textAreaRef = useRef<TextAreaRef>(null);

  const handleSubmit = () => {
    setSubmitWasTried(true);
    if (name === '') {
      nameInputRef.current?.focus();
      return;
    }
    if (type === '') {
      if (selectedType === DIRECT_INPUT) {
        if (manualTypeInput !== '' && !isValidType) {
          notification.error({
            message: 'Hive Column 입력 오류',
            description: `타입 형식이 올바르지 않습니다.`,
            placement: 'bottomRight',
          });
        }
        textAreaRef.current?.focus();
      } else {
        typeInputRef.current?.focus();
      }
      return;
    }

    if (!onInsert(`\`${name.replace(/`/g, '``')}\``, type)) {
      setIsDupName(true);
      notification.error({
        message: 'Hive Column 입력 오류',
        description: `\`${name}\`은(는) 이미 존재하는 이름입니다.`,
        placement: 'bottomRight',
      });
      return;
    }

    /* Clean up */
    setName('');
    setType('');
    setSubmitWasTried(false);
    setSelectedType('');
    setManualTypeInput('');
    setIsValidType(false);
    setShowTextArea(false);

    nameInputRef.current?.focus();
  };

  const handleSelect = (selected: string) => {
    setSelectedType(selected);
    (document.activeElement as HTMLElement).blur();

    if (selected === DIRECT_INPUT) {
      setType('');
      setManualTypeInput('');
      setIsValidType(false);
      setShowTextArea(true);
      textAreaRef.current?.focus();
    } else {
      setShowTextArea(false);
      setType(selected);
    }
  };

  return (
    <Card>
      <Form>
        <Form.Item
          required
          label={
            <span>
              컬럼 이름 <QuestionCircleOutlined onClick={() => setShowNameHint(cur => !cur)} />
            </span>
          }>
          <Input
            className='db-column-name-input'
            ref={nameInputRef}
            value={name}
            status={isEmptyName || isDupName ? 'error' : ''}
            placeholder={isEmptyName ? '필수 입력입니다' : ''}
            addonBefore='`'
            addonAfter='`'
            onChange={e => {
              if (e.target.value.includes('‸')) {
                notification.warning({
                  message: 'Hive Column 입력 경로',
                  description: `CARET(‸) 문자는 사용이 제한되어 있습니다.`,
                  placement: 'bottomRight',
                });
                return;
              }
              setName(e.target.value);
              setIsDupName(false);
            }}
            onPressEnter={handleSubmit}
          />
          {showNameHint && (
            <div className={styles.hint}>
              &#8251; 입력된 이름은 백틱(`)으로 감싸지게 됩니다.
              <ul>
                <li>모든 유니코드 문자를 사용할 수 있습니다.</li>
                <li>이름 자체에 백틱을 사용할 수도 있으나, 이중-백틱(``)으로 변환됩니다.</li>
              </ul>
            </div>
          )}
        </Form.Item>
        <Form.Item
          required
          label={
            <span>
              컬럼 타입 <QuestionCircleOutlined onClick={() => setShowTypeHint(cur => !cur)} />
            </span>
          }>
          <Select
            ref={typeInputRef}
            className={styles['select-type']}
            showSearch
            open={isFocusedOnSelect}
            status={isEmptyType && selectedType !== DIRECT_INPUT ? 'error' : ''}
            placeholder={isEmptyType ? '필수 입력입니다' : ''}
            value={selectedType}
            onChange={handleSelect}
            onFocus={() => {
              setIsFocusedOnSelect(true);
            }}
            onBlur={() => {
              setIsFocusedOnSelect(false);
            }}
            optionFilterProp='children'
            filterOption={(input, option) => {
              const optionStr = option?.children as unknown as string;
              return optionStr.toLowerCase().includes(input.toLowerCase()) || optionStr === DIRECT_INPUT;
            }}>
            {[...primitiveTypes, DIRECT_INPUT].map(option => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
          {showTextArea && (
            <TextArea
              id={styles.textarea}
              ref={textAreaRef}
              autoFocus
              status={(!submitWasTried && manualTypeInput === '') || isValidType ? undefined : 'error'}
              value={manualTypeInput}
              onChange={e => {
                if (e.target.value.includes('‸')) {
                  notification.warning({
                    message: 'Hive Column 입력 경고',
                    description: `CARET(‸) 문자는 사용이 제한되어 있습니다.`,
                    placement: 'bottomRight',
                  });
                  return;
                }

                const text = e.target.value;
                const isValid = isCorrectParenthesis(text) && checkValidDataType(text);
                setIsValidType(isValid);

                if (isValid) {
                  const compactText = makeCompact(text);
                  if (text !== compactText && compactText === makeCompact(manualTypeInput)) {
                    // if compact version isn't changed, do not formatting, just update state
                    setManualTypeInput(text);
                    return;
                  }

                  const currentCursorPos = e.target.selectionStart;
                  const textWithCursor = `${text.slice(0, currentCursorPos)}‸${text.slice(currentCursorPos)}`;
                  const [prettyText, newCursorPos] = makePretty(makeCompact(textWithCursor));
                  setManualTypeInput(prettyText);
                  setType(compactText);
                  if (newCursorPos) {
                    setTimeout(() => {
                      e.target.selectionStart = newCursorPos;
                      e.target.selectionEnd = newCursorPos;
                    }, 0);
                  }
                } else {
                  setManualTypeInput(text);
                  setType('');
                }
              }}
              onPressEnter={e => {
                if (e.ctrlKey) {
                  handleSubmit();
                }
              }}
              placeholder='타입을 직접 입력해주세요.'
              autoSize
            />
          )}
          {showTypeHint && (
            <div className={styles.hint}>
              &#8251; Primitive Type 목록 (case-insensitive)
              <ul>
                <li>String Types: STRING</li>
                <li>Numeric Types: INT, BIGINT, SMALLINT, TINYINT, DECIMAL, FLOAT, DOUBLE</li>
                <li>Date/Time Types: TIMESTAMP, DATE</li>
                <li>Misc Types: BOOLEAN, BINARY</li>
                <li>With parameters</li>
                <ul>
                  <li>String Types: VARCHAR(len), CHAR(len)</li>
                  <li>Numeric Types: DECIMAL(precision, scale)</li>
                </ul>
              </ul>
              &#8251; Complex Type 규칙 (case-insensitive)
              <ul>
                <li>{'ARRAY < data_type >'}</li>
                <li>{'MAP < primitive_type, data_type >'}</li>
                <li>{'STRUCT < col_name : data_type, ... >'}</li>
                <ul>
                  <li>
                    <i>주의: 컬럼 이름(col_name)은 반드시 백틱(`)으로 둘러싸야 합니다.</i>
                  </li>
                </ul>
                <li>{'UNIONTYPE < data_type, data_type, ... >'}</li>
              </ul>
            </div>
          )}
        </Form.Item>
        <Row justify='end'>
          <Col>
            <Button icon={<PlusCircleOutlined />} onClick={handleSubmit}>
              새 컬럼 추가
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}

export default memo(DBColumnInsert);
