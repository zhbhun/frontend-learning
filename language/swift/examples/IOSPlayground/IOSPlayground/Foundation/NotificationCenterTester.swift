//
//  NotificationCenterTester.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/28.
//

import Foundation
import SwiftyBeaver
import UIKit

class NotificationCenterTester {

    init() {
        log.info(">> init")

        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    deinit {
        // print(">> NotificationCenterTester deinit")
        log.info("deinit")
    }

    @objc func applicationWillEnterForeground(){
        log.info("applicationWillEnterForeground")
    }

    @objc func applicationDidBecomeActive(){
        log.info("applicationDidBecomeActive")
    }

    @objc func applicationWillResignActive(){
        log.info("applicationWillResignActive")
    }

    @objc func applicationDidEnterBackground(){
        log.info("applicationDidEnterBackground")
    }
}
