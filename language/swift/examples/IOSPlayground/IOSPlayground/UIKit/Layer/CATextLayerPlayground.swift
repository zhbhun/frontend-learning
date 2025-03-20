import UIKit

class CATextLayerPlayground: UITableViewController {
	override func viewDidLoad() {
		super.viewDidLoad()

		self.view.backgroundColor = .gray

		let textLayer = CATextLayer()
		textLayer.string = "Hello, CATextLayer!"
		textLayer.fontSize = 20
		textLayer.foregroundColor = UIColor.red.cgColor
		textLayer.alignmentMode = .right
		textLayer.contentsScale = UIScreen.main.scale
		textLayer.backgroundColor = UIColor.white.cgColor
		textLayer.frame = CGRect(x: 50, y: 100, width: 300, height: 50)

		view.layer.addSublayer(textLayer)
	}
}
