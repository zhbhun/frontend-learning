购物车应用

> 该示例展示了随着应用升级变得愈发重要的常用的 Redux 模式。尤其展示了，如何使用 ID 来标准化存储数据实体，如何在不同层级将多个 reducer 组合使用，如何利用 reducer 定义选择器以封装 state 的相关内容。该示例也展示了使用 Redux Logger 生成日志，以及使用 Redux Thunk 中间件进行 action 的条件性分发。 —— https://github.com/reactjs/redux/blob/master/examples/shopping-cart/

# 需求
## 功能
- 查看商品列表
- 添加商品到购物车
- 查看购物车
- 结账

## 原型
- 商品列表

    - 空商品列表
    - 商品列表加载中
    - 商品列表加载失败
    - 商品列表加载成功

- 购物车

    - 空购物车
    - 购物车待结账
    - 购物车结账中
    - 购物车结账失败
    - 购物车结账成功

# 设计
商品列表

- 状态

    - 商品：加载中，加载成功，加载失败

- 动作

    - 获取商品：开始，成功，失败
    - 添加商品到购物车：需要考虑商品库存

购物车

- 状态

    - 购物车商品
    - 购物车结算：结算总，结算成功，结算失败

- 动作

    - 购物车结算：开始，成功，失败

# 实现
## 动作
- 加载商品：省略加载中和加载失败的情况

    - getAllProducts()
    - receiveProducts(products)

- 添加商品到购物车

    - addToCart(productId)：会判断商品库存
    - addToCartUnsafe(productId)：不会判断商品库存

- 购物车结账：省略加载中和加载失败的情况

    - checkout(products)

## 状态
商品

```
{
    byId: { [商品 ID]: { id, title, preice, inventory }},
    visibleIds: [商品ID]
}
```

购物车

```
{
    addedIds: [商品 ID],
    quantityById: { [商品 ID]: [商品数量] }
}
```

## 展示组件
- ProductList：商品列表组件，显示标题和列表
- ProductItem：商品列表项组件，复用 Product，且提供添加到购物车功能
- Product：商品组件，显示商品标题和价格
- Cart：购物车组件，显示商品列表，购买数量和总价，提供结账功能

## 容器组件
- ProductsContainer
- CartContainer
