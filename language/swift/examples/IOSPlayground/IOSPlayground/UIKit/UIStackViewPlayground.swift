//
//  UIStackViewPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/7/3.
//

import Foundation
import UIKit

class UIStackViewPlayground: UITableViewController {
    
    let cellIdentifier = "cell"
    var demos: [(String,(_ stackView: UIStackView) -> Void)] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "UILabel"
        
        demos = [
            ("水平布局并添加子视图", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .equalSpacing
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                label1.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                label2.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                label3.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label3)
            }),
            ("垂直布局并添加子视图", { (stackView: UIStackView) in
                stackView.axis = .vertical
                stackView.distribution = .equalSpacing
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                stackView.addArrangedSubview(label3)
            }),
            ("填充布局1", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .fill
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                label1.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                label2.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                label3.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label3)
            }),

            ("填充布局2", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .fill
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                label2.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                label3.widthAnchor.constraint(equalToConstant: 60).isActive = true
                stackView.addArrangedSubview(label3)
            }),
            ("填充布局3", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .fill
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                label1.widthAnchor.constraint(equalToConstant: 60).isActive = true
                label1.setContentHuggingPriority(.defaultHigh, for: .horizontal)
                label1.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                label2.widthAnchor.constraint(equalToConstant: 60).isActive = true
                label2.setContentHuggingPriority(.defaultLow, for: .horizontal)
                label2.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                label3.widthAnchor.constraint(equalToConstant: 60).isActive = true
                label3.setContentHuggingPriority(.defaultLow, for: .horizontal)
                label3.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
                stackView.addArrangedSubview(label3)
                
                stackView.setCustomSpacing(0, after: label1)
            }),
            ("相等填充布局", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .fillEqually
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                stackView.addArrangedSubview(label3)
            }),
            ("比例分布布局", { (stackView: UIStackView) in
                stackView.axis = .horizontal
                stackView.distribution = .equalCentering
                stackView.spacing = 8.0
                
                let label1 = UILabel()
                label1.text = "Label 1"
                label1.backgroundColor = .red
                stackView.addArrangedSubview(label1)
                
                let label2 = UILabel()
                label2.text = "Label 2"
                label2.backgroundColor = .green
                stackView.addArrangedSubview(label2)
                
                let label3 = UILabel()
                label3.text = "Label 3"
                label3.backgroundColor = .blue
                stackView.addArrangedSubview(label3)
            })
        ]
        
        tableView.register(StackViewTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
    }
    
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demos.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> StackViewTableViewCell {
        let cell = StackViewTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
        let (title, process) = demos[indexPath.row]
        cell.title.text = title
        process(cell.content)
        return cell
    }
}

class StackViewTableViewCell: UITableViewCell {
    let title: UILabel = {
        let label = UILabel()
        label.font = UIFont.boldSystemFont(ofSize: 16)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    let content: UIStackView = {
        let view = UIStackView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
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
            content.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),
            content.heightAnchor.constraint(equalToConstant: 100)
        ])
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
