- 1. 查找计分元素

    1. 删除不可见的元素
    2. 删掉署元素
    3. 删掉重复的标题
    4. 删除可排除的的元素：

        - id 或类属性里包含：`/-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i`
        - role 属性包含：`/menu|menubar|complementary|navigation|alert|alertdialog|dialog/`

    5. 删除空元素

        DIV、SECTION、HEADER、H1、H2、H3、H4、H5、H6

    5. 对 div 元素做特殊处理

        将不包含块元素的 div 转换为 p 标签

    6. 将匹配的元素加入到计分元素队列

        section,h2,h3,h4,h5,h6,p,td,pre

- 2. 计算积分元素的祖先得分
- 3. 筛选满足条件的目标元素
