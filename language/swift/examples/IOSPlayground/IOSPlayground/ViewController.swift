//
//  ViewController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/28.
//

import UIKit

class ViewController: UITableViewController {
    
    let demoControllers: [(String, UIViewController.Type)] = [
		("ImageViewer", ImageViewerPlayground.self),
		("UIView", UIViewPlayground.self),
        ("UIColor", UIColorPlayground.self),
        ("UILabel", UILabelPlayground.self),
        ("UIImageView", UIImageViewPlayground.self),
        ("UIStackView", UIStackViewPlayground.self),
        ("NSLayoutConstraint", NSLayoutConstraintPlayground.self),
        ("FlexLayout", FlexLayoutPlayground.self),
        ("UITapGestureRecognizer", UITapGestureRecognizerPlayground.self),
        ("UILongPressGestureRecognizer", UILongPressGestureRecognizerPlayground.self),
		("Margin", MarginPlayground.self),
		("Background", BackgroundPlayground.self),
		("Border", BorderPlayground.self),
		("Shadow", ShadowPlayground.self),
		("Corner Radius", CorderRadiusPlayground.self),
		("Text", TextPlayground.self),
		("Opacity", OpacityPlayground.self),
		("Visible", VisiblePlayground.self),
		("Transform", TransformPlayground.self),
        // 添加更多示例控制器
    ]
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        
        title = "Playground"
        
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "cell")
    }
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demoControllers.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)
        cell.textLabel?.text = demoControllers[indexPath.row].0
        return cell
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let controllerClass = demoControllers[indexPath.row].1
        let viewController = controllerClass.init()
        navigationController?.pushViewController(viewController, animated: true)
    }
}
