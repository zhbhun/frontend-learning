const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const file = path.resolve(__dirname, './assets/html/ui-ux-design-trends-2023');

fs.promises.readFile(`${file}.html`).then((content) => {
  const dom = new JSDOM(content);
  let reader = new Readability(dom.window.document, {
    serializer(el) {
      return el;
    },
  });
  const article = reader.parse();
  return fs.promises.writeFile(`${file}.json`, JSON.stringify(article, null, 2));
});
