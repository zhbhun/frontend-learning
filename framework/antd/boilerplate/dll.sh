export NODE_ENV="development"
echo "\n"
echo "webpack --config ./webpack/dll.dev.config.js"
webpack --config ./webpack/dll.dev.config.js --progress

export NODE_ENV="production"
echo "\n"
echo "webpack --config ./webpack/dll.polyfill.config.js"
webpack --config ./webpack/dll.polyfill.config.js  --progress
echo "\n"
echo "webpack --config ./webpack/dll.common.config.js"
webpack --config ./webpack/dll.common.config.js  --progress
echo "\n"
echo "webpack --config ./webpack/dll.react.config.js"
webpack --config ./webpack/dll.react.config.js  --progress
echo "\n"
echo "webpack --config ./webpack/dll.router.config.js"
webpack --config ./webpack/dll.router.config.js  --progress
echo "\n"
echo "webpack --config ./webpack/dll.antd.config.js"
webpack --config ./webpack/dll.antd.config.js  --progress
