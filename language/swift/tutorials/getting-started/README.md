## 创建一个不带 Storyboard 的项目

1. New Project
2. iOS App

    - Interface：Storyboard
    - Language：Swift

3. Delete Main.storyboard
4. Delete Project->Targets->Info->Application Scene Manifest->Scene Configuration->Application Session Role->item0->Storyboard Name
5. Delete Project->Targets->Build Settings->Info.plist Values->UIKit Main Storyboard File Base Name
6. Delete Info.plist->Application Scene Manifest->Scene Configuration->Application Session Role->item0->Storyboard Name
7. Add code in SceneDelegate

    ```swift
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Use this method to optionally configure and attach the UIWindow `window` to the provided UIWindowScene `scene`.
        // If using a storyboard, the `window` property will automatically be initialized and attached to the scene.
        // This delegate does not imply the connecting scene or session are new (see `application:configurationForConnectingSceneSession` instead).
        guard let windowScene = (scene as? UIWindowScene) else { return }
        window = UIWindow(frame: UIScreen.main.bounds)
        let viewController = ViewController()
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()
        window?.windowScene = windowScene
    }
    ```
