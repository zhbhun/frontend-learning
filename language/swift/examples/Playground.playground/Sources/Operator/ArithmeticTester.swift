import Foundation
import XCTest

public class ArithmeticTester: XCTestCase {
    public func testPlus() {
        XCTAssertEqual(3, 1 + 2);
    }
    
    public func testMinus() {
        XCTAssertEqual(1, 2 - 1)
    }
}
