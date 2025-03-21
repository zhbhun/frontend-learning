//
//  HomeViewController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/29.
//

import UIKit

class HomeViewController: UITableViewController {
    
    let demoControllers = [
        ("Demo 1", Demo1ViewController.self),
        ("Demo 2", Demo2ViewController.self),
        // 添加更多示例控制器
    ]
    
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Demo 列表"
        
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "cell")
    }
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demoControllers.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)
        cell.textLabel?.text = demoControllers[indexPath.row].0
        return cell
    }
    
    // MARK: - UITableViewDelegate
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let controllerClass = demoControllers[indexPath.row].1
        let viewController = controllerClass.init()
        navigationController?.pushViewController(viewController, animated: true)
    }
}
