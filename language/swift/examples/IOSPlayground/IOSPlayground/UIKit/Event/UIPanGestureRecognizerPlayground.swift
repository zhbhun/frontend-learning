import Fakery
import Foundation
import UIKit

class UIPanGestureRecognizerPlayground: UITableViewController {
	let demo = UIView(frame: CGRect(x: 100, y: 100, width: 100, height: 100))
    
    override func viewDidLoad() {
        super.viewDidLoad()
		
		self.view.backgroundColor = .gray

		demo.backgroundColor = .red
		demo.transform = .init(rotationAngle: 45)
		let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
		demo.addGestureRecognizer(pan)
        self.view.addSubview(demo)

    }

	@objc func handlePan(_ sender: UIPanGestureRecognizer) {
		let point = sender.location(in: demo)
		print(">> \(point)")
	}
}

