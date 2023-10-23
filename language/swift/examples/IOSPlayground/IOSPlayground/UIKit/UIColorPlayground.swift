//
//  UIColorPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/7/2.
//

//
//  UILabelController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/29.
//

import Fakery
import Foundation
import UIKit

class UIColorPlayground: UITableViewController {

    let cellIdentifier = "cell"
    let faker = Faker(locale: "en")
    var demos: [(String,(_ view: UIView) -> Void)] = []

    override func viewDidLoad() {
        super.viewDidLoad()

        title = "UILabel"

        demos = [
          ("预定义颜色", { (view: UIView) in
              view.backgroundColor = UIColor.red
          }),
          ("RGB", { (view: UIView) in
              view.backgroundColor = UIColor(red: 1, green: 0, blue: 0, alpha: 1.0)
          }),
        ]

        tableView.register(ColorTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
    }


    // MARK: - UITableViewDataSource

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return demos.count
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> ColorTableViewCell {
        let cell = ColorTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
        let (title, process) = demos[indexPath.row]
        cell.title.text = title
        process(cell.content)
        return cell
    }
}

class ColorTableViewCell: UITableViewCell {
    let title: UILabel = {
        let label = UILabel()
        label.font = UIFont.boldSystemFont(ofSize: 16)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    let content: UIView = {
        let view = UIView()
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
            content.heightAnchor.constraint(equalToConstant: 50)
        ])
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

