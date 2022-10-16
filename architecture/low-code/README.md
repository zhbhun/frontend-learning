# 低代码

- [awesome-lowcode](https://github.com/taowen/awesome-lowcode)

## 定义

- [Discuz! 创始人戴志康：低代码不适合做什么？](https://mp.weixin.qq.com/s/tCE_IB-vd5jCVzwy4z6idg)
- [从 no-code 到 low-code 再到 pro-code](https://blog.csdn.net/peter7_zhang/article/details/114381474)
- [到底无代码和低代码有什么区别？](https://zhuanlan.zhihu.com/p/437162737)

### 是什么

> 只要能帮我们少写代码的技术或者产品，都称为低代码。

- 广义：低代码跟程序员使用的开发框架（如java的spring，python的django，go的gin）都是一样，抽出可复用的内容
- 狭义：低代码应该是更高层的低代码（如页面拖拉拽就能做出一个网站）

### 发展趋势

- 平台化：更强大、全面的低代码服务能力，一体化的交付平台
 
    独立的低代码厂商，比如 Airtable、伙伴云、明道云、轻流，思路是用低代码的方式直接服务于企业的数字化转型。基于这类平台，客户可以根据自己的需求随心所欲搭建内部系统，比如 CRM、售后系统、工单系统。

- 垂直化：专注于某一低代码场景、做精、深耕业务及服务能力

    型代表是 Salesforce，它们先是用开箱即用、近乎标准化的产品解决客户的某个痛点问题，比如客户管理。但你也知道，To B 领域，不同规模、不同行业的企业，需求大相径庭。所以，SaaS 类的产品在进入深水区后，都希望用低代码的能力（一般他们叫 aPaaS），更高效率地为客户交付定制化需求。

- 融合化：提供强大的适配能力及与 RPA、AI 的有机融合
- 云原生：两者目标相似，可以让低代码更关注业务应用

### 存在问题

- 为啥高层低代码一直发展不起来呢？

    越高层，它的可复用性就更低了，而开发它的成本更高，就是因为它的可复用性降低了，所以才需要找“某一个低代码场景”。

    - 成本：越高层，封装越多，成本更高，灵活度越低，高层低代码是可以存在的，但要找到一个复用性更高的场景（就是因为它的可复用性降低了，所以才需要找“某一个低代码场景”），带来的效果能节省更多的成本，不然得不偿失。
    - 变化：有变化之后，“高层低代码”需要做多大的改动才能适配，业务的场景是会变化的，还有流行的开发框架、开发语言都在变。

    总结，低代码有代价也有收益，成本包括一次性成本(设计开发)和增量成本(复用集成，维护升级)，收益有两个变量：复用度(复用的次数)和衰减率(需求变化速度及最终废弃)。抛开具体企业和行业的这两个因素非说低代码有用或没用是没意义的。

- 平台化 VS 垂直化

    > 第一次使用伙伴云之类的低代码平台，我发现里面的热门应用模板有 CRM、进销存、OKR、人事管理。我惊呆了，这些应用，不都是有独立的 SaaS 公司在做吗？难道用低代码系统搭建出来的应用，能比外面某个垂直厂商做得好？就拿 CRM 来说，国内知名的产品有销售易、纷享销客等等。我很是好奇，什么样的客户会在低代码系统中搭建一个 CRM 系统出来。
    >
    > 一家做外贸的公司，规模不大，但对于 CRM 需求却非常个性化，它们卖皮革，每一块皮革都是一个单独的标号，SKU 特别多，销售流程也很特别。这时候，低代码平台就能很好解决他们的问题。也许某个 CRM 系统也能解决他们的问题，但这家外贸公司老板没舍得采购，因为加上定制化的需求，对于他们来说，成本太高了，并且，还有很多功能，他们压根用不上。
    >
    > 但必须也要承认，标准化的 CRM 系统，他们的价值之一是能够为客户交付一套方法论、一套理念。这类似于我们用飞书或者钉钉，表面上是为系统买单，实际上是在购买这些产品背后先进的协作理念。IT 系统，是方法论、价值观、流程的物理载体。
    >
    > 所以，对于低代码和垂直的 SaaS 产品，它们更多的是一种互补关系。举个例子，你往一个玻璃杯子里放石头，等石头塞满玻璃杯之后，你会发现其实玻璃杯中还有空隙。这时候，你还可以继续往装满石头的玻璃杯里倒入沙子。这些石头，就像是标准化的 SaaS 产品，而那些细碎的空隙，就是支持高度定制化的低代码系统。

- 低代码在和程序员抢饭碗。

    > ，低代码是可以替代一些增删改查的工作。但这不是挺好吗？难道真的有工程师就喜欢每天在那里重复写增删改查，喜欢别人叫他码农吗？不应该这样。工程师是艺术家，是有灵魂的人，大家的志向应该是写更有创造力的代码，而不是每天浪费生命在增删改查之上。少年心事当拿云。

    - [低代码平台似乎越来越成熟，前端程序员到底该往哪里深入学习才不会被替代，看完无远以及一些商城项目陷入迷茫了](https://v2ex.com/t/872578#reply33)

## 案例

- [简述国内几大无代码开发平台](https://zhuanlan.zhihu.com/p/141212899)
- [国内外几大无代码低代码平台评估](https://zhuanlan.zhihu.com/p/160026347)
- [开源低代码平台盘点，低代码开发真的能减少成本吗？](https://zhuanlan.zhihu.com/p/189595033)
- [Working Of Low-Code Development Platforms](https://www.softwaretestinghelp.com/low-code-development-platforms/#12_Mendix)
- [awesome-lowcode](https://github.com/HiJiangChuan/awesome-lowcode)

### 设计

- [Canva](https://www.canva.cn/) —— 网站、演示文稿、图片和视频
- [稿定](https://www.gaoding.com/)
- [创客贴](https://www.chuangkit.com/)
- [图怪兽](https://818ps.com/)

### 网站

---

移动端

- [gaoding](https://www.gaoding.com/)
- [qingzhan](https://www.qingzhan.com/)
- [易企秀](https://www.eqxiu.com/?type=home)
- [百度 H5](https://h5.bce.baidu.com/)
- [图怪兽](https://818ps.com/)

---

综合

- [钉钉宜搭](https://www.aliwork.com/)
- [微搭](https://cloud.tencent.com/product/weda)
- [爱速搭](https://suda.baidu.com/)
- [云凤蝶](https://www.yunfengdie.com/intro)
- [Zion](https://www.functorz.com/)
- [reactbricks](https://reactbricks.com/)
- [wordpress](https://wordpress.com/)
- [squarespace](https://www.squarespace.com/)
- [wix](https://editor.wix.com/)
- [Canva](https://www.canva.cn/) —— 网站、演示文稿、图片和视频

    - [Unveiling the Canva Visual Worksuite](https://www.canva.com/newsroom/news/unveiling-the-canva-visual-worksuite/)

- [webflow](https://webflow.com)
- [plasmic](https://studio.plasmic.app/)

    - [设计系统的未来](https://www.bilibili.com/video/BV1KG4y1x75q/?spm_id_from=333.337.search-card.all.click&vd_source=2e69ba889e556e858093542d78fc08c0)

- [Pinegrow](https://pinegrow.com/)
- [framer](https://www.framer.com/) - You’ve never made a website this fast before. Really.
- [dhiwise](https://app.dhiwise.com)
- [softr](https://www.softr.io/)
- [shopify](https://zh.shopify.com/)

---

开源

- [lowcode-engine](https://github.com/alibaba/lowcode-engine) - 一套面向扩展设计的企业级低代码技术体系
- [tmagic-editor](https://github.com/Tencent/tmagic-editor)
- [baidu/amis](https://github.com/baidu/amis) / [amis-editor-demo](https://github.com/aisuda/amis-editor-demo)
- [luban-h5](https://github.com/ly525/luban-h5)
- [page-pipepline/pipeline-editor](https://github.com/page-pipepline/pipeline-editor)

### App

- [flutterflow](https://app.flutterflow.io/create-account)

### To B

- [retool](https://retool.com/) - Stop wrestling with UI libraries, hacking together data sources, and figuring out access controls. Start shipping apps that move your business forward.
- [illa Family](https://github.com/illa-family) - Accelerate your internal tools development.
- [明道云](https://www.mingdao.com/home)

    - [什么是零代码开发平台，为什么企业IT应该重视？](https://blog.mingdao.com/11346.html)

### 设计稿转代码

- [builder](https://builder.io/)

    - [Figma to HTML, CSS, React & more! | Figma](https://www.figma.com/community/plugin/747985167520967365/Figma-to-HTML%2C-CSS%2C-React-%26-more!)

- [imgcook](https://www.imgcook.com)

    - [imgcook | Figma](https://www.figma.com/community/plugin/951438743886938495/imgcook)

- [code.fun](https://code.fun/)

    - [CodeFun | Figma](https://www.figma.com/community/plugin/1061186349406580230/CodeFun)

- [siter](https://app.siter.io/)
- [deco](https://deco-preview.jd.com/)
- [Picasso](https://github.com/wuba/Picasso)
- [蓝湖设计图一键生成](https://lanhuapp.com/dds?edm&utm_source=lanhu&utm_medium=mail&utm_campaign=dds&utm_term=20211129)
- [Sketch2Code](https://sketch2code.azurewebsites.net/)

参考文献

- [AI 助力中后台场景下的设计稿转代码](https://zhuanlan.zhihu.com/p/100806362)
- [设计稿（UI视图）自动生成代码方案的探索](https://tech.meituan.com/2021/03/25/ui2dsl-dsl2code.html)


### 其他

- [ToolJet](https://github.com/ToolJet/ToolJet) - Extensible low-code framework for building business applications. Connect to databases, cloud storages, GraphQL, API endpoints , Airtable, etc and build apps using drag and drop application builder. Built using JavaScript/TypeScript. 
- [rowy](https://github.com/rowyio/rowy) - https://github.com/rowyio/rowy
- [node-red](https://github.com/node-red/node-red) - Low-code programming for event-driven applications
- [erupts/erupt](https://github.com/erupts/erupt) - 纯 Java 注解，单个类文件，快速开发 Admin 管理后台。不生成任何代码、零前端代码、零 CURD、自动建表、注解式API、自定义服务逻辑，支持所有主流数据库，支持自定义页面，支持多数据源，提供二十几类业务组件，十几种展示形式，支持逻辑删除，动态定时任务，前端后端分离等。
- https://github.com/imcuttle/mometa
- [amplication](https://github.com/amplication/amplication) - Amplication is an open‑source development tool. It helps you develop quality Node.js applications without spending time on repetitive coding tasks.

    - https://medium.com/@itsrakesh/auto-generate-your-nodejs-app-admin-ui-1e0aeaf92cd7

- [directus](https://github.com/directus/directus) - Open-Source Data Platform 🐰 — Directus wraps any SQL database with a real-time GraphQL+REST API and an intuitive app for non-technical users.
- [yao](https://github.com/YaoApp/yao) - Yao A low code engine to create web services and dashboard.
- https://github.com/tnfe/shida
- [rxeditor](https://github.com/rxdrag/rxeditor) - 基于Bootstrap实现的，HTML可视化编辑工具。
- [rxdrag](https://rxdrag.com/) - rxDrag，一款全栈低代码平台，基于TypeScript生态构建

## 问题

- 低代码技术应用什么程度，未来会不会出现杀手级的应用，会是什么？

	- To C
	- To B

- 低代码与开源如何结合？

	> 先得百家争鸣，随后各方诸侯割据，接着群雄争霸兼并重组，然后开始三国演义，逐渐互相制衡标准趋同

	> 目的就是为了在同一标准下构建生态，那么只有标准统一了，拼装自然简，只有标准统一，才能实现我们的根本目的------自动化。

- 低代码三五年——能得到普通标准吗

## 参考文献

- [从实现原理看低代码](https://zhuanlan.zhihu.com/p/451340998)
- [云凤蝶低代码之路](https://developer.aliyun.com/article/786592#slide-6)
- [React：搞了半天，我才是低代码的最佳形态](https://zhuanlan.zhihu.com/p/561674446)
