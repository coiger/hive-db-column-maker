import { MinusCircleOutlined } from '@ant-design/icons';
import { Button, Divider, Popconfirm, Table, Typography } from 'antd';
import { memo, useState, useRef } from 'react';
import DBColumnInsert from 'components/DBColumnInsert/DBColumnInsert';
import { makePretty, primitiveTypes } from 'rules/hiveTypeRules';
import 'App.css';

const { Title, Text } = Typography;

type DBColumnType = {
  key: number;
  name: string;
  type: string;
};

function App() {
  const [compressedTypes, setCompressedTypes] = useState('');
  const [dbColumns, setDBColumns] = useState<DBColumnType[]>([]);
  const nextKey = useRef(0);

  const onInsert = (newName: string, newType: string): boolean => {
    setDBColumns(cur => {
      const nextState = [...cur, { key: nextKey.current, name: newName, type: newType }];
      setCompressedTypes(nextState.map(({ name, type }) => `('${name}', '${type}')`).join(', '));
      return nextState;
    });
    nextKey.current += 1;
    return true;
  };

  const onDelete = (key: number) => () => {
    setDBColumns(cur => {
      const nextState = cur.filter(col => col.key !== key);
      setCompressedTypes(nextState.map(({ name, type }) => `('${name}', '${type}')`).join(', '));
      return nextState;
    });
  };

  const columns = [
    {
      title: 'Column Name',
      dataIndex: 'name',
      width: '40%',
    },
    Table.EXPAND_COLUMN,
    {
      title: 'Column Type',
      dataIndex: 'type',
      key: 'type',
      width: '60%',
      ellipsis: true,
    },
    {
      render: (_: unknown, record: DBColumnType) => (
        <Popconfirm
          title='정말 삭제하시겠습니까?'
          placement='right'
          okText='삭제'
          cancelText='취소'
          onConfirm={onDelete(record.key)}>
          <Button danger type='link' icon={<MinusCircleOutlined />} />
        </Popconfirm>
      ),
      width: 50,
    },
  ];

  const expandedRowRender = (record: DBColumnType) => <pre className='code'>{makePretty(record.type)}</pre>;

  return (
    <div className='App'>
      <Title level={3}>Hive Database Columns Definition</Title>
      <DBColumnInsert onInsert={onInsert} />
      <Divider />
      <Title level={4}>Column List</Title>
      <Table
        dataSource={dbColumns}
        columns={columns}
        size='small'
        pagination={{ pageSize: 5 }}
        expandable={{
          expandedRowRender,
          rowExpandable: record => !primitiveTypes.includes(record.type) && record.type.length > 20,
        }}
      />
      <Divider />
      <Title level={4}>Compressed String</Title>
      <Text className='compressed-str' code copyable>
        {compressedTypes || 'empty'}
      </Text>
    </div>
  );
}

export default memo(App);
