import ProField, { FieldText } from "@ant-design/pro-field";

export default () => {
  return (
    <>
      <div>
        <div>read</div>
        <div>
          <FieldText
            label="read label"
            text="read text"
            mode="read"
            plain
            light
            fieldProps={{ value: "123 " }}
          />
        </div>
      </div>
      <div>
        <div>edit</div>
        <div>
          <FieldText
            label="edit label"
            text="edit text"
            mode="edit"
            plain
            light
            fieldProps={{ value: "123 " }}
          />
        </div>
      </div>
      <div>
        <div>update</div>
        <div>
          <FieldText
            label="update label"
            text="update text"
            mode="update"
            plain
            light
            fieldProps={{ value: "123 " }}
          />
        </div>
      </div>
      <div>
        <div>ProField</div>
        <div>
          <ProField
            valueType="text"
            label="update label"
            text="update text"
            mode="update"
            plain
            light
            fieldProps={{ value: "123 " }}
          />
        </div>
      </div>
    </>
  );
};
