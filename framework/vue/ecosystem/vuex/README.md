# [Vuex](https://vuex.vuejs.org/)

是什么：

Vuex 是一个状态管理工具。

![vuex](https://vuex.vuejs.org/vuex.png)

特点：

- 单一状态树
- 响应式：组件从 store 获取了状态，就会自动响应 store 状态的变化；
- 不可直接修改：必须通过 `commit mutation` 来修改 store 状态；

为什么：

解决组件之间共享状态问题。

## 安装

```js
import Vue from "vue";
import Vuex from "vuex";
// import App from "./App.vue";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++;
    }
  }
});

const App = {
  template: `
    <button @click="increment">{{count}} +1</button>
  `,
  computed: {
    count() {
      return store.state.count;
    }
  },
  methods: {
    increment() {
      this.$store.commit("increment");
    }
  }
};

new Vue({
  store,
  render: (h) => h(App)
}).$mount("#app");
```

> https://codesandbox.io/s/vue-vuex-installation-bbmtj?file=/src/main.js:0-534

<iframe src="https://codesandbox.io/embed/vue-vuex-installation-bbmtj?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-vuex installation"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

## 基础

### `state`

- `this.$store.state`
- `mapState`

    ```js
    // in full builds helpers are exposed as Vuex.mapState
    import { mapState } from 'vuex'
    
    export default {
      // ...
      computed: mapState({
        // arrow functions can make the code very succinct!
        count: state => state.count,  
        // passing the string value 'count' is same as `state => state.count`
        countAlias: 'count',  
        // to access local state with `this`, a normal function must be used
        countPlusLocalState (state) {
          return state.count + this.localCount
        }
      })
    }
    ```

    <iframe src="https://codesandbox.io/embed/vue-vuex-installation-forked-ynzsj?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px;overflow:hidden;" title="vue-vuex mapState" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>

### `getters`

类似组件的 `computed` 属性，`getters` 结果根据依赖缓存（只有在依赖的状态变化时才会重新计算）。

- 定义：

    - state
    - state + getters
    - state + [getters] => params

- 使用：mapGetter + this.$store.getter

```js
import Vue from "vue";
import Vuex, { mapGetters } from "vuex";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    todos: [
      {
        id: 1,
        content: "a",
        done: true
      },
      {
        id: 2,
        content: "b",
        done: true
      },
      {
        id: 3,
        content: "c",
        done: false
      }
    ]
  },
  getters: {
    // 普通方式
    doneTodos(state) {
      return state.todos.filter((todo) => todo.done);
    },
    // 复用其他 getters 的方式
    doneTodosCount(state, getters) {
      return getters.doneTodos.length;
    },
    // 带查询参数的方式
    getTodoById: (state) => (id) => state.todos.find((todo) => todo.id === id)
  }
});

const App = {
  template: `
    <div>
      <p @click="print">done: {{doneTodosCount}}</p>
      <ul>
        <li v-for="item in doneTodos">
          {{ item.content }}
        </li>
      </ul>
      <p>{{undoTodo.content}}</p>
    </div>
  `,
  computed: {
    // 可以通过 mapGetter 使用
    ...mapGetters(["doneTodos", "doneTodosCount"]),
    undoTodo() {
      // 可以通过 `this.$store.getters` 使用
      return this.$store.getters.getTodoById(3);
    }
  },
  methods: {
    print() {
      console.log(this.$store.getters.doneTodosCount);
    }
  }
};

new Vue({
  store,
  render: (h) => h(App)
}).$mount("#app");
```

<iframe src="https://codesandbox.io/embed/vue-vuex-installation-forked-evlws?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="vue-vuex installation (forked)" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>

### `mutations`

```js
import Vue from "vue";
import Vuex, { mapMutations } from "vuex";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    count: 0,
    obj: {}
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    incrementByN(state, n) {
      state.count += n;
    },
    incrementByObject(state, payload) {
      state.count += payload.amount;
    }
  }
});

const App = {
  template: `
    <div>
      <button @click="increment">{{count}} +1</button>
      <button @click="incrementByN(10)">{{count}} +10</button>
      <button @click="incrementByObject">{{count}} +100</button>
    </div>
  `,
  computed: {
    count() {
      return store.state.count;
    },
    countOfProperty() {
      return store.state.obj.count;
    }
  },
  methods: {
    ...mapMutations(["increment", "incrementByN"]),
    incrementByObject() {
      this.$store.commit({ type: "incrementByObject", amount: 100 });
    }
  }
};

new Vue({
  store,
  render: (h) => h(App)
}).$mount("#app");
```

<iframe src="https://codesandbox.io/embed/vue-vuex-mutations-kt5xi?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="vue-vuex mutations" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>

### `actions`

```js
import Vue from "vue";
import Vuex, { mapActions, mapState } from "vuex";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    incrementByN(state, count) {
      state.count += count;
    }
  },
  actions: {
    increment(context) {
      context.commit("increment");
    },
    incrementByN(context, count) {
      context.commit("incrementByN", count);
    },
    incrementByTimer(context) {
      setTimeout(() => {
        context.commit("increment");
      }, 1000);
    },
    incrementByPromise(context) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          context.commit("increment");
          resolve();
        }, 1000);
      });
    },
    async incrementByMultiPromise(context) {
      await context.dispatch("incrementByPromise");
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          context.commit("incrementByN", 9);
          resolve();
        }, 1000);
      });
    }
  }
});

const App = {
  template: `
    <div>
      <button @click="increment">{{count}} +1</button>
      <button @click="incrementByN(10)">{{count}} +10</button>
      <button @click="incrementByTimer">{{count}} +1 by 3s</button>
      <button @click="incrementByPromise">{{count}} +1 by 3s - {{loading ? 'loading' : 'idle'}}</button>
      <button @click="incrementByMultiPromise">{{count}} +10 by 3s - {{loading ? 'loading' : 'idle'}}</button>
    </div>
  `,
  data() {
    return {
      loading: false
    };
  },
  computed: mapState(["count"]),
  methods: {
    ...mapActions(["increment", "incrementByN", "incrementByTimer"]),
    incrementByPromise() {
      this.loading = true;
      this.$store.dispatch("incrementByPromise").then(() => {
        this.loading = false;
      });
    },
    incrementByMultiPromise() {
      this.loading = true;
      this.$store.dispatch("incrementByMultiPromise").then(() => {
        this.loading = false;
      });
    }
  }
};

new Vue({
  store,
  render: (h) => h(App)
}).$mount("#app");
```

<iframe src="https://codesandbox.io/embed/vue-vuex-actions-n343x?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="vue-vuex actions" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>

### `modules`

```js
import Vue from "vue";
import Vuex, { mapActions, mapGetters, mapMutations, mapState } from "vuex";

// const { mapState, mapActions } = createNamespacedHelpers('some/nested/module')

Vue.use(Vuex);

const SubModule = {
  namespaced: true,
  state() {
    return {
      count: 0
    };
  },
  getters: {
    doubleCount(state) {
      return state.count * 2;
    },
    sumWithRootCount(state, getters, rootState, rootGetters) {
      return state.count + rootState.count;
    }
  },
  mutations: {
    increment(state) {
      state.count++;
    }
  },
  actions: {
    incrementIfOddOnRootSum({ state, commit, rootState, rootGetters }) {
      if ((state.count + rootState.count) % 2 === 1) {
        commit("increment");
      }
    },
    incrementRoot({ commit }) {
      commit("increment", null, { root: true });
    },
    incrementGlobal: {
      root: true,
      handler(context) {
        context.commit("increment");
      }
    }
  }
};

const store = new Vuex.Store({
  modules: {
    a: SubModule,
    b: SubModule
  },
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++;
    }
  }
});

const App = {
  template: `
    <div>
      <div>
        <h2>Root</h2>
        <button @click="increment">{{count}}+1</button>
      </div>
      <hr />
      <div>
        <h2>a</h2>
        <button @click="aIncrement">{{a}} | {{aDoubleCount}} | {{aSumWithRootCount}} +1</button>
        <button @click="aIncrementIfOddOnRootSum">IncrementIfOddOnRootSum</button>
        <button @click="aIncrementRoot">IncrementRoot</button>
      </div>
      <hr />
      <div>
        <h2>b</h2>
        <button @click="bIncrement">{{b}} | {{bDoubleCount}} | {{bSumWithRootCount}} +1</button>
        <button @click="bIncrementIfOddOnRootSum">IncrementIfOddOnRootSum</button>
        <button @click="bIncrementRoot">IncrementRoot</button>
      </div>
    </div>
  `,
  computed: {
    ...mapState(["count"]),
    ...mapState({
      a: (state) => state.a.count,
      b: (state) => state.b.count
    }),
    ...mapGetters("a", {
      aDoubleCount: "doubleCount",
      aSumWithRootCount: "sumWithRootCount"
    }),
    ...mapGetters("b", {
      bDoubleCount: "doubleCount",
      bSumWithRootCount: "sumWithRootCount"
    })
  },
  methods: {
    ...mapMutations(["increment"]),
    ...mapMutations("a", { aIncrement: "increment" }),
    ...mapMutations("b", { bIncrement: "increment" }),
    ...mapActions("a", {
      aIncrementIfOddOnRootSum: "incrementIfOddOnRootSum",
      aIncrementRoot: "incrementRoot"
    }),
    ...mapActions("b", {
      bIncrementIfOddOnRootSum: "incrementIfOddOnRootSum",
      bIncrementRoot: "incrementRoot"
    }),
    ...mapActions(["incrementGlobal"])
  }
};

new Vue({
  store,
  render: (h) => h(App)
}).$mount("#app");
```

<iframe src="https://codesandbox.io/embed/vue-vuex-modules-oezuu?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="vue-vuex modules" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>

## 进阶

TODO
