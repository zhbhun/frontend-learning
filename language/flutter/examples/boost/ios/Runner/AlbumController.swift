//
//  Album.swift
//  Runner
//
//  Created by zhanghuabin on 2023/12/13.
//

import Foundation
import UIKit
import flutter_boost

class AlbumController: UIViewController {
    @objc func onTapReturnDataButton(){
        //将原生的数据返回flutter端，注意这句话并不会退出页面
        FlutterBoost.instance().sendResultToFlutter(withPageName: "/album", arguments: ["code": 1, "message": "Cancel"])
        //退出页面
        self.navigationController?.popViewController(animated: true)
    }
    
    lazy var returnButton: UIButton = {
        let button = UIButton()
        button.setTitle("Return photos", for: .normal)
        button.addTarget(self, action: #selector(self.onTapReturnDataButton), for: .touchUpInside)
        button.backgroundColor = UIColor.orange
        button.contentEdgeInsets = .init(top: 10, left: 15, bottom: 10, right: 15)
        button.layer.cornerRadius = 4
        return button
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = .white
//        self.view.addSubview(pushPageButton)
    }
    
}
