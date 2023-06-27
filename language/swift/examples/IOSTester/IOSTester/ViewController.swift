//
//  ViewController.swift
//  IOSTester
//
//  Created by zhanghuabin on 2023/6/27.
//

import UIKit

class ViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        
        self.view.backgroundColor = .white;
        
        
        let label = UILabel(frame: CGRect(x: UIScreen.main.bounds.size.width / 2, y: UIScreen.main.bounds.size.height / 2,width: 55,height: 20));
        label.text = "Hello World";
        self.view.addSubview(label);
    }
    
    
}

