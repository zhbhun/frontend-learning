//
//  YogaPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/7/3.
//

import FlexLayout
import PinLayout
import UIKit


class FlexLayoutPlayground: UITableViewController {
    
    let cellIdentifier = "cell"
    var demos: [(String,(_ stackView: UIView) -> Void)] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        title = "Yoga"
        
        demos = [
            ("水平布局并添加子视图", { (view: UIView) in
                let demo = DemoView()
                view.addSubview(demo)
                NSLayoutConstraint.activate([
                    demo.topAnchor.constraint(equalTo: view.topAnchor, constant: 0),
                    demo.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 0),
                    demo.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: 0),
                    demo.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: 0),
                ])
            }),
        ]
        
        tableView.register(FlexLayoutTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
    }
    
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demos.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> FlexLayoutTableViewCell {
        let cell = FlexLayoutTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
        let (title, process) = demos[indexPath.row]
        cell.title.text = title
        process(cell.content)
        return cell
    }
}

class FlexLayoutTableViewCell: UITableViewCell {
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
            content.heightAnchor.constraint(equalToConstant: 300),
        ])
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}


class DemoView: UIView {
    fileprivate let container = UIView()
    
    init() {
        super.init(frame: .zero)
        self.backgroundColor = .purple
        self.translatesAutoresizingMaskIntoConstraints = false;
        
        let label1 = UILabel()
        label1.text = "label1"
        label1.backgroundColor = .red
        label1.numberOfLines = 0
        
        let label2 = UILabel()
        label2.text = "label2"
        label2.backgroundColor = .blue
        label2.numberOfLines = 0
        
        addSubview(container)
        container.backgroundColor = .green
        container.flex.direction(.row).padding(12).justifyContent(.spaceAround).alignItems(.center).define { (flex) in
            flex.addItem(label1).width(100)
            flex.addItem(label2).width(100)
        }
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()

        container.pin.top(0).left(0).width(100%).height(100%)
        container.flex.layout(mode: .fitContainer)
    }
}
