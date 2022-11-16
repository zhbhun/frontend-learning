const express = require("express");
const app = express();
const port = 3000;

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @-webkit-keyframes ssc-loading{0%{-webkit-transform:translateX(-100%);transform:translateX(-100%)}to{-webkit-transform:translateX(100%);transform:translateX(100%)}}@keyframes ssc-loading{0%{-webkit-transform:translateX(-100%);transform:translateX(-100%)}to{-webkit-transform:translateX(100%);transform:translateX(100%)}}.ssc-circle,.ssc-head-line,.ssc-hr,.ssc-line,.ssc-square{display:block;background-color:rgba(0,0,0,.17);position:relative;overflow:hidden}.ssc-circle:after,.ssc-head-line:after,.ssc-hr:after,.ssc-line:after,.ssc-square:after{content:"";-webkit-animation:ssc-loading 1.3s infinite;animation:ssc-loading 1.3s infinite;height:100%;left:0;position:absolute;right:0;top:0;-webkit-transform:translateX(-100%);transform:translateX(-100%);z-index:1;background:linear-gradient(90deg,transparent,hsla(0,0%,100%,.3),transparent)}.ssc{cursor:progress;-webkit-user-select:none;user-select:none}.ssc .mb{margin-bottom:16px}.ssc .mt{margin-top:16px}.ssc .mr{margin-right:16px}.ssc .ml{margin-left:16px}.ssc .mbs{margin-bottom:8px}.ssc .mts{margin-top:8px}.ssc .mrs{margin-right:8px}.ssc .mls{margin-left:8px}.ssc .w-10{width:10%}.ssc .w-20{width:20%}.ssc .w-30{width:30%}.ssc .w-40{width:40%}.ssc .w-50{width:50%}.ssc .w-60{width:60%}.ssc .w-70{width:70%}.ssc .w-80{width:80%}.ssc .w-90{width:90%}.ssc .w-100{width:100%}.ssc .flex{display:flex}.ssc .inline-flex{display:inline-flex}.ssc .flex-column{flex-direction:column}.ssc .flex-column-reverse{flex-direction:column-reverse}.ssc .flex-row{flex-direction:row}.ssc .flex-row-reverse{flex-direction:row-reverse}.ssc .align-center{align-items:center}.ssc .align-start{align-items:flex-start}.ssc .align-end{align-items:flex-end}.ssc .align-stretch{align-items:stretch}.ssc .justify-start{justify-content:start}.ssc .justify-center{justify-content:center}.ssc .justify-end{justify-content:end}.ssc .justify-between{justify-content:space-between}.ssc .justify-around{justify-content:space-around}.ssc-wrapper{padding:16px}.ssc-card{display:block;width:100%;height:100%;border-radius:5px;box-shadow:0 2px 4px 1px rgba(0,0,0,.17);background-color:#fff}.ssc-circle{border-radius:50%;width:50px;height:50px}.ssc-hr{width:100%;height:2px}.ssc-line{height:12px}.ssc-head-line,.ssc-line{border-radius:15px;width:100%}.ssc-head-line{height:24px}.ssc-square{width:100%;height:150px}
  </style>
  <style>
    *{box-sizing:border-box}.search-ssc-lg{display:none;padding:16px;margin:0 auto;max-width:1200px}@media screen and (min-width:769px){.search-ssc-lg{display:block}}.search-ssc-lg .tag{height:30px;width:150px;margin-right:12px;border-radius:12px}.search-ssc-sm{display:none;padding:16px}@media screen and (max-width:768px){.search-ssc-sm{display:block}}.search-ssc-sm__tags{margin-bottom:-12px}.search-ssc-sm .tag{height:28px;margin-right:12px;margin-bottom:12px;border-radius:10px}.search-ssc-sm__category{height:45px;border-radius:6px}
  </style>
  <script src="https://unpkg.com/vue@3.2.45/dist/vue.global.prod.js"></script>
</head>
<body>
  <div class="search-ssc-lg ssc">
    <div class="ssc-card ssc-wrapper">
        <div class="flex mbs">
            <div class="ssc-square tag"></div>
            <div class="ssc-square tag"></div>
            <div class="ssc-square tag"></div>
            <div class="ssc-square tag"></div>
            <div class="ssc-square tag"></div>
        </div>
    </div>
    <br>
    <div class="ssc-hr"></div>
    <br>
    <div class="ssc-card ssc-wrapper">
        <div class="ssc-head-line w-50"></div>
        <br>
        <div class="align-start flex justify-between">
            <div class="ssc-card ssc-wrapper w-30">
                <div class="mb ssc-head-line"></div>
                <div class="mbs ssc-line w-80"></div>
                <div class="mbs ssc-line w-40"></div>
                <div class="mbs ssc-line w-60"></div>
            </div>
            <div class="ssc-card ssc-wrapper w-30">
                <div class="mb ssc-head-line"></div>
                <div class="mbs ssc-line w-70"></div>
                <div class="mbs ssc-line w-30"></div>
                <div class="mbs ssc-line w-90"></div>
            </div>
            <div class="ssc-card ssc-wrapper w-30">
                <div class="mb ssc-head-line"></div>
                <div class="mbs ssc-line w-60"></div>
                <div class="mbs ssc-line w-90"></div>
                <div class="mbs ssc-line w-30"></div>
            </div>
        </div>
    </div>
    <br>
    <div class="ssc-hr"></div>
    <br>
    <div class="align-start flex">
        <div class="mr ssc-card w-30">
            <div class="flex justify-between ssc-wrapper">
                <div class="mr w-60">
                    <div class="mb ssc-line w-50"></div>
                    <div class="mb ssc-line w-70"></div>
                    <div class="ssc-line w-90"></div>
                </div>
                <div class="ssc-circle" style="width:70px;height:70px"></div>
            </div>
            <div class="ssc-hr"></div>
            <div class="ssc-wrapper">
                <div class="align-center flex justify-between">
                    <div class="mr ssc-head-line w-60"></div>
                    <div class="ssc-line w-30"></div>
                </div>
            </div>
            <div class="ssc-hr"></div>
            <div class="ssc-wrapper">
                <div class="mb ssc-line w-100"></div>
                <div class="mb ssc-line w-70"></div>
                <div class="mb ssc-line w-30"></div>
                <div class="mb ssc-line w-80"></div>
                <div class="mb ssc-line w-60"></div>
            </div>
            <div class="ssc-hr"></div>
            <div class="ssc-wrapper">
                <div class="mb ssc-line w-100"></div>
                <div class="mb ssc-line w-70"></div>
                <div class="mb ssc-line w-30"></div>
                <div class="mb ssc-line w-80"></div>
                <div class="mb ssc-line w-60"></div>
            </div>
            <div class="ssc-hr"></div>
            <div class="ssc-wrapper">
                <div class="mb ssc-line w-100"></div>
                <div class="mb ssc-line w-70"></div>
                <div class="mb ssc-line w-30"></div>
                <div class="mb ssc-line w-80"></div>
                <div class="mb ssc-line w-60"></div>
            </div>
        </div>
        <div class="w-100">
            <div class="ssc-card ssc-wrapper">
                <div class="ssc-head-line"></div>
                <br>
                <div class="ssc-square"></div>
            </div>
            <br>
            <div class="ssc-card ssc-wrapper">
                <div class="ssc-head-line"></div>
                <br>
                <div class="ssc-square"></div>
            </div>
            <br>
            <div class="ssc-card ssc-wrapper">
                <div class="ssc-head-line"></div>
                <br>
                <div class="ssc-square"></div>
            </div>
        </div>
    </div>
</div>
<div class="search-ssc-sm ssc">
    <div class="ssc-card ssc-wrapper">
        <div class="ssc-line w-70"></div>
    </div>
    <br>
    <div class="flex justify-between ssc-card ssc-wrapper">
        <div class="w-70">
            <div class="mb ssc-line w-50"></div>
            <div class="mb ssc-line w-70"></div>
            <div class="ssc-line w-90"></div>
        </div>
        <div class="ssc-circle" style="width:70px;height:70px"></div>
    </div>
    <br>
    <div class="ssc-hr"></div>
    <br>
    <div class="ssc-card ssc-wrapper">
        <div class="mb ssc-head-line"></div>
        <div class="mb ssc-square"></div>
        <div class="mb ssc-line w-50"></div>
        <div class="mb ssc-line w-80"></div>
        <div class="mb ssc-line w-30"></div>
    </div>
    <br>
    <div class="ssc-card">
        <div class="ssc-wrapper">
            <div class="align-center flex justify-between">
                <div class="mr ssc-head-line w-60"></div>
                <div class="ssc-line w-30"></div>
            </div>
        </div>
        <div class="ssc-hr"></div>
        <div class="ssc-wrapper">
            <div class="mb ssc-line w-100"></div>
            <div class="mb ssc-line w-70"></div>
            <div class="mb ssc-line w-30"></div>
            <div class="mb ssc-line w-80"></div>
            <div class="mb ssc-line w-60"></div>
        </div>
        <div class="ssc-hr"></div>
        <div class="ssc-wrapper">
            <div class="mb ssc-line w-100"></div>
            <div class="mb ssc-line w-70"></div>
            <div class="mb ssc-line w-30"></div>
            <div class="mb ssc-line w-80"></div>
            <div class="mb ssc-line w-60"></div>
        </div>
        <div class="ssc-hr"></div>
        <div class="ssc-wrapper">
            <div class="mb ssc-line w-100"></div>
            <div class="mb ssc-line w-70"></div>
            <div class="mb ssc-line w-30"></div>
            <div class="mb ssc-line w-80"></div>
            <div class="mb ssc-line w-60"></div>
        </div>
    </div>
    <br>
    <div class="ssc-card ssc-wrapper">
        <div class="flex search-ssc-sm__tags" style="flex-wrap:wrap">
            <div class="ssc-square tag w-30"></div>
            <div class="ssc-square tag w-70"></div>
            <div class="ssc-square tag w-50"></div>
            <div class="ssc-square tag w-20"></div>
        </div>
    </div>
  </div>
  <!--app-->
</body>
</html>
`;

app.get("/", (req, res) => {
  const [prefix, postfix] = html.split("<!--app-->");
  res.write(prefix);
  let timer;
  (function intervalPrint() {
    timer = setTimeout(() => {
      timer = undefined;
      res.write(`<div>${Date.now()}</div>`);
      intervalPrint();
    }, 1000);
  })();
  setTimeout(() => {
    if (timer) {
      clearTimeout(timer);
    }
    res.write("<div>...</div>");
    res.write(postfix);
    res.end();
  }, 10000);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
