import Capacitor
import Foundation
import WidgetKit

/// JS bridge for the home-screen widgets (see src/service/WidgetService.js).
/// Persists the task snapshot + API config in the shared App Group so the
/// widget extension can read them, then asks WidgetKit to redraw.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.donetick.app"
    static let dataKey = "widget_tasks"
    static let configKey = "widget_config"

    @objc func update(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App Group \(Self.appGroup) unavailable")
            return
        }
        if let data = call.getString("data") {
            defaults.set(data, forKey: Self.dataKey)
        }
        if let config = call.getString("config") {
            defaults.set(config, forKey: Self.configKey)
        }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App Group \(Self.appGroup) unavailable")
            return
        }
        defaults.removeObject(forKey: Self.dataKey)
        defaults.removeObject(forKey: Self.configKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
