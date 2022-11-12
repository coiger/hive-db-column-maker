import { getNested, isCorrectParenthesis } from './hiveTypeRules';

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
