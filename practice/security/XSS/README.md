- 问题名称：

    跨站脚本攻击漏洞(XSS)

- 问题描述：

    对攻击者的输入没有经过严格的控制，最终显示给来访的用户，攻击者通过巧妙的方法注入恶意指令代码到网页，使用户加载并执行攻击者恶意制造的网页程序。这些恶意网页程序通常是JavaScript，但实际上也可以包括Java， VBScript， ActiveX， Flash 或者甚至是普通的HTML。攻击成功后，攻击者可能得到更高的权限（如执行一些操作）、个人网页内容、会话和cookie等各种内容。常见的攻击方式主要是利用XSS盗取用户未受httponly保护的cookie，再使用盗取的cookie登陆服务器进行操作。

- 解决方案：

    1、过滤法：服务端对用户输入的数据过滤以下特殊字符：expression,view-source,window,location,document,cookie,open,CASE_INSENSITIVE,MULTILINE,DOTALL,oncontrolselect,oncopy,oncut,ondataavailable,ondatasetchanged,ondatasetcomplete,ondblclick,ondeactivate,ondrag,ondragend,ondragenter,ondragleave,ondragover,ondragstart,ondrop,onerror,onerroupdate,onfilterchange,onfinish,onfocus,onfocusin,onfocusout,onhelp,onkeydown,onkeypress,onkeyup,onlayoutcomplete,onload,onlosecapture,onmousedown,onmouseenter,onmouseleave,onmousemove,onmouseout,onmouseover,onmouseup,onmousewheel,onmove,onmoveend,onmovestart,onabort,onactivate,onafterprint,onafterupdate,onbefore,onbeforeactivate,onbeforecopy,onbeforecut,onbeforedeactivate,onbeforeeditocus,onbeforepaste,onbeforeprint,onbeforeunload,onbeforeupdate,onblur,onbounce,oncellchange,onchange,onclick,oncontextmenu,onpaste,onpropertychange,onreadystatechange,onreset,onresize,onresizend,onresizestart,onrowenter,onrowexit,onrowsdelete,onrowsinserted,onscroll,onselect,onselectionchange,onselectstart,onstart,onstop,onsubmit,onunload,ptompt,console,eval,confirm,',script,alert,&lt;,&gt;,ScRipt,;,&lt;img&gt;,&lt;a&gt;,&lt;script&gt;,%27,%3B,%5C,%2527
    2、转义法：对客户端输出的数据进行编码转义(建议采用该方案)
    3、内容安全策略(CSP)
    4、html实体化(<>#;/\=’)
