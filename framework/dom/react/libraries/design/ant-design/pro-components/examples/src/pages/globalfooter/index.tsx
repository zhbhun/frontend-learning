import React from "react";
import { Button } from "antd";
import GlobalFooter from "@ant-design/pro-layout/es/components/GlobalFooter";

export default () => {
  return (
    <div>
      <Button>123</Button>
      <GlobalFooter
        links={[
          {
            title: "a",
            href: "https://m.baidu.com",
            blankTarget: true,
          },
        ]}
        copyright="xxx"
      />
    </div>
  );
};
