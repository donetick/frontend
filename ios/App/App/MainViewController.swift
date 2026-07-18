import Capacitor
import UIKit

/// Registers app-local Capacitor plugins; referenced from Main.storyboard.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
