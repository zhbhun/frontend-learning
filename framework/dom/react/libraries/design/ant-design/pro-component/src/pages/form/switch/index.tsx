import {
  ProForm,
  ProFormGroup,
  ProFormSwitch,
  ProFormText,
  ProFormFieldSet,
  ProFormList,
  ProFormSelect,
  BetaSchemaForm,
  ProFormField,
} from "@ant-design/pro-form";
import { CloseCircleOutlined, SmileOutlined } from "@ant-design/icons";

export default () => {
  return (
    <>
      <ProForm
        layout="horizontal"
        onValuesChange={(values: any) => {
          console.log(values);
        }}
      >
        <ProFormField
          valueType="text"
          dataIndex="x"
          label="X"
          colon={false}
          extra={123}
          initialValue={true}
          labelAlign="left"
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 3 }}
          fieldProps={{ size: "small" }}
        />
        <div>
          <h2>Form.Item</h2>
          <ProFormSwitch
            name="a"
            label="A"
            colon={false}
            extra={123}
            initialValue={true}
            labelAlign="left"
            labelCol={{ span: 12 }}
            wrapperCol={{ span: 12 }}
            valuePropName="checked"
            fieldProps={{ size: "small" }}
          />
          <ProFormSwitch
            name="b"
            hidden
            label="B"
            colon={false}
            extra={123}
            valuePropName="checked"
          />
        </div>
        <div>
          <h2>Addon</h2>
          <ProFormText
            name="addonBefore"
            label="addonBefore"
            addonBefore="addonBefore"
            fieldProps={{
              addonBefore: "123",
            }}
          />
          <ProFormText
            name="addonAfter"
            label="addonAfter"
            addonAfter="addoneBefore"
            fieldProps={{
              addonAfter: "123",
            }}
          />
        </div>
        <div>
          <h2>Width</h2>
          <ProFormText name="wdith-default" label="default" />
          <ProFormText name="wdith-100" label="100" width={100} />
          <ProFormText name="wdith-xs" label="xs" width="xs" />
          <ProFormText name="wdith-sm" label="sm" width="sm" />
          <ProFormText name="wdith-md" label="md" width="md" />
          <ProFormText name="wdith-lg" label="lg" width="lg" />
          <ProFormText name="wdith-xl" label="xl" width="xl" />
        </div>
        <ProFormGroup collapsible title="Group" size={100} align="center">
          <ProFormText
            name="grid0"
            label="grid0"
            colProps={{
              span: 24,
            }}
          />
          <ProFormText
            name="grid1"
            label="grid1"
            colProps={{
              span: 8,
            }}
          />
          <ProFormText
            name="grid2"
            label="grid2"
            colProps={{
              span: 8,
            }}
          />
          <ProFormText
            name="grid3"
            label="grid3"
            colProps={{
              span: 8,
            }}
          />
        </ProFormGroup>
        <ProFormFieldSet name="set" label="ProFormFieldSet">
          <ProFormText width="md" />
          <ProFormSelect
            width="md"
            request={async () => [
              { label: "全部", value: "all" },
              { label: "未解决", value: "open" },
              { label: "已解决", value: "closed" },
              { label: "解决中", value: "processing" },
            ]}
            name="useMode"
            label="合同约定生效方式"
          />
          <ProFormText width="md" />
        </ProFormFieldSet>
        <ProFormList
          name="labels"
          label="用户信息"
          initialValue={[
            {
              value: "333",
              label: "333",
            },
          ]}
          copyIconProps={{ Icon: SmileOutlined, tooltipText: "复制此行到末尾" }}
          deleteIconProps={{
            Icon: CloseCircleOutlined,
            tooltipText: "不需要这行了",
          }}
        >
          <ProFormGroup key="group">
            <ProFormText name="value" label="值" />
            <ProFormText name="label" label="显示名称" />
          </ProFormGroup>
        </ProFormList>
      </ProForm>
      <div>
        <h2>Form Grid</h2>
        <ProForm
          grid
          rowProps={{
            gutter: 100,
          }}
          layout="horizontal"
          onValuesChange={(values: any) => {
            console.log(values);
          }}
        >
          <ProFormText
            name="grid0"
            label="grid0"
            colProps={{
              span: 24,
            }}
          />
          <ProFormText
            name="grid1"
            label="grid1"
            colProps={{
              span: 8,
            }}
          />
          <ProFormText
            name="grid2"
            label="grid2"
            colProps={{
              span: 8,
            }}
          />
          <ProFormText
            name="grid3"
            label="grid3"
            colProps={{
              span: 8,
            }}
          />
          <ProFormGroup
            grid
            rowProps={{
              gutter: 10,
            }}
            colProps={{
              span: 8,
            }}
            collapsible
            title="xxx"
          >
            <ProFormText
              name="grid0"
              label="grid0"
              colProps={{
                span: 24,
              }}
            />
            <ProFormText
              name="grid1"
              label="grid1"
              colProps={{
                span: 8,
              }}
            />
            <ProFormText
              name="grid2"
              label="grid2"
              colProps={{
                span: 8,
              }}
            />
            <ProFormText
              name="grid3"
              label="grid3"
              colProps={{
                span: 8,
              }}
            />
          </ProFormGroup>
          <BetaSchemaForm<any>
            layoutType="Embed"
            layout="vertical"
            grid
            rowProps={{ gutter: 100 }}
            colProps={{ span: 20 }}
            title="Schema Form"
            columns={[
              {
                title: "创建时间",
                key: "showTime",
                dataIndex: "createName",
                valueType: "date",
              },
              {
                title: "分组",
                valueType: "group",
                columns: [
                  {
                    title: "状态",
                    dataIndex: "groupState",
                    valueType: "select",
                    width: "xs",
                    valueEnum: {
                      all: { text: "全部", status: "Default" },
                      open: {
                        text: "未解决",
                        status: "Error",
                      },
                      closed: {
                        text: "已解决",
                        status: "Success",
                        disabled: true,
                      },
                      processing: {
                        text: "解决中",
                        status: "Processing",
                      },
                    },
                  },
                  {
                    title: "标题",
                    width: "md",
                    dataIndex: "groupTitle",
                    formItemProps: {
                      rules: [
                        {
                          required: true,
                          message: "此项为必填项",
                        },
                      ],
                    },
                  },
                  {
                    title: "标题",
                    width: "md",
                    dataIndex: "custom",
                    valueType() {
                      return <input />;
                    },
                    formItemProps: {
                      rules: [
                        {
                          required: true,
                          message: "此项为必填项",
                        },
                      ],
                    },
                  },
                ],
              },
            ]}
          />
        </ProForm>
      </div>
    </>
  );
};
