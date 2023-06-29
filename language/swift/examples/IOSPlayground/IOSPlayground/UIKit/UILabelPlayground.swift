//
//  UILabelController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/29.
//

import Fakery
import Foundation
import UIKit

class UILabelPlayground: UITableViewController {
    
    let cellIdentifier = "cell"
    let faker = Faker(locale: "en")
    var demos: [(_ label: UITableViewCell) -> Void] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "UILabel"
        
        let process = {(cell: UITableViewCell) -> UILabel in
            for subview in cell.contentView.subviews {
                subview.removeFromSuperview()
            }
            let label = UILabel();
            label.frame = CGRect(x: 16, y: 8, width: cell.contentView.bounds.width - 32, height: cell.contentView.bounds.height - 16)
            cell.contentView.addSubview(label)
            return label;
        }
        
        demos = [
            { (cell: UITableViewCell) in
                let label = process(cell);
                label.text = "设置文本内容"
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置字体和字号"
                label.font = UIFont.systemFont(ofSize: 24)
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置文字颜色"
                label.textColor = UIColor.red
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置文字颜色"
                label.textColor = UIColor.red
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置背景颜色"
                label.backgroundColor = UIColor.lightGray.withAlphaComponent(0.1)
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置对齐方式"
                label.textAlignment = .center
            },
            { (cell: UITableViewCell) in
                let label = process(cell)
                label.text = "设置文本换行 设置文本换行 设置文本换行 设置文本换行 设置文本换行 设置文本换行"
                label.numberOfLines = 0
                label.lineBreakMode = .byWordWrapping
            },
        ]
        
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: cellIdentifier)    }
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demos.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: cellIdentifier, for: indexPath)
        demos[indexPath.row](cell)
        return cell
    }
}
