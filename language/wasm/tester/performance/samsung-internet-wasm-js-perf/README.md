- [Performance Testing Web Assembly vs JavaScript](https://medium.com/samsung-internet-dev/performance-testing-web-assembly-vs-javascript-e07506fd5875)

---

# WASM Performance example

mmm3.js and mmm3.wasm was generated with the following command:

```
emcc mmm.cpp -s WASM=1 -s EXPORTED_FUNCTIONS="['_bmm','_mmmijk','_mmmkji']" -o mmm.js
```

*Note the underscores in `EXPORTED_FUNCTIONS`*. Also if you get errors when loading the wasm file in Javascript, try adding O1, O2 or O3 compiler optimizer flags. The emsdk is nice but there are some minor issues.


In `index.html`:

line 178: `const runs = 1;` controls how many iterations to average over. I used 25 for most of my tests

line 181: `const length = [1, 64, 128, 256, 512, 1024];	// matrix sizes: n x n` is the array sizes I set

