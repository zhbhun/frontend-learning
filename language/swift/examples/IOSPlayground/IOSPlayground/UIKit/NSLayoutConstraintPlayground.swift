//
//  UILabelController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/29.
//

import Fakery
import Foundation
import UIKit

class NSLayoutConstraintPlayground: UITableViewController {
    
    let cellIdentifier = "cell"
    let faker = Faker(locale: "en")
    var demos: [(String,(_ content: UIView) -> Void)] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "NSLayoutConstraint"
        
        demos = [
            ("添加子视图",{ (view: UIView) in
                let subview = UIView()
                subview.backgroundColor = UIColor.red
                subview.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview)
                NSLayoutConstraint.activate([
                    subview.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
                    subview.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview.heightAnchor.constraint(equalToConstant: 50)
                ])
            }),
            ("水平居中", { (view: UIView) in
                let subview = UIView()
                subview.backgroundColor = UIColor.green
                subview.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview)
                
                NSLayoutConstraint.activate([
                    subview.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                    subview.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview.widthAnchor.constraint(equalToConstant: 100),
                    subview.heightAnchor.constraint(equalToConstant: 50)
                ])
            }),
            ("垂直居中", { (view: UIView) in
                let subview = UIView()
                subview.backgroundColor = UIColor.blue
                subview.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview)
                NSLayoutConstraint.activate([
                    subview.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
                    subview.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: 0),
                    subview.heightAnchor.constraint(equalToConstant: 50)
                ])
            }),
            ("等宽等高", { (view: UIView) in
                let subview1 = UIView()
                subview1.backgroundColor = UIColor.yellow
                subview1.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview1)
                
                let subview2 = UIView()
                subview2.backgroundColor = UIColor.orange
                subview2.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview2)
                
                NSLayoutConstraint.activate([
                    subview1.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview1.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview1.heightAnchor.constraint(equalToConstant: 50),
                    subview1.widthAnchor.constraint(equalTo: subview1.heightAnchor),
                    
                    subview2.leadingAnchor.constraint(equalTo: subview1.trailingAnchor, constant: 20),
                    subview2.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview2.widthAnchor.constraint(equalTo: subview1.widthAnchor),
                    subview2.heightAnchor.constraint(equalTo: subview1.heightAnchor),
                ])
            }),
            ("等于关系（带乘数和常量）", { (view: UIView) in
                let subview1 = UIView()
                subview1.backgroundColor = UIColor.red
                subview1.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview1)
                NSLayoutConstraint.activate([
                    subview1.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview1.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview1.heightAnchor.constraint(equalToConstant: 50),
                    subview1.widthAnchor.constraint(equalTo: subview1.heightAnchor, multiplier: 3, constant: 10),
                ])
            }),

            ("大于等于", { (view: UIView) in
                let subview1 = UIView()
                subview1.backgroundColor = UIColor.orange
                subview1.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview1)
                
                let subview2 = UIView()
                subview2.backgroundColor = UIColor.yellow
                subview2.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview2)
                
                NSLayoutConstraint.activate([
                    subview1.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview1.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview1.heightAnchor.constraint(equalToConstant: 50),
                    // 由于 subview2 增加了宽度大于 subview1 的约束，而 subview2 宽度是 50，导致 subview1 的宽度小于等于 50
                    subview1.widthAnchor.constraint(equalToConstant: 100),
                    
                    subview2.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
                    subview2.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview2.heightAnchor.constraint(equalToConstant: 50),
                    subview2.widthAnchor.constraint(equalToConstant: 50),
                    subview2.widthAnchor.constraint(greaterThanOrEqualTo: subview1.widthAnchor)
                ])
            }),
            ("小于等于", { (view: UIView) in
                let subview1 = UIView()
                subview1.backgroundColor = UIColor.orange
                subview1.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview1)
                
                let subview2 = UIView()
                subview2.backgroundColor = UIColor.yellow
                subview2.translatesAutoresizingMaskIntoConstraints = false
                view.addSubview(subview2)
                
                NSLayoutConstraint.activate([
                    subview1.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
                    subview1.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview1.heightAnchor.constraint(equalToConstant: 50),
                    subview1.widthAnchor.constraint(equalToConstant: 50),
                    
                    subview2.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
                    subview2.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
                    subview2.heightAnchor.constraint(equalToConstant: 50),
                    subview2.widthAnchor.constraint(equalToConstant: 100),
                    subview2.widthAnchor.constraint(lessThanOrEqualTo: subview1.widthAnchor)
                ])
            }),
            
        ]
        
        tableView.register(NSLayoutConstraintTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
    }
    
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demos.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> NSLayoutConstraintTableViewCell {
        let cell = NSLayoutConstraintTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
        let (title, process) = demos[indexPath.row]
        cell.title.text = title
        process(cell.content)
        return cell
    }
}

class NSLayoutConstraintTableViewCell: UITableViewCell {
    let title: UILabel = {
        let label = UILabel()
        label.font = UIFont.boldSystemFont(ofSize: 16)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    let content: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0.04)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }();
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        contentView.addSubview(title)
        contentView.addSubview(content)
        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            title.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            title.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            content.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 8),
            content.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            content.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            content.heightAnchor.constraint(equalToConstant: 100),
            content.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8)
        ])
        
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
