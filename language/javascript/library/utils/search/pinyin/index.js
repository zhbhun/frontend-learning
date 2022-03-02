const pinyin = require("pinyin");
const locations = require('./locations.json');

const config = { style: pinyin.STYLE_NORMAL, heteronym: false };


locations.forEach((location) => {
  (location.children || []).forEach((city) => {
    const spell = pinyin(city.name, config).join('');
    if (city.spell !== spell) {
      console.log(spell, city);
    }
  });
});
