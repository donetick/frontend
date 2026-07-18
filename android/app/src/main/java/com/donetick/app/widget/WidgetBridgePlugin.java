package com.donetick.app.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * JS bridge for the home-screen widgets (see src/service/WidgetService.js).
 * Persists the task snapshot + API config and redraws the widgets.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        String config = call.getString("config");
        if (data != null) WidgetStore.saveData(getContext(), data);
        if (config != null) WidgetStore.saveConfig(getContext(), config);
        WidgetUi.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        WidgetStore.clear(getContext());
        WidgetUi.refreshAll(getContext());
        call.resolve();
    }
}
