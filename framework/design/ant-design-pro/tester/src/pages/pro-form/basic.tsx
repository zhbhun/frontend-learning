import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ProForm,
  ProFormCascader,
  ProFormDateRangePicker,
  ProFormDigit,
  ProFormMoney,
  ProFormSelect,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-layout';
import { message, TreeSelect } from 'antd';
import React, { useRef } from 'react';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

const treeData = [
  {
    title: 'Node1',
    value: '0-0',
    key: '0-0',
    children: [
      {
        title: 'Child Node1',
        value: '0-0-0',
        key: '0-0-0',
      },
    ],
  },
  {
    title: 'Node2',
    value: '0-1',
    key: '0-1',
    children: [
      {
        title: 'Child Node3',
        value: '0-1-0',
        key: '0-1-0',
      },
      {
        title: 'Child Node4',
        value: '0-1-1',
        key: '0-1-1',
      },
      {
        title: 'Child Node5',
        value: '0-1-2',
        key: '0-1-2',
      },
    ],
  },
];

export default () => {
  const formRef = useRef<
    ProFormInstance<{
      name: string;
      company?: string;
      useMode?: string;
    }>
  >();
  return (
    <PageContainer>
      <div style={{ padding: '20px 30px', backgroundColor: '#fff' }}>
        <ProForm<{
          name: string;
          company?: string;
          useMode?: string;
        }>
          onFinish={async (values) => {
            await waitTime(2000);
            console.log(values);
            const fieldValue = await formRef.current?.getFieldValue?.(['contract', 'createTime']);
            console.log('getFieldValue:', fieldValue);
            const fieldFormatValue = await formRef.current?.getFieldFormatValue?.([
              'contract',
              'createTime',
            ]);
            console.log('getFieldFormatValue:', fieldFormatValue);
            const fieldFormatValueObject = await formRef.current?.getFieldFormatValueObject?.([
              'contract',
              'createTime',
            ]);
            console.log('getFieldFormatValueObject:', fieldFormatValueObject);
            const fieldsValue = await formRef.current?.getFieldsValue();
            console.log('getFieldsValue:', fieldsValue);
            const fieldsFormatValue = await formRef.current?.getFieldsFormatValue?.();
            console.log('getFieldsFormatValue:', fieldsFormatValue);
            const val1 = await formRef.current?.validateFields();
            console.log('validateFields:', val1);
            const val2 = await formRef.current?.validateFieldsReturnFormatValue?.();
            console.log('validateFieldsReturnFormatValue:', val2);
            message.success('提交成功');
          }}
          formRef={formRef}
          params={{ id: '100' }}
          formKey="base-form-use-demo"
          dateFormatter={(value, valueType) => {
            console.log('---->', value, valueType);
            return value.format('YYYY/MM/DD HH:mm:ss');
          }}
          request={async () => {
            await waitTime(100);
            return {
              name: '蚂蚁设计有限公司',
              useMode: 'chapter',
            };
          }}
          autoFocusFirstInput
        >
          <ProForm.Group>
            <ProFormText
              width="md"
              name="name"
              required
              addonBefore={<a>客户名称应该怎么获得？</a>}
              addonAfter={<a>点击查看更多</a>}
              label="签约客户名称"
              tooltip="最长为 24 位"
              placeholder="请输入名称"
              rules={[{ required: true, message: '这是必填项' }]}
            />
            <ProFormText width="md" name="company" label="我方公司名称" placeholder="请输入名称" />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormDigit name="count" label="人数" width="lg" />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              name={['contract', 'name']}
              width="md"
              label="合同名称"
              placeholder="请输入名称"
            />
            <ProFormDateRangePicker
              width="md"
              name={['contract', 'createTime']}
              label="合同生效时间"
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormSelect
              options={[
                {
                  value: 'chapter',
                  label: '盖章后生效',
                },
              ]}
              readonly
              width="xs"
              cacheForSwr
              name="useMode"
              label="合同约定生效方式"
            />
            <ProFormSelect
              width="xs"
              options={[
                {
                  value: 'time',
                  label: '履行完终止',
                },
              ]}
              name="unusedMode"
              label="合同约定失效方式"
            />
            <ProFormMoney
              width="md"
              name="money"
              label="合同约定金额"
              fieldProps={{
                numberPopoverRender: true,
              }}
            />
          </ProForm.Group>
          <ProFormText width="sm" name="id" label="主合同编号" />
          <ProFormText
            name="project"
            width="md"
            disabled
            label="项目名称"
            initialValue="xxxx项目"
          />
          <ProFormText width="xs" name="mangerName" disabled label="商务经理" initialValue="启途" />
          <ProFormCascader
            width="md"
            request={async () => [
              {
                value: 'zhejiang',
                label: '浙江',
                children: [
                  {
                    value: 'hangzhou',
                    label: '杭州',
                    children: [
                      {
                        value: 'xihu',
                        label: '西湖',
                      },
                    ],
                  },
                ],
              },
              {
                value: 'jiangsu',
                label: 'Jiangsu',
                children: [
                  {
                    value: 'nanjing',
                    label: 'Nanjing',
                    children: [
                      {
                        value: 'zhonghuamen',
                        label: 'Zhong Hua Men',
                      },
                    ],
                  },
                ],
              },
            ]}
            name="areaList"
            label="区域"
            initialValue={['zhejiang', 'hangzhou', 'xihu']}
            addonAfter={'qixian'}
          />
          <ProFormTreeSelect
            initialValue={['0-0-0']}
            label="树形下拉选择器"
            width={600}
            request={async () => treeData}
            fieldProps={{
              fieldNames: {
                label: 'title',
              },
              treeCheckable: true,
              showCheckedStrategy: TreeSelect.SHOW_PARENT,
              placeholder: 'Please select',
            }}
          />
        </ProForm>
      </div>
    </PageContainer>
  );
};
