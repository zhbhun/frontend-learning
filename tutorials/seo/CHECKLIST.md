# SEO 优化清单

“SEO 优化清单”是一个详尽的规则列表，列出了作为前端开发人员应该检查或至少应该注意的要素，并应用于你的项目。对于每条规则，都将有一段解释为什么这条规则是重要的，以及你如何能满足它。每个规则按照对 SEO 优化影响的重要性，划分了 3 个级别的优先权。

- 🟢 ：低优先级（有会更好）；
- 🟡 ：中等优先级（建议满足）；
- 🔴 ：高优先级（必须满足）。

## 工具

- [ ] 🔴 **安装 [Google Analytics](https://analytics.google.com/analytics/web/)**
- [ ] 🔴 **设置 [Google Search Console](https://search.google.com/search-console)**

    为什么：

    > Google Search Console 是一项由 Google 提供的免费服务，可帮助您监控和维护您的网站在 Google 搜索结果中的展示情况以及排查问题。

    怎么做：

    > 添加站点地图 =》 确认网页爬虫覆盖率 =》 持续观察 SEO 效果

    - [Search Console 简介](https://support.google.com/webmasters/answer/9128668?hl=zh-Hans)
    - [Search Console 使用入门](https://support.google.com/webmasters/answer/9128669)

- [ ] 🔴 **使用 SEO 审查工具来检查网页**

    为什么：

    > SEO 审查工具可以自动扫描网页，检查我们遗漏处理的优化点。

    怎么做：

    > 使用 Chrome 开发者工具里的 Lighthouse 检查每个网页的 SEO，得到评分和优化建议并执行。

    - [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)

## 技术

- [ ] 🔴 **使用 SSR 或 SSG**
- [ ] 🔴 **使用 HTTPS**

    为什么：

    > HTTPS 不仅适用于电子商务网站，也适用于所有存在数据传递的网站。如今的现代浏览器对于不安全的网站在许多功能上做了些限制。 例如：如果网站未使用 HTTPS，则地理定位，推送通知和服务工作程序等功能会不起作用。今天设置和使用 SSL 证书比以前容易得多([Let's Encrypt](https://letsencrypt.org/)能提供免费的https服务).

    - [Why Use HTTPS? | Cloudflare](https://www.cloudflare.com/learning/security/why-use-https/)
    - [HTTP vs HTTPS — Test them both yourself](https://www.httpvshttps.com/)

- [ ] 🔴 **缓存静态资源**：一个页面应该对所有的静态资源使用缓存头，这可以加快你的网站在下一次返回的访问者到达你的网站。
- [ ] 🔴 **压缩静态资源**：将代码中的注释、空格和新行从生产文件中删除。

    为什么：

    > 删除所有不必要的空格、注释和中断行将减少HTML的大小，加快网站的页面加载时间，并显著减少用户的下载时间。

    怎么做：

    > 大多数框架都有插件用来压缩静态资源的体积。

    - [HTML minifier | Minify Code](http://minifycode.com/html-minifier/)
    - [Experimenting with HTML minifier — Perfection Kills](http://perfectionkills.com/experimenting-with-html-minifier/#use_short_doctype)
    为什么：

- [ ] 🔴 **优化图片**

    为什么：

    > 图片往往是网页上下载的最大部分，并且占据了相当大的可视区域。因此，图像优化通常可以节省最大的字节量，并为网站实现显著的性能改善。

    怎么做：

    > 1. 选择正确的图像格式
    >     - 使用视频代替 gif，参见 [Replace animated GIFs with video for faster page loads](https://web.dev/replace-gifs-with-videos/)
    >     - 使用压缩率更高的格式，例如：webp 或 avif 
    > 2. 使用压缩工具将图片优化到合适的压缩级别，例如：https://tinypng.com/、Imagemin 和 ImageOptim
    > 3. 使用响应式图片标签 picture

    - [web.dev Fast load times - Optimise your images](https://web.dev/fast/#i18n.paths.fast.topics.optimize_your_images)

## 元信息

- [ ] 🔴 **favicons**：Favicons 是出现在浏览器地址栏、页面标签和书签菜单中的小图标。

    为什么：

    > 你的网站应该使用并正确设置一个 favicon，这有助于打造你的网站品牌，并使用户在书签列表中轻松导航到你的网站。

    怎么做：

    > Favicon 通常是一个 16×16 像素的图标，以 ICO 文件的形式存储（不过也支持gif和png）。
    > 
    > 1. 确保你的网站每个页面都有一个图标
    > 
    > 2. 可以使用一些工具来为你的网站生成 favicons。
    >
    > 3. 确保图标的大小在调整到非常小的时候也能保持可感知性。
    >
    > 4. 尽量保持图标的简单性（不要使用逼真的图标，最多两种颜色，等等） 

    - https://www.favicon-generator.org/
    - https://realfavicongenerator.net/

- [ ] 🔴 **网页关键词**
- [ ] 🔴 **网页描述信息**

    为什么：

    > description 为你的网页提供一个简短而准确的摘要。搜索引擎使用元描述来帮助识别页面的主题--他们也可能通过在搜索引擎结果中直接显示元描述来使用元描述。准确和诱人的元描述可以帮助提高你的搜索引擎排名和用户点击进入你的页面的可能性。

    怎么做：

    > ` <meta name="description" content="这是对这个页面及其内容的描述。" >`

- [ ] 🔴 **网页标题**：文档标题是一个 HTML 标签 —— `<title>`，定义了一个页面的标题。这个标签的内容在搜索引擎结果中显示一个页面的标题，在用户浏览器的标签页显示。

    为什么：

    > 网页标题的内容可能对搜索引擎优化有重大影响，应谨慎选择。一个简洁的、有意义的、描述性的、能准确反映你的页面主题的标题标签，对于在搜索引擎中获得良好的排名非常重要。

    怎么做：

    > 一个页面的标题最好能唯一地识别该页面。
    >
    > - 每页使用一个独特的、描述性的标题（最多 65 个字符）。搜索引擎通常会显示一个页面标题的前 55-60 个字符。超过这个长度的文字可能会丢失，所以尽量不要让标题超过这个长度。如果你必须使用较长的标题，请确保重要的部分在前面，而且标题中没有任何关键的部分可能会被删除。
    > - 在标题标签中使用该页的关键词，但不要使用 "关键词组合"。如果你的标题只是一个单词的列表，算法往往会降低你的页面在搜索结果中的位置。
    > - 尽量确保你的标题在你自己的网站内尽可能的独特。重复的或接近重复的标题会导致不准确的搜索结果。

- [ ] 🟡  **开放图谱协议**：Open Graph Protocol（开放图谱协议），简称 OG 协议，是一种互联网协议，最初由 Facebook 创建，用于标准化网页中元数据的使用，使得社交媒体得以以丰富的“图形”对象来表示共享的页面内容。像飞书、WhatsApp、Twitter、Facebook 等社交软件，都会根据链接去抓取你给定 URL 的内容，以确定要包含哪些属性来进行共享展示。

    为什么：

    > 我们知道，构建内容和维护网站通常可能需要耗费大量时间，我们当然希望自己的内容能够在社交分享时能够脱颖而出。在没有开放图谱协议时：此时社交软件正确地获取了页面的标题和描述，但它所含有的信息有限，看起来并不诱人。有开放图谱协议时：可以显示丰富而有效的信息将有助于鼓励人们点击查看你的内容。

    怎么做：

    > 最佳做法是使用这 5 个属性：og:url、og:title、og:description、og:images 和 og:type

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta property="og:title" content="The Rock" />
      <meta property="og:type" content="video.movie" />
      <meta property="og:url" content="https://example.com/" />
      <meta property="og:image" content="https://example.com/image.png" />
    </head>
    <body>
      ...
    </body>
    </html>
    ```

    - [前端应该知道的：开放图谱协议（The Open Graph protocol）](https://segmentfault.com/a/1190000040863000)

## 链接

- [ ] 🔴 **SEO 友好链接**：为了使 URL 和链接对搜索引擎友好，它们应该**包含与页面主题相关的关键词**，并且**不包含空格、下划线或其他字符**。你应该尽可能**避免使用参数**，因为它们使 URL 不容易吸引用户点击或分享。搜索引擎对 URL 结构的**建议指定使用连字符或破折号（-）而不是下划线（_）**。与下划线不同的是，搜索引擎将连字符视为 URL 中单词之间的分隔符。
- [ ] 🔴 **Canonicalization**

    为什么：

    > 规范化描述了一个网站如何对同一个页面使用略有不同的URL（例如，如果 http://www.example.com 和 http://example.com 显示同一个页面，但不解析为同一个URL）。如果发生这种情况，搜索引擎可能不确定哪个 URL 是正确的索引。

    怎么做：

    > 网站是否可以通过不同的 URL 访问？是否在所有的页面中正确放置了规范链接？
    >
    > `<link href="https://example.com/" rel="canonical" />`

- [ ] 🟡 **设置反向链接**：反向链接是指从外部网站到你的网站的任何链接。

    为什么：

    > 来自权威网站的相关反向链接对提高搜索引擎排名很有帮助。

    怎么做：

    > 在相关目录中注册网站；寻找可以放置反向链接的高质量网站。

- [ ] 🟡 **避免破损链接**：你的网站不应该有任何破损或死链接。

    为什么：

    > 破损的链接会对用户体验产生负面影响，并损害你的网站在搜索引擎中的整体排名。

    怎么做：

    > 定期扫描你的网站，找出内部断链（指向你的网站内部）和外部断链（指向你的网站外部）。

- [ ] 🟡 **描述性链接**：链接文本是超链接中可点击的单词或短语。当链接文本清楚地传达超链接的目标时，用户和搜索引擎都可以更轻松地了解您的内容以及它与其他页面的关系。

    - [Links do not have descriptive text](https://web.dev/link-text/)


- [ ] 🟡 **nofollow**：为了获得良好的搜索排名，请确保为你不希望搜索引擎跟踪的外部链接（指向不属于你的网站的链接）添加 "nofollow "属性。

    `<a href="http://example.com" rel="nofollow">Example Website</a>`

- [ ] 🟢 **社交链接**：一个页面应该连接到一个或多个流行的社交网络

    为什么：
    
    > 社交信息作为搜索引擎的排名因素已经变得越来越重要，以验证网站的可信度和权威性。

    怎么做

    > 链接到社会媒体；使用分享选项。

## 内容

- [ ] 🔴 **使用语义化标签**；语义标签（Semantic Tags）向每个人清楚地描述了它们所包含的内容的含义，并且使搜索引擎和网络爬虫更容易有效地搜索信息。
- [ ] 🔴 **创造有意义和独特的内容**

    为什么：

    > 如果你有多个页面有相同的内容（或者你在其他人的网站上有你的内容），你将有被搜索引擎惩罚的风险，你的搜索排名将受到影响。

    怎么做：创造有意义和独特的内容；每页至少使用 300 字；使用不同的媒体类型（视频/视觉/图表/表格/信息图）；检查与你所写的主题相关的关键词。

- [ ] 🔴 **实现扁平化的页面结构**

    为什么：

    > 每个网站有多少页面被搜索引擎抓取是由 PageRank 决定的，PageRank 越高，抓取预算就越大。抓取预算还决定了网站最重要的页面被抓取的频率以及深度抓取的频率。

    怎么做：

    > 实现扁平化的页面结构，通向子页面的路径尽可能短，只需要点击几下（导航结构）；
    > 
    > 对最重要的页面进行非常好的内部链接。对有许多反向链接的页面进行内部链接，这些页面将被更频繁地抓取；
    >
    > 通过 Robots.txt 排除不重要的页面的抓取（如登录页面、联系表格、图片）；
    >
    > 使用元数据排除抓取（noindex、nofollow）；
    > 
    > 提供带有最重要子页面的 URL 列表的 XML 网站地图。

- [ ] 🔴 **提供错误页面**
- [ ] 🔴 **正确设置标题标签**：HTML 标题标签是你想在网页上显示的标题或字幕。

    为什么：

    > 标题标签对用户来说是不可见的，但有助于向搜索引擎阐明和支持你网页的整体主题或目的。

    怎么做：

    > H1 标签代表最重要的标题，例如，页面或博客文章的标题。H2 标签代表网页上第二重要的标题，例如，副标题。
    >
    > 1. 在每个页面（可见）使用一个单独的H1，包含主要关键词；
    > 
    > 2. 在每个页面上使用一个单独的 H2、H3 和 H4 标签；
    >
    > 3. 避免一个页面上有太多的标题标签，会使用户和搜索引擎难以扫描内容并确定一个主题的结束和另一个主题的开始。

- [ ] 🔴 **给 img 标签设置正确的 alt 属性**

    为什么：

    > 图像 alt 描述是书面文本，在图像无法显示的情况下（例如，由于图像源被破坏，互联网连接速度慢，等等），它将代替图像出现。ALT 属性提供了替代信息，它使搜索引擎能够更好地抓取和排名网站。在 alt 属性中使用相关的关键词和文本可以帮助用户和搜索引擎更好地解释图片的主题。

    怎么做：

    > 在 img 标签中使用带关键词的描述性文件名作为图片的 alt 属性值。
    > 
    > `<img src="img/a_cat_picture.jpg" alt="一张可爱的猫咪图片">`。


## 爬虫

- [ ] 🔴 **robots**：robots.txt 文件规定了搜索引擎抓取工具可以访问您网站上的哪些网址，此文件主要用于避免您的网站收到过多请求；它并不是一种阻止抓取某个网页的机制。若想阻止爬虫访问某个网页，请使用 noindex 禁止将其编入索引，或使用密码保护该网页。

    ```
    Sitemap: https://www.yourwebsite.ch/sitemap.xml
    User-agent: *
    Disallow: /kasse
    Disallow: /cart
    Disallow: /account
    ```

- [ ] 🔴 **sitemap.xml**：sitemap.xml 是站点地图文件，可以在其中提供与网站中的网页、视频或其他文件有关的信息，还可以说明这些内容之间的关系。

    为什么

    > 网站地图很重要，因为它列出了网站的所有网页，让搜索引擎爬虫更智能地抓取网站。

    怎么做

    > 有两种不同类型的网站地图，搜索引擎可以检查。
    >
    > 1. XML格式：包含整个网站地图，不经常被谷歌检查
    > 2. Atom/RSS格式：包含小型网站更新，经常被Google检查

- [ ] 🔴 **使用 noindex 阻止搜索引擎编入索引**：可以通过在 HTTP 响应中包含 noindex 元标记或标头，阻止网页或其他资源显示在 Google 搜索中。当 Googlebot 下次抓取该网页并发现该标记或标头时，Google 就会完全阻止该网页出现在 Google 搜索结果中，不论是否有其他网站链接到该网页。

    ```html
    <meta name="robots" content="noindex" />
    ```

    或

    ```
    HTTP/1.1 200 OK
    (…)
    X-Robots-Tag: noindex
    (…)
    ```

    - [漫游器元标记、data-nosnippet 和 X-Robots-Tag 规范](https://developers.google.com/search/docs/advanced/robots/robots_meta_tag?hl=zh-cn)

## 参考

- [renuo/seo-checklist](https://github.com/renuo/seo-checklist)
- [flowforfrank/seo-checklist](https://github.com/flowforfrank/seo-checklist)
- [Search Engine Optimization (SEO) Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide?visit_id=637928671469508903-1489311570&rd=1)
- [Search Engine Optimization | ahrefs](https://ahrefs.com/seo)
- [The Only SEO Checklist You Need](https://ahrefs.com/blog/seo-checklist/)
