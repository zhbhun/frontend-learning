import React, { useState } from "react";
import { Table } from "antd";
import type { SortOrder } from "antd/lib/table/interface";
import type { ColumnsType, TableProps } from "antd/lib/table";

interface DataType {
  key: React.Key;
  name: string;
  chinese: number;
  math: number;
  english: number;
}

const data: DataType[] = [
  {
    key: "1",
    name: "John Brown",
    chinese: 98,
    math: 60,
    english: 70,
  },
  {
    key: "2",
    name: "Jim Green",
    chinese: 98,
    math: 66,
    english: 89,
  },
  {
    key: "3",
    name: "Joe Black",
    chinese: 98,
    math: 90,
    english: 70,
  },
  {
    key: "4",
    name: "Jim Red",
    chinese: 88,
    math: 99,
    english: 89,
  },
];

const App: React.FC = () => {
  const [sorter, setSorter] = useState<{
    [key: string]: SortOrder | undefined;
  }>({
    chinese: "ascend",
  });

  const columns: ColumnsType<DataType> = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Chinese Score",
      dataIndex: "chinese",
      sorter: {
        compare: (a, b) => a.chinese - b.chinese,
        multiple: 3,
      },
      sortOrder: sorter["chinese"],
    },
    {
      title: "Math Score",
      dataIndex: "math",
      sorter: {
        compare: (a, b) => a.math - b.math,
        multiple: 2,
      },
      sortOrder: sorter["math"],
    },
    {
      title: "English Score",
      dataIndex: "english",
      sorter: {
        compare: (a, b) => a.english - b.english,
        multiple: 1,
      },
      sortOrder: sorter["english"],
    },
  ];

  const onChange: TableProps<DataType>["onChange"] = (
    pagination,
    filters,
    sorter,
    extra
  ) => {
    console.log("params", pagination, filters, sorter, extra);
    if (sorter && (Array.isArray(sorter) ? sorter[0] : sorter.column)) {
      setSorter(
        (Array.isArray(sorter) ? sorter : [sorter]).reduce(
          (rcc: { [key: string]: SortOrder | undefined }, item) => {
            rcc[item.field as string] = item.order;
            return rcc;
          },
          {}
        )
      );
    } else {
      setSorter({});
    }
  };

  return (
    <div className="container mx-auto">
      <Table columns={columns} dataSource={data} onChange={onChange} />
      <div className="mt-1">{JSON.stringify(sorter)}</div>
    </div>
  );
};

export default App;
