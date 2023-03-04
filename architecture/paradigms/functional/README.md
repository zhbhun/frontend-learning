# 函数式编程

- Lambda 表达式
- 闭包（closure）：一个函数和对其周围状态（lexical environment，词法环境）的引用捆绑在一起（或者说函数被引用包围），这样的组合就是闭包（closure）

    ps：闭包让你可以在一个内层函数中访问到其外层函数的作用域。 在JavaScript 中，每当创建一个函数，闭包就会在函数创建的同时被创建出来。

- 高阶函数：函数可以作为参数被传递; 函数可以作为返回值输出。

    - APO
    - 函数柯里化（currying）：currying 又称部分求值。一个 currying 的函数首先会接受一些参数，接受了这些参数之后， 该函数并不会立即求值，而是继续返回另外一个函数，刚才传入的参数在函数形成的闭包中被保存起来。待到函数被真正需要求值的时候，之前传入的所有参数都会被一次性用于求值。
    - uncurrying
    - 分时函数
    - 函数节流
    - 函数防抖
    - 惰性加载函数

## 教程

- https://github.com/stoeffel/awesome-fp-js
- [什么是函数式编程思维？](https://www.zhihu.com/question/28292740)
- [如何掌握函数式编程？](https://www.zhihu.com/question/21410150)
- [不要再尝试函数式编程了](https://www.infoq.cn/article/b6gkx1crp2umu2*jipqb)
- [JavaScript 函数式编程入门指南](https://chinese.freecodecamp.org/news/functional-programming-in-javascript-for-beginners/)
- [[译] 2017年你应该了解的函数式编程](https://github.com/jasonGeng88/blog/blob/master/201705/functional_programming.md)
- [函数式编程（FP）](https://www.zoo.team/article/function-production)
- [Master Higher-Order Functions in JavaScript](https://www.telerik.com/blogs/master-higher-order-functions-javascript)
- [Forever Functional: Many flavors of currying](https://blog.openreplay.com/forever-functional-many-flavors-of-currying)
- [万物皆可柯里化的 Ramda.js](https://juejin.cn/post/7111551225656508430)

## 书籍

- [《JavaScript函数式编程思想》](https://book.douban.com/subject/30449514/)
- [《Scala函数式编程》](https://book.douban.com/subject/26772149/)
- [《函数式编程思维》](https://book.douban.com/subject/26587213/)
- [《函数式编程指北》](https://llh911001.gitbooks.io/mostly-adequate-guide-chinese/content/)
- [awesome-functional-programming](https://github.com/xgrommx/awesome-functional-programming#javascript)

## 开源项目

- [Ramda](https://github.com/ramda/ramda)
