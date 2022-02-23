// declare type IAnyObject = Record<string, any>;

// export interface BasePageProps
//   extends WechatMiniprogram.Page.InstanceProperties {
//   /**
//    * 用来保存 onLoad(options) 传入的参数
//    */
//   options: IAnyObject;
//   /** 页面的初始数据
//    *
//    * `data` 是页面第一次渲染使用的**初始数据**。
//    *
//    * 页面加载时，`data` 将会以`JSON`字符串的形式由逻辑层传至渲染层，因此`data`中的数据必须是可以转成`JSON`的类型：字符串，数字，布尔值，对象，数组。
//    *
//    * 渲染层可以通过 `WXML` 对数据进行绑定。
//    */
//   data: any;
//   /** 到当前页面的路径和参数，类型为`String`。最低基础库： `1.2.0` */
//   url?: string;
// }

// export interface BasePage
//   extends WechatMiniprogram.Page.ILifetime,
//   WechatMiniprogram.Page.InstanceMethods<any>,
//   BasePageProps {
//   // 允许其他任意自定义的 class 变量
//   [x: string]: any;
// }

// export class BasePage {
//   readonly app: any;

//   constructor() {
//     this.app = getApp();
//   }
// }

// // export function toObject(something: any, options: IClassInstanceToObjectOptions = {}): {[key: string]: any} {
// //   let obj = {}
// //   if (!isObject(something)) return obj

// //   let excludes = options.excludes || ['constructor']
// //   let {enumerable = true, configurable = 0, writable = 0} = options
// //   let defaultDesc: PropertyDescriptor = {}
// //   if (enumerable !== 0) defaultDesc.enumerable = enumerable
// //   if (configurable !== 0) defaultDesc.configurable = configurable
// //   if (writable !== 0) defaultDesc.writable = writable

// //   iterateInheritedPrototype((proto) => {
// //     Object.getOwnPropertyNames(proto).forEach(key => {
// //       if (excludes.indexOf(key) >= 0) return
// //       if (obj.hasOwnProperty(key)) return
// //       let desc = Object.getOwnPropertyDescriptor(proto, key) as PropertyDescriptor

// //       let fnKeys = ['get', 'set', 'value'] as Array<'get'>
// //       fnKeys.forEach((k) => {
// //         if (typeof desc[k] === 'function') {
// //           let oldFn = desc[k] as any
// //           desc[k] = function(...args: any[]) {
// //             return oldFn.apply(options.hasOwnProperty('bindTo') ? options.bindTo : this, args)
// //           }
// //         }
// //       })
// //       Object.defineProperty(obj, key, {...desc, ...defaultDesc})
// //     })
// //   }, something, options.till || Object, false)

// //   return obj
// // }

// export function wxPage(decoratorOptions?: any) {
//   return function(constructor: new () => BasePage): void {
//     class WxPage extends constructor {
//     }

//     const current = new WxPage();
//     const obj = toObject(current);
//     Page(obj);
//   };
// }

// @wxPage
// export default class extends BasePage {
//   data: any = {
//     abcd: 1,
//     color: 'green',
//   };

//   onLoad() {
//   }

//   onShow() {
//     console.log('show')
//   }
// }

