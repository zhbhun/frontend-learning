//
//  ViewController.swift
//  IOSTester
//
//  Created by zhanghuabin on 2023/6/27.
//

import UIKit

class ViewController: UIViewController {
    
    var notificationCenterTester: NotificationCenterTester?;
    
    override func viewDidLoad() {
        super.viewDidLoad()
        print("viewDidLoad")
        
        self.view.backgroundColor = .white;

        let label = UILabel(frame: CGRect(x: UIScreen.main.bounds.size.width / 2 - 50, y: UIScreen.main.bounds.size.height / 2 - 10, width: 100, height: 20));
        label.text = "Hello World";
        label.textAlignment = NSTextAlignment.center;
        self.view.addSubview(label);
        
        notificationCenterTester = NotificationCenterTester();
    }
    
    
}

