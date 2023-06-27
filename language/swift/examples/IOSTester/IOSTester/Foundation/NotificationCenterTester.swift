//
//  NotificationCenterController.swift
//  IOSTester
//
//  Created by zhanghuabin on 2023/6/27.
//

import Foundation
import UIKit


class NotificationCenterTester {
    
    init() {
        print(">> NotificationCenterTester init")
        
        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }
    
    deinit {
        print(">> NotificationCenterTester deinit")
    }
    
    @objc func applicationWillEnterForeground(){
        print(">> NotificationCenterTester applicationWillEnterForeground")
    }
    
    @objc func applicationDidBecomeActive(){
        print(">> NotificationCenterTester applicationDidBecomeActive")
    }
    
    @objc func applicationWillResignActive(){
        print(">> NotificationCenterTester applicationWillResignActive")
    }
    
    @objc func applicationDidEnterBackground(){
        print(">> NotificationCenterTester applicationDidEnterBackground")
    }
}

