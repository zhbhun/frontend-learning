// Generated by Selenium IDE
const { Builder, By, Key, until } = require('selenium-webdriver')
const assert = require('assert')

describe('hello', function() {
  this.timeout(30000)
  let driver
  let vars
  beforeEach(async function() {
    driver = await new Builder().forBrowser('chrome').build()
    vars = {}
  })
  afterEach(async function() {
    await driver.quit();
  })
  it('hello', async function() {
    // Test name: hello
    // Step # | name | target | value
    // 1 | open | / | 
    await driver.get("https://www.baidu.com/")
    // 2 | setWindowSize | 1550x847 | 
    await driver.manage().window().setRect(1550, 847)
    // 3 | type | id=kw | hello
    await driver.findElement(By.id("kw")).sendKeys("hello")
    // 4 | sendKeys | id=kw | ${KEY_ENTER}
    await driver.findElement(By.id("kw")).sendKeys(Key.ENTER)
    // 5 | assertValue | id=kw | hello
    {
      const value = await driver.findElement(By.id("kw")).getAttribute("value")
      assert(value == "hello")
    }
  })
})