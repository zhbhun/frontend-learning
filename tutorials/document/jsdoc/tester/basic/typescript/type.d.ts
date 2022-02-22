/**
 * 地址
 */
export interface Address {
  /**
   * 街道
   */
  street: string;
  /**
   * 城市
   */
  city: string;
  /**
   * 邮政编码
   */
  zip: number;
}

/**
 * 客户
 */
export interface Customer {
  /**
   * 姓名
   */
  name: string;
  /**
   * 邮箱
   */
  email: string;
  /**
   * 地址
   */
  address: Address;
}

