package com.donetick.app.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Switch;

import com.donetick.app.R;

/**
 * Placement / long-press configuration for the Today and Next 7 Days widgets.
 * One option for now: include tasks assigned to other circle members
 * (stored per appWidgetId so mixed setups work side by side).
 */
public class WidgetConfigActivity extends Activity {
    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        appWidgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);
        // Cancelled result until Save, so backing out never adds a half-configured widget.
        setResult(RESULT_CANCELED, resultIntent());
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        setContentView(R.layout.widget_config);

        Switch includeOthers = findViewById(R.id.config_include_others);
        includeOthers.setChecked(WidgetStore.includeOthers(this, appWidgetId));

        findViewById(R.id.config_save).setOnClickListener(v -> {
            WidgetStore.setIncludeOthers(this, appWidgetId, includeOthers.isChecked());
            WidgetUi.refreshAll(this);
            setResult(RESULT_OK, resultIntent());
            finish();
        });
    }

    private Intent resultIntent() {
        return new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
    }
}
