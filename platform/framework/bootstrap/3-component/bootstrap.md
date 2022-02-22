# 变量
- 盒模型

    - border-radius

        - small: px;
        - base: 4px;
        - large: 6px;

    - padding

        - xs: 1px 5px;
        - small: 5px 10px;
        - base: 6px 12px;
        - large: 10px 16px;

- 颜色

    - gray

        - gray-base: #000;
        - gray-darker: #222;// lighten(@gray-base, 13.5%); 20%);
        - gray-drak: #333; // lighten(@gray-base,
        - gray: #555; // lighten(@gray-base, 33.5%);
        - gray-light: #777; // lighten(@gray-base, 46.7%);
        - gray-lighter: #eee; // lighten(@gray-base, 93.5%);

    - brand

        - brand-primary: darken(#428bca, 6.5%); // #337ab7
        - brand-success: #5cb85c;
        - brand-info: #5bc0de;
        - brand-warning: #f0ad4e;
        - brand-danger: #d9534f;

    - body

        - body-bg: #fff;
        - text-color: @gray-dark

    - link

        - link-color: @brand-primary;
        - link-hover-color: darken(@link-color, 15%);

- 文本

    - line-height

        - base: 1.428571429
        - computed: 20px
        - large: 1.3333333
        - small: 1.5

- 字体

    - font-family

        - sans-serif: Helvetica Neue", Helvetica, Arial, sans-serif;
        - serif: Georgia, "Times New Roman", Times, serif;
        - monospace: Menlo, Monaco, Consolas, "Courier New", monospace;
        - base: @font-family-sans-serif;

    - font-size

        - base: 14px;
        - large: ceil((@font-size-base * 1.25)); // 18px;
        - small:  ceil((@font-size-base * 0.85)); // 12px;
        - h1: floor((@font-size-base * 2.6)); // 36px;
        - h2: floor((@font-size-base * 2.15)); // 30px
        - h3: ceil((@font-size-base * 1.7)); // 24px
        - h4: ceil((@font-size-base * 1.25)); // 18px
        - h5: @font-size-base; // 14px
        - h6: ceil((@font-size-base * 0.85)); // 12px
