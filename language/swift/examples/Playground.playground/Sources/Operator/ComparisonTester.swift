import Foundation
import XCTest

public class ComparisonTester: XCTestCase {
    public func testLessThan() {
        XCTAssertEqual(true, 1 < 2);
    }
}
